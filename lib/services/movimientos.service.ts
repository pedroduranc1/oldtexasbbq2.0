/**
 * Servicio de Movimientos de Inventario
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones de entrada, salida, ajuste y merma de ingredientes
 * Incluye: Registro de movimientos, historial, consumo promedio
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  MovimientoInventario,
  TipoMovimiento,
  FiltrosMovimientos,
  UnidadMedida,
  ProveedorMovimiento,
  Ingrediente,
  Receta,
} from '@/lib/types';
import { ingredientesService } from './ingredientes.service';

// ==========================================================================
// TIPOS AUXILIARES
// ==========================================================================

interface DatosEntrada {
  motivo: string;
  proveedor?: ProveedorMovimiento;
  documentoCompra?: string;
  costoUnitario?: number;
  notas?: string;
  usuarioId: string;
  usuarioNombre: string;
}

interface DatosSalida {
  motivo: string;
  referencia?: string;
  notas?: string;
  usuarioId: string;
  usuarioNombre: string;
}

interface DatosAjuste {
  motivo: string;
  notas?: string;
  usuarioId: string;
  usuarioNombre: string;
}

interface DatosMerma {
  motivo: string;
  notas?: string;
  usuarioId: string;
  usuarioNombre: string;
}

interface DatosVenta {
  pedidoId: string;
  usuarioId: string;
  usuarioNombre: string;
}

// ==========================================================================
// SERVICIO DE MOVIMIENTOS
// ==========================================================================

class MovimientosService {
  private collectionName = 'movimientos_inventario';

  // ==========================================================================
  // MÉTODOS DE REGISTRO DE MOVIMIENTOS
  // ==========================================================================

  /**
   * Registra una entrada de inventario (compra)
   */
  async registrarEntrada(
    ingredienteId: string,
    cantidad: number,
    datos: DatosEntrada
  ): Promise<string> {
    try {
      // Obtener ingrediente actual
      const ingrediente = await ingredientesService.getIngredienteById(ingredienteId);
      if (!ingrediente) {
        throw new Error('Ingrediente no encontrado');
      }

      const stockAnterior = ingrediente.stockActual;
      const stockNuevo = stockAnterior + cantidad;
      const costoTotal = datos.costoUnitario ? datos.costoUnitario * cantidad : undefined;

      // Usar transacción para garantizar consistencia
      const movimientoId = await runTransaction(db, async (transaction) => {
        // Crear documento del movimiento
        const movimientoRef = doc(collection(db, 'movimientos_inventario'));

        const movimiento: Omit<MovimientoInventario, 'id'> = {
          tipo: 'ENTRADA',
          ingredienteId,
          ingredienteNombre: ingrediente.nombre,
          cantidad,
          unidadMedida: ingrediente.unidadMedida,
          stockAnterior,
          stockNuevo,
          costoUnitario: datos.costoUnitario,
          costoTotal,
          motivo: datos.motivo,
          proveedor: datos.proveedor,
          documentoCompra: datos.documentoCompra,
          notas: datos.notas,
          usuarioId: datos.usuarioId,
          usuarioNombre: datos.usuarioNombre,
          fecha: new Date(),
        };

        transaction.set(movimientoRef, {
          ...movimiento,
          fecha: serverTimestamp(),
        });

        // Actualizar stock del ingrediente
        const ingredienteRef = doc(db, 'ingredientes', ingredienteId);
        transaction.update(ingredienteRef, {
          stockActual: stockNuevo,
          ultimaActualizacion: serverTimestamp(),
          ...(datos.costoUnitario && { precioPorUnidad: datos.costoUnitario }),
          ...(datos.proveedor && {
            ultimaCompra: {
              fecha: serverTimestamp(),
              cantidad,
              precioTotal: costoTotal || 0,
            },
          }),
        });

        return movimientoRef.id;
      });

      console.log(`✅ Entrada registrada: ${ingrediente.nombre} +${cantidad} ${ingrediente.unidadMedida}`);
      return movimientoId;
    } catch (error) {
      console.error('❌ Error al registrar entrada:', error);
      throw new Error('Error al registrar entrada de inventario');
    }
  }

  /**
   * Registra una salida de inventario (consumo manual)
   */
  async registrarSalida(
    ingredienteId: string,
    cantidad: number,
    datos: DatosSalida
  ): Promise<string> {
    try {
      const ingrediente = await ingredientesService.getIngredienteById(ingredienteId);
      if (!ingrediente) {
        throw new Error('Ingrediente no encontrado');
      }

      const stockAnterior = ingrediente.stockActual;
      const stockNuevo = Math.max(0, stockAnterior - cantidad);

      if (stockAnterior < cantidad) {
        console.warn(`⚠️ Stock insuficiente para ${ingrediente.nombre}. Disponible: ${stockAnterior}, Solicitado: ${cantidad}`);
      }

      const movimientoId = await runTransaction(db, async (transaction) => {
        const movimientoRef = doc(collection(db, 'movimientos_inventario'));

        const movimiento: Omit<MovimientoInventario, 'id'> = {
          tipo: 'SALIDA',
          ingredienteId,
          ingredienteNombre: ingrediente.nombre,
          cantidad,
          unidadMedida: ingrediente.unidadMedida,
          stockAnterior,
          stockNuevo,
          motivo: datos.motivo,
          referencia: datos.referencia,
          notas: datos.notas,
          usuarioId: datos.usuarioId,
          usuarioNombre: datos.usuarioNombre,
          fecha: new Date(),
        };

        transaction.set(movimientoRef, {
          ...movimiento,
          fecha: serverTimestamp(),
        });

        const ingredienteRef = doc(db, 'ingredientes', ingredienteId);
        transaction.update(ingredienteRef, {
          stockActual: stockNuevo,
          ultimaActualizacion: serverTimestamp(),
        });

        return movimientoRef.id;
      });

      console.log(`✅ Salida registrada: ${ingrediente.nombre} -${cantidad} ${ingrediente.unidadMedida}`);
      return movimientoId;
    } catch (error) {
      console.error('❌ Error al registrar salida:', error);
      throw new Error('Error al registrar salida de inventario');
    }
  }

  /**
   * Registra un ajuste manual de inventario
   */
  async registrarAjuste(
    ingredienteId: string,
    nuevoStock: number,
    datos: DatosAjuste
  ): Promise<string> {
    try {
      const ingrediente = await ingredientesService.getIngredienteById(ingredienteId);
      if (!ingrediente) {
        throw new Error('Ingrediente no encontrado');
      }

      const stockAnterior = ingrediente.stockActual;
      const diferencia = nuevoStock - stockAnterior;

      const movimientoId = await runTransaction(db, async (transaction) => {
        const movimientoRef = doc(collection(db, 'movimientos_inventario'));

        const movimiento: Omit<MovimientoInventario, 'id'> = {
          tipo: 'AJUSTE',
          ingredienteId,
          ingredienteNombre: ingrediente.nombre,
          cantidad: Math.abs(diferencia),
          unidadMedida: ingrediente.unidadMedida,
          stockAnterior,
          stockNuevo: nuevoStock,
          motivo: datos.motivo,
          notas: datos.notas ? `${datos.notas} | Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}` : `Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}`,
          usuarioId: datos.usuarioId,
          usuarioNombre: datos.usuarioNombre,
          fecha: new Date(),
        };

        transaction.set(movimientoRef, {
          ...movimiento,
          fecha: serverTimestamp(),
        });

        const ingredienteRef = doc(db, 'ingredientes', ingredienteId);
        transaction.update(ingredienteRef, {
          stockActual: nuevoStock,
          ultimaActualizacion: serverTimestamp(),
        });

        return movimientoRef.id;
      });

      console.log(`✅ Ajuste registrado: ${ingrediente.nombre} ${stockAnterior} → ${nuevoStock}`);
      return movimientoId;
    } catch (error) {
      console.error('❌ Error al registrar ajuste:', error);
      throw new Error('Error al registrar ajuste de inventario');
    }
  }

  /**
   * Registra una merma de inventario
   */
  async registrarMerma(
    ingredienteId: string,
    cantidad: number,
    datos: DatosMerma
  ): Promise<string> {
    try {
      const ingrediente = await ingredientesService.getIngredienteById(ingredienteId);
      if (!ingrediente) {
        throw new Error('Ingrediente no encontrado');
      }

      const stockAnterior = ingrediente.stockActual;
      const stockNuevo = Math.max(0, stockAnterior - cantidad);
      const valorMerma = cantidad * ingrediente.precioPorUnidad;

      const movimientoId = await runTransaction(db, async (transaction) => {
        const movimientoRef = doc(collection(db, 'movimientos_inventario'));

        const movimiento: Omit<MovimientoInventario, 'id'> = {
          tipo: 'MERMA',
          ingredienteId,
          ingredienteNombre: ingrediente.nombre,
          cantidad,
          unidadMedida: ingrediente.unidadMedida,
          stockAnterior,
          stockNuevo,
          costoUnitario: ingrediente.precioPorUnidad,
          costoTotal: valorMerma,
          motivo: datos.motivo,
          notas: datos.notas,
          usuarioId: datos.usuarioId,
          usuarioNombre: datos.usuarioNombre,
          fecha: new Date(),
        };

        transaction.set(movimientoRef, {
          ...movimiento,
          fecha: serverTimestamp(),
        });

        const ingredienteRef = doc(db, 'ingredientes', ingredienteId);
        transaction.update(ingredienteRef, {
          stockActual: stockNuevo,
          ultimaActualizacion: serverTimestamp(),
        });

        return movimientoRef.id;
      });

      console.log(`✅ Merma registrada: ${ingrediente.nombre} -${cantidad} ${ingrediente.unidadMedida} (Valor: $${valorMerma.toFixed(2)})`);
      return movimientoId;
    } catch (error) {
      console.error('❌ Error al registrar merma:', error);
      throw new Error('Error al registrar merma de inventario');
    }
  }

  /**
   * Registra movimientos por venta (descontar ingredientes de una receta)
   */
  async registrarVenta(
    pedidoId: string,
    receta: Receta,
    datos: DatosVenta
  ): Promise<string[]> {
    try {
      const movimientosIds: string[] = [];

      for (const ingredienteReceta of receta.ingredientes) {
        const ingrediente = await ingredientesService.getIngredienteById(ingredienteReceta.ingredienteId);
        if (!ingrediente) {
          console.warn(`⚠️ Ingrediente no encontrado: ${ingredienteReceta.ingredienteNombre}`);
          continue;
        }

        const stockAnterior = ingrediente.stockActual;
        const stockNuevo = Math.max(0, stockAnterior - ingredienteReceta.cantidad);

        const movimientoId = await runTransaction(db, async (transaction) => {
          const movimientoRef = doc(collection(db, 'movimientos_inventario'));

          const movimiento: Omit<MovimientoInventario, 'id'> = {
            tipo: 'VENTA',
            ingredienteId: ingredienteReceta.ingredienteId,
            ingredienteNombre: ingredienteReceta.ingredienteNombre,
            cantidad: ingredienteReceta.cantidad,
            unidadMedida: ingredienteReceta.unidadMedida,
            stockAnterior,
            stockNuevo,
            costoUnitario: ingredienteReceta.costoUnitario,
            costoTotal: ingredienteReceta.costoTotal,
            motivo: `Venta - Pedido #${pedidoId}`,
            referencia: pedidoId,
            usuarioId: datos.usuarioId,
            usuarioNombre: datos.usuarioNombre,
            fecha: new Date(),
          };

          transaction.set(movimientoRef, {
            ...movimiento,
            fecha: serverTimestamp(),
          });

          const ingredienteRef = doc(db, 'ingredientes', ingredienteReceta.ingredienteId);
          transaction.update(ingredienteRef, {
            stockActual: stockNuevo,
            ultimaActualizacion: serverTimestamp(),
          });

          return movimientoRef.id;
        });

        movimientosIds.push(movimientoId);
      }

      console.log(`✅ Venta registrada: ${movimientosIds.length} ingredientes descontados para pedido #${pedidoId}`);
      return movimientosIds;
    } catch (error) {
      console.error('❌ Error al registrar venta:', error);
      throw new Error('Error al registrar venta en inventario');
    }
  }

  // ==========================================================================
  // MÉTODOS DE CONSULTA
  // ==========================================================================

  /**
   * Obtiene movimientos con filtros opcionales
   */
  async getMovimientos(filtros?: FiltrosMovimientos): Promise<MovimientoInventario[]> {
    try {
      let q = query(
        collection(db, 'movimientos_inventario'),
        orderBy('fecha', 'desc')
      );

      // Aplicar filtros
      if (filtros?.tipo) {
        q = query(q, where('tipo', '==', filtros.tipo));
      }

      if (filtros?.ingredienteId) {
        q = query(q, where('ingredienteId', '==', filtros.ingredienteId));
      }

      if (filtros?.usuarioId) {
        q = query(q, where('usuarioId', '==', filtros.usuarioId));
      }

      const querySnapshot = await getDocs(q);
      let movimientos = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate(),
      })) as MovimientoInventario[];

      // Filtros de fecha (post-query porque Firestore tiene limitaciones)
      if (filtros?.fechaInicio) {
        movimientos = movimientos.filter((m) => m.fecha >= filtros.fechaInicio!);
      }

      if (filtros?.fechaFin) {
        movimientos = movimientos.filter((m) => m.fecha <= filtros.fechaFin!);
      }

      return movimientos;
    } catch (error) {
      console.error('❌ Error al obtener movimientos:', error);
      throw new Error('Error al obtener movimientos');
    }
  }

  /**
   * Obtiene movimientos de un ingrediente específico
   */
  async getMovimientosByIngrediente(
    ingredienteId: string,
    rango?: { inicio: Date; fin: Date }
  ): Promise<MovimientoInventario[]> {
    const filtros: FiltrosMovimientos = {
      ingredienteId,
      fechaInicio: rango?.inicio,
      fechaFin: rango?.fin,
    };

    return this.getMovimientos(filtros);
  }

  /**
   * Obtiene movimientos por rango de fechas
   */
  async getMovimientosByFecha(
    inicio: Date,
    fin: Date
  ): Promise<MovimientoInventario[]> {
    return this.getMovimientos({ fechaInicio: inicio, fechaFin: fin });
  }

  /**
   * Obtiene el último movimiento de un ingrediente
   */
  async getUltimoMovimiento(ingredienteId: string): Promise<MovimientoInventario | null> {
    try {
      const q = query(
        collection(db, 'movimientos_inventario'),
        where('ingredienteId', '==', ingredienteId),
        orderBy('fecha', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate(),
      } as MovimientoInventario;
    } catch (error) {
      console.error('❌ Error al obtener último movimiento:', error);
      throw new Error('Error al obtener último movimiento');
    }
  }

  // ==========================================================================
  // MÉTODOS DE CÁLCULOS Y ANÁLISIS
  // ==========================================================================

  /**
   * Calcula el consumo promedio de un ingrediente en un período de días
   */
  async calcularConsumoPromedio(
    ingredienteId: string,
    dias: number = 30
  ): Promise<{
    consumoTotal: number;
    consumoPromedioDiario: number;
    unidadMedida: UnidadMedida;
    movimientosAnalizados: number;
  }> {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);

      const movimientos = await this.getMovimientosByIngrediente(ingredienteId, {
        inicio: fechaInicio,
        fin: new Date(),
      });

      // Filtrar solo salidas y ventas (consumo)
      const movimientosConsumo = movimientos.filter(
        (m) => m.tipo === 'SALIDA' || m.tipo === 'VENTA' || m.tipo === 'MERMA'
      );

      const consumoTotal = movimientosConsumo.reduce((sum, m) => sum + m.cantidad, 0);
      const consumoPromedioDiario = consumoTotal / dias;

      // Obtener unidad de medida del ingrediente
      const ingrediente = await ingredientesService.getIngredienteById(ingredienteId);
      const unidadMedida = ingrediente?.unidadMedida || 'PIEZA';

      return {
        consumoTotal,
        consumoPromedioDiario,
        unidadMedida,
        movimientosAnalizados: movimientosConsumo.length,
      };
    } catch (error) {
      console.error('❌ Error al calcular consumo promedio:', error);
      throw new Error('Error al calcular consumo promedio');
    }
  }

  /**
   * Proyecta cuántos días de stock quedan para un ingrediente
   */
  async proyectarDiasStock(ingredienteId: string): Promise<{
    diasRestantes: number;
    stockActual: number;
    consumoPromedioDiario: number;
  } | null> {
    try {
      const ingrediente = await ingredientesService.getIngredienteById(ingredienteId);
      if (!ingrediente) {
        return null;
      }

      const { consumoPromedioDiario } = await this.calcularConsumoPromedio(ingredienteId, 30);

      const diasRestantes = consumoPromedioDiario > 0
        ? Math.floor(ingrediente.stockActual / consumoPromedioDiario)
        : Infinity;

      return {
        diasRestantes: diasRestantes === Infinity ? 999 : diasRestantes,
        stockActual: ingrediente.stockActual,
        consumoPromedioDiario,
      };
    } catch (error) {
      console.error('❌ Error al proyectar días de stock:', error);
      throw new Error('Error al proyectar días de stock');
    }
  }

  /**
   * Obtiene resumen de movimientos por tipo en un período
   */
  async getResumenMovimientos(
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<{
    entradas: { cantidad: number; valor: number };
    salidas: { cantidad: number; valor: number };
    ajustes: { cantidad: number; diferenciaNeta: number };
    mermas: { cantidad: number; valor: number };
    ventas: { cantidad: number; valor: number };
  }> {
    try {
      const movimientos = await this.getMovimientosByFecha(fechaInicio, fechaFin);

      const resumen = {
        entradas: { cantidad: 0, valor: 0 },
        salidas: { cantidad: 0, valor: 0 },
        ajustes: { cantidad: 0, diferenciaNeta: 0 },
        mermas: { cantidad: 0, valor: 0 },
        ventas: { cantidad: 0, valor: 0 },
      };

      for (const mov of movimientos) {
        switch (mov.tipo) {
          case 'ENTRADA':
            resumen.entradas.cantidad++;
            resumen.entradas.valor += mov.costoTotal || 0;
            break;
          case 'SALIDA':
            resumen.salidas.cantidad++;
            resumen.salidas.valor += mov.costoTotal || 0;
            break;
          case 'AJUSTE':
            resumen.ajustes.cantidad++;
            resumen.ajustes.diferenciaNeta += mov.stockNuevo - mov.stockAnterior;
            break;
          case 'MERMA':
            resumen.mermas.cantidad++;
            resumen.mermas.valor += mov.costoTotal || 0;
            break;
          case 'VENTA':
            resumen.ventas.cantidad++;
            resumen.ventas.valor += mov.costoTotal || 0;
            break;
        }
      }

      return resumen;
    } catch (error) {
      console.error('❌ Error al obtener resumen de movimientos:', error);
      throw new Error('Error al obtener resumen de movimientos');
    }
  }

  // ==========================================================================
  // LISTENERS EN TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha cambios en tiempo real en los movimientos
   */
  onMovimientosChange(
    callback: (movimientos: MovimientoInventario[]) => void,
    filtros?: { ingredienteId?: string; limite?: number }
  ): () => void {
    let q = query(
      collection(db, 'movimientos_inventario'),
      orderBy('fecha', 'desc')
    );

    if (filtros?.ingredienteId) {
      q = query(q, where('ingredienteId', '==', filtros.ingredienteId));
    }

    if (filtros?.limite) {
      q = query(q, limit(filtros.limite));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const movimientos = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fecha: doc.data().fecha?.toDate(),
        })) as MovimientoInventario[];

        callback(movimientos);
      },
      (error) => {
        console.error('❌ Error en listener de movimientos:', error);
      }
    );

    return unsubscribe;
  }

  // ==========================================================================
  // MÉTODOS DE EXPORTACIÓN
  // ==========================================================================

  /**
   * Exporta movimientos a formato CSV
   */
  async exportToCSV(filtros?: FiltrosMovimientos): Promise<string> {
    const movimientos = await this.getMovimientos(filtros);

    const headers = [
      'ID',
      'Fecha',
      'Tipo',
      'Ingrediente',
      'Cantidad',
      'Unidad',
      'Stock Anterior',
      'Stock Nuevo',
      'Costo Unitario',
      'Costo Total',
      'Motivo',
      'Usuario',
      'Referencia',
    ].join(',');

    const rows = movimientos.map((m) =>
      [
        m.id,
        m.fecha.toISOString(),
        m.tipo,
        `"${m.ingredienteNombre}"`,
        m.cantidad,
        m.unidadMedida,
        m.stockAnterior,
        m.stockNuevo,
        m.costoUnitario || '',
        m.costoTotal || '',
        `"${m.motivo}"`,
        `"${m.usuarioNombre}"`,
        m.referencia || '',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }
}

// Exportar instancia singleton
export const movimientosService = new MovimientosService();
export default movimientosService;
