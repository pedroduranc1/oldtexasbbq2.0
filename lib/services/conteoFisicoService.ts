/**
 * Servicio de Conteo Físico
 * Old Texas BBQ - CRM
 *
 * Gestiona el proceso completo de inventario físico:
 * iniciar conteo, registrar cantidades, finalizar y aplicar ajustes al stock
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ConteoFisico,
  ConteoItem,
  TipoConteo,
  EstadoConteo,
  Ingrediente,
} from '@/lib/types';

export interface FiltrosConteo {
  estado?: EstadoConteo;
  tipo?: TipoConteo;
  fechaInicio?: Date;
  fechaFin?: Date;
  realizadoPor?: string;
}

class ConteoFisicoService {

  // ==========================================================================
  // CICLO DE VIDA DEL CONTEO
  // ==========================================================================

  /**
   * Inicia un nuevo inventario físico.
   * Carga todos los ingredientes activos con su stock actual del sistema.
   */
  async iniciarConteo(
    tipo: TipoConteo,
    realizadoPor: string
  ): Promise<string> {
    try {
      // Obtener todos los ingredientes activos
      const ingredientesSnap = await getDocs(
        query(
          collection(db, 'ingredientes'),
          where('activo', '==', true),
          orderBy('nombre', 'asc')
        )
      );

      const ingredientes = ingredientesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Ingrediente[];

      // Crear los items del conteo con stock del sistema
      const conteos: (ConteoItem & { precioPorUnidad: number })[] = ingredientes.map((ing) => ({
        ingredienteId: ing.id,
        ingredienteNombre: ing.nombre,
        stockSistema: ing.stockActual,
        stockFisico: 0,
        diferencia: 0,
        valorDiferencia: 0,
        precioPorUnidad: ing.precioPorUnidad,
        ajustado: false,
      }));

      const conteoData = {
        tipo,
        estado: 'EN_PROCESO' as EstadoConteo,
        conteos,
        totalDiferencias: 0,
        valorTotalDiferencias: 0,
        realizadoPor,
        fechaInicio: serverTimestamp(),
        fecha: serverTimestamp(),
      };

      const conteoRef = await addDoc(collection(db, 'conteosFisicos'), conteoData);

      console.log('✅ Conteo físico iniciado:', conteoRef.id);
      return conteoRef.id;
    } catch (error) {
      console.error('❌ Error al iniciar conteo:', error);
      throw new Error('Error al iniciar conteo físico');
    }
  }

  /**
   * Registra el conteo físico de un ingrediente específico.
   * Calcula diferencia y valor de diferencia automáticamente.
   */
  async registrarConteo(
    conteoId: string,
    ingredienteId: string,
    stockFisico: number
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const conteoRef = doc(db, 'conteosFisicos', conteoId);
        const conteoSnap = await transaction.get(conteoRef);

        if (!conteoSnap.exists()) {
          throw new Error('Conteo no encontrado');
        }

        const conteoData = conteoSnap.data();
        if (conteoData.estado !== 'EN_PROCESO') {
          throw new Error('Solo se puede registrar en un conteo en proceso');
        }

        // Actualizar el item correspondiente
        const conteosActualizados = conteoData.conteos.map(
          (item: ConteoItem & { precioPorUnidad?: number }) => {
            if (item.ingredienteId !== ingredienteId) return item;

            const diferencia = stockFisico - item.stockSistema;
            const precioPorUnidad = item.precioPorUnidad ?? 0;
            const valorDiferencia = diferencia * precioPorUnidad;

            return {
              ...item,
              stockFisico,
              diferencia,
              valorDiferencia,
            };
          }
        );

        transaction.update(conteoRef, {
          conteos: conteosActualizados,
        });
      });

      console.log(
        `✅ Conteo registrado: ingrediente ${ingredienteId} en conteo ${conteoId}`
      );
    } catch (error) {
      console.error('❌ Error al registrar conteo:', error);
      throw new Error('Error al registrar conteo');
    }
  }

  /**
   * Finaliza el conteo, calcula totales y cambia estado a COMPLETADO.
   */
  async finalizarConteo(conteoId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const conteoRef = doc(db, 'conteosFisicos', conteoId);
        const conteoSnap = await transaction.get(conteoRef);

        if (!conteoSnap.exists()) {
          throw new Error('Conteo no encontrado');
        }

        const conteoData = conteoSnap.data();
        if (conteoData.estado !== 'EN_PROCESO') {
          throw new Error('El conteo ya fue finalizado');
        }

        // Calcular totales
        const conteos: (ConteoItem & { precioPorUnidad?: number })[] =
          conteoData.conteos;
        const totalDiferencias = conteos.filter(
          (item) => item.diferencia !== 0
        ).length;
        const valorTotalDiferencias = conteos.reduce(
          (acc, item) => acc + Math.abs(item.valorDiferencia),
          0
        );

        transaction.update(conteoRef, {
          estado: 'COMPLETADO' as EstadoConteo,
          totalDiferencias,
          valorTotalDiferencias,
          fechaFin: serverTimestamp(),
        });
      });

      console.log('✅ Conteo finalizado:', conteoId);
    } catch (error) {
      console.error('❌ Error al finalizar conteo:', error);
      throw new Error('Error al finalizar conteo');
    }
  }

  /**
   * Aplica las diferencias del conteo al stock real de los ingredientes.
   * Crea movimientos de tipo AJUSTE para cada diferencia.
   * Cambia el estado del conteo a REVISADO.
   */
  async aplicarAjustes(conteoId: string, revisadoPor: string): Promise<void> {
    try {
      // Leer el conteo primero (fuera de batch para evitar conflictos)
      const conteoRef = doc(db, 'conteosFisicos', conteoId);
      const conteoSnap = await getDoc(conteoRef);

      if (!conteoSnap.exists()) {
        throw new Error('Conteo no encontrado');
      }

      const conteoData = conteoSnap.data();
      if (conteoData.estado !== 'COMPLETADO') {
        throw new Error('El conteo debe estar completado para aplicar ajustes');
      }

      const conteos: (ConteoItem & { precioPorUnidad?: number })[] =
        conteoData.conteos;
      const ahora = serverTimestamp();

      const batch = writeBatch(db);

      // Procesar cada item con diferencia que no haya sido ajustado
      for (const item of conteos) {
        if (item.diferencia !== 0 && !item.ajustado) {
          // Actualizar stock del ingrediente
          const ingredienteRef = doc(db, 'ingredientes', item.ingredienteId);
          batch.update(ingredienteRef, {
            stockActual: item.stockFisico,
            ultimaActualizacion: ahora,
          });

          // Crear registro de movimiento AJUSTE
          const movimientoRef = doc(collection(db, 'movimientos'));
          batch.set(movimientoRef, {
            tipo: 'AJUSTE',
            ingredienteId: item.ingredienteId,
            ingredienteNombre: item.ingredienteNombre,
            cantidad: Math.abs(item.diferencia),
            unidadMedida: '',
            stockAnterior: item.stockSistema,
            stockNuevo: item.stockFisico,
            motivo: `Ajuste por conteo físico`,
            referencia: conteoId,
            usuarioId: revisadoPor,
            usuarioNombre: revisadoPor,
            fecha: ahora,
            notas: `Diferencia: ${item.diferencia > 0 ? '+' : ''}${item.diferencia}`,
          });
        }
      }

      // Marcar todos los items con diferencia como ajustados
      const conteosActualizados = conteos.map((item) => ({
        ...item,
        ajustado: item.diferencia !== 0 ? true : item.ajustado,
      }));

      // Actualizar el conteo a REVISADO
      batch.update(conteoRef, {
        estado: 'REVISADO' as EstadoConteo,
        revisadoPor,
        conteos: conteosActualizados,
      });

      await batch.commit();

      console.log('✅ Ajustes aplicados al conteo:', conteoId);
    } catch (error) {
      console.error('❌ Error al aplicar ajustes:', error);
      throw new Error('Error al aplicar ajustes de conteo');
    }
  }

  // ==========================================================================
  // MÉTODOS DE CONSULTA
  // ==========================================================================

  /**
   * Obtiene un conteo físico por ID
   */
  async getConteoById(id: string): Promise<ConteoFisico | null> {
    try {
      const conteoRef = doc(db, 'conteosFisicos', id);
      const conteoSnap = await getDoc(conteoRef);

      if (!conteoSnap.exists()) {
        return null;
      }

      return {
        id: conteoSnap.id,
        ...conteoSnap.data(),
        fecha: conteoSnap.data().fecha?.toDate(),
        fechaInicio: conteoSnap.data().fechaInicio?.toDate(),
        fechaFin: conteoSnap.data().fechaFin?.toDate(),
      } as ConteoFisico;
    } catch (error) {
      console.error('❌ Error al obtener conteo:', error);
      throw new Error('Error al obtener conteo');
    }
  }

  /**
   * Obtiene historial de conteos físicos con filtros opcionales
   */
  async getConteos(filtros?: FiltrosConteo): Promise<ConteoFisico[]> {
    try {
      let q = query(collection(db, 'conteosFisicos'));

      if (filtros?.estado) {
        q = query(q, where('estado', '==', filtros.estado));
      }

      if (filtros?.tipo) {
        q = query(q, where('tipo', '==', filtros.tipo));
      }

      if (filtros?.realizadoPor) {
        q = query(q, where('realizadoPor', '==', filtros.realizadoPor));
      }

      q = query(q, orderBy('fechaInicio', 'desc'));

      const querySnapshot = await getDocs(q);
      let conteos = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate(),
        fechaInicio: doc.data().fechaInicio?.toDate(),
        fechaFin: doc.data().fechaFin?.toDate(),
      })) as ConteoFisico[];

      // Filtros de fecha post-query
      if (filtros?.fechaInicio) {
        conteos = conteos.filter(
          (c) => c.fechaInicio >= filtros.fechaInicio!
        );
      }
      if (filtros?.fechaFin) {
        conteos = conteos.filter((c) => c.fechaInicio <= filtros.fechaFin!);
      }

      return conteos;
    } catch (error) {
      console.error('❌ Error al obtener conteos:', error);
      throw new Error('Error al obtener historial de conteos');
    }
  }
}

// Exportar instancia singleton
export const conteoFisicoService = new ConteoFisicoService();
export default conteoFisicoService;
