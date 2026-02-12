/**
 * Servicio de Órdenes de Compra
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones CRUD para órdenes de compra de inventario
 * Incluye: Creación, aprobación, recepción, cancelación y sugerencias automáticas
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
  OrdenCompra,
  EstadoOrdenCompra,
  ItemOrdenCompra,
  Ingrediente,
  UnidadMedida,
  CategoriaIngrediente,
  FiltrosOrdenesCompra,
} from '@/lib/types';
import { ingredientesService } from './ingredientes.service';
import { movimientosService } from './movimientos.service';

// ==========================================================================
// TIPOS AUXILIARES
// ==========================================================================

interface DatosNuevaOrden {
  proveedorId: string;
  proveedorNombre: string;
  items: Array<{
    ingredienteId: string;
    ingredienteNombre: string;
    cantidadSolicitada: number;
    unidadMedida: UnidadMedida;
    precioUnitario: number;
  }>;
  fechaEntregaEstimada?: Date;
  notas?: string;
  solicitadoPor: string;
}

interface ItemRecibido {
  ingredienteId: string;
  cantidadRecibida: number;
}

interface OrdenSugerida {
  proveedorId: string;
  proveedorNombre: string;
  items: Array<{
    ingredienteId: string;
    ingredienteNombre: string;
    stockActual: number;
    stockMinimo: number;
    stockMaximo: number;
    cantidadSugerida: number;
    unidadMedida: UnidadMedida;
    precioPorUnidad: number;
  }>;
  totalEstimado: number;
}

// ==========================================================================
// SERVICIO DE ÓRDENES DE COMPRA
// ==========================================================================

class OrdenesCompraService {
  private collectionName = 'ordenes_compra';

  // ==========================================================================
  // MÉTODOS CRUD BÁSICOS
  // ==========================================================================

  /**
   * Genera el siguiente número de orden consecutivo
   */
  private async generarNumeroOrden(): Promise<number> {
    try {
      const q = query(
        collection(db, 'ordenes_compra'),
        orderBy('numeroOrden', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return 1;
      }

      const ultimaOrden = querySnapshot.docs[0].data();
      return (ultimaOrden.numeroOrden || 0) + 1;
    } catch (error) {
      console.error('❌ Error al generar número de orden:', error);
      // Si hay error, usar timestamp como fallback
      return Date.now();
    }
  }

  /**
   * Crea una nueva orden de compra
   */
  async createOrdenCompra(datos: DatosNuevaOrden): Promise<string> {
    try {
      const numeroOrden = await this.generarNumeroOrden();

      // Calcular totales
      const items: ItemOrdenCompra[] = datos.items.map((item) => ({
        ...item,
        subtotal: item.cantidadSolicitada * item.precioUnitario,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const iva = subtotal * 0.16; // 16% IVA México
      const total = subtotal + iva;

      const orden: Omit<OrdenCompra, 'id'> = {
        numeroOrden,
        proveedorId: datos.proveedorId,
        proveedorNombre: datos.proveedorNombre,
        items,
        subtotal,
        iva,
        total,
        estado: 'PENDIENTE',
        fechaSolicitud: new Date(),
        fechaEntregaEstimada: datos.fechaEntregaEstimada,
        solicitadoPor: datos.solicitadoPor,
        notas: datos.notas,
      };

      const ordenRef = await addDoc(collection(db, 'ordenes_compra'), {
        ...orden,
        fechaSolicitud: serverTimestamp(),
        fechaEntregaEstimada: datos.fechaEntregaEstimada
          ? Timestamp.fromDate(datos.fechaEntregaEstimada)
          : null,
      });

      console.log(`✅ Orden de compra #${numeroOrden} creada:`, ordenRef.id);
      return ordenRef.id;
    } catch (error) {
      console.error('❌ Error al crear orden de compra:', error);
      throw new Error('Error al crear orden de compra');
    }
  }

  /**
   * Actualiza una orden de compra existente
   */
  async updateOrdenCompra(
    id: string,
    data: Partial<Omit<OrdenCompra, 'id' | 'numeroOrden' | 'fechaSolicitud'>>
  ): Promise<void> {
    try {
      const orden = await this.getOrdenById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      // Solo se puede editar si está en estado PENDIENTE
      if (orden.estado !== 'PENDIENTE') {
        throw new Error(`No se puede editar una orden en estado ${orden.estado}`);
      }

      // Si se actualizan los items, recalcular totales
      let updateData: Record<string, unknown> = { ...data };

      if (data.items) {
        const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
        const iva = subtotal * 0.16;
        const total = subtotal + iva;

        updateData = {
          ...updateData,
          subtotal,
          iva,
          total,
        };
      }

      const ordenRef = doc(db, 'ordenes_compra', id);
      await updateDoc(ordenRef, updateData);

      console.log('✅ Orden de compra actualizada:', id);
    } catch (error) {
      console.error('❌ Error al actualizar orden de compra:', error);
      throw new Error('Error al actualizar orden de compra');
    }
  }

  /**
   * Obtiene una orden de compra por ID
   */
  async getOrdenById(id: string): Promise<OrdenCompra | null> {
    try {
      const ordenRef = doc(db, 'ordenes_compra', id);
      const ordenSnap = await getDoc(ordenRef);

      if (!ordenSnap.exists()) {
        return null;
      }

      const data = ordenSnap.data();
      return {
        id: ordenSnap.id,
        ...data,
        fechaSolicitud: data.fechaSolicitud?.toDate(),
        fechaEntregaEstimada: data.fechaEntregaEstimada?.toDate(),
        fechaRecepcion: data.fechaRecepcion?.toDate(),
      } as OrdenCompra;
    } catch (error) {
      console.error('❌ Error al obtener orden:', error);
      throw new Error('Error al obtener orden de compra');
    }
  }

  /**
   * Obtiene órdenes de compra con filtros opcionales
   */
  async getOrdenes(filtros?: FiltrosOrdenesCompra): Promise<OrdenCompra[]> {
    try {
      let q = query(
        collection(db, 'ordenes_compra'),
        orderBy('fechaSolicitud', 'desc')
      );

      if (filtros?.estado) {
        q = query(q, where('estado', '==', filtros.estado));
      }

      if (filtros?.proveedorId) {
        q = query(q, where('proveedorId', '==', filtros.proveedorId));
      }

      if (filtros?.solicitadoPor) {
        q = query(q, where('solicitadoPor', '==', filtros.solicitadoPor));
      }

      const querySnapshot = await getDocs(q);
      let ordenes = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaSolicitud: data.fechaSolicitud?.toDate(),
          fechaEntregaEstimada: data.fechaEntregaEstimada?.toDate(),
          fechaRecepcion: data.fechaRecepcion?.toDate(),
        } as OrdenCompra;
      });

      // Filtros de fecha (post-query)
      if (filtros?.fechaInicio) {
        ordenes = ordenes.filter((o) => o.fechaSolicitud >= filtros.fechaInicio!);
      }

      if (filtros?.fechaFin) {
        ordenes = ordenes.filter((o) => o.fechaSolicitud <= filtros.fechaFin!);
      }

      return ordenes;
    } catch (error) {
      console.error('❌ Error al obtener órdenes:', error);
      throw new Error('Error al obtener órdenes de compra');
    }
  }

  // ==========================================================================
  // MÉTODOS DE FLUJO DE TRABAJO
  // ==========================================================================

  /**
   * Aprueba una orden de compra
   */
  async aprobarOrden(id: string, aprobadoPor: string): Promise<void> {
    try {
      const orden = await this.getOrdenById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      if (orden.estado !== 'PENDIENTE') {
        throw new Error(`No se puede aprobar una orden en estado ${orden.estado}`);
      }

      const ordenRef = doc(db, 'ordenes_compra', id);
      await updateDoc(ordenRef, {
        estado: 'APROBADA',
        aprobadoPor,
      });

      console.log(`✅ Orden #${orden.numeroOrden} aprobada por ${aprobadoPor}`);
    } catch (error) {
      console.error('❌ Error al aprobar orden:', error);
      throw new Error('Error al aprobar orden de compra');
    }
  }

  /**
   * Marca una orden como enviada (al proveedor)
   */
  async marcarComoEnviada(id: string): Promise<void> {
    try {
      const orden = await this.getOrdenById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      if (orden.estado !== 'APROBADA') {
        throw new Error('Solo se pueden enviar órdenes aprobadas');
      }

      const ordenRef = doc(db, 'ordenes_compra', id);
      await updateDoc(ordenRef, {
        estado: 'ENVIADA',
      });

      console.log(`✅ Orden #${orden.numeroOrden} marcada como enviada`);
    } catch (error) {
      console.error('❌ Error al marcar orden como enviada:', error);
      throw new Error('Error al marcar orden como enviada');
    }
  }

  /**
   * Recibe una orden de compra y actualiza el inventario
   */
  async recibirOrden(
    id: string,
    itemsRecibidos: ItemRecibido[],
    recibidoPor: string,
    documentoFactura?: string
  ): Promise<void> {
    try {
      const orden = await this.getOrdenById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      if (orden.estado !== 'APROBADA' && orden.estado !== 'ENVIADA') {
        throw new Error(`No se puede recibir una orden en estado ${orden.estado}`);
      }

      // Actualizar items con cantidades recibidas
      const itemsActualizados = orden.items.map((item) => {
        const recibido = itemsRecibidos.find((r) => r.ingredienteId === item.ingredienteId);
        return {
          ...item,
          cantidadRecibida: recibido?.cantidadRecibida ?? item.cantidadSolicitada,
        };
      });

      await runTransaction(db, async (transaction) => {
        // Actualizar la orden
        const ordenRef = doc(db, 'ordenes_compra', id);
        transaction.update(ordenRef, {
          estado: 'RECIBIDA',
          items: itemsActualizados,
          fechaRecepcion: serverTimestamp(),
          recibidoPor,
          documentoFactura,
        });

        // Registrar entradas en inventario para cada item
        for (const item of itemsActualizados) {
          const cantidadRecibida = item.cantidadRecibida || item.cantidadSolicitada;

          if (cantidadRecibida > 0) {
            // Registrar entrada en inventario
            await movimientosService.registrarEntrada(
              item.ingredienteId,
              cantidadRecibida,
              {
                motivo: `Recepción de Orden de Compra #${orden.numeroOrden}`,
                proveedor: {
                  id: orden.proveedorId,
                  nombre: orden.proveedorNombre,
                },
                documentoCompra: documentoFactura,
                costoUnitario: item.precioUnitario,
                notas: `OC #${orden.numeroOrden}`,
                usuarioId: recibidoPor,
                usuarioNombre: recibidoPor, // TODO: Obtener nombre real
              }
            );
          }
        }
      });

      console.log(`✅ Orden #${orden.numeroOrden} recibida y stock actualizado`);
    } catch (error) {
      console.error('❌ Error al recibir orden:', error);
      throw new Error('Error al recibir orden de compra');
    }
  }

  /**
   * Cancela una orden de compra
   */
  async cancelarOrden(id: string, motivo: string): Promise<void> {
    try {
      const orden = await this.getOrdenById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      if (orden.estado === 'RECIBIDA' || orden.estado === 'CANCELADA') {
        throw new Error(`No se puede cancelar una orden en estado ${orden.estado}`);
      }

      const ordenRef = doc(db, 'ordenes_compra', id);
      await updateDoc(ordenRef, {
        estado: 'CANCELADA',
        notas: orden.notas
          ? `${orden.notas}\n\n[CANCELADA]: ${motivo}`
          : `[CANCELADA]: ${motivo}`,
      });

      console.log(`✅ Orden #${orden.numeroOrden} cancelada: ${motivo}`);
    } catch (error) {
      console.error('❌ Error al cancelar orden:', error);
      throw new Error('Error al cancelar orden de compra');
    }
  }

  // ==========================================================================
  // MÉTODOS DE GENERACIÓN AUTOMÁTICA
  // ==========================================================================

  /**
   * Genera órdenes de compra sugeridas basadas en ingredientes con stock bajo
   */
  async generarOrdenSugerida(): Promise<OrdenSugerida[]> {
    try {
      // Obtener ingredientes con stock bajo
      const [ingredientesStockBajo, ingredientesSinStock] = await Promise.all([
        ingredientesService.getIngredientesStockBajo(),
        ingredientesService.getIngredientesSinStock(),
      ]);

      // Combinar y eliminar duplicados
      const ingredientesMap = new Map<string, Ingrediente>();
      [...ingredientesStockBajo, ...ingredientesSinStock].forEach((ing) => {
        ingredientesMap.set(ing.id, ing);
      });

      const ingredientesNecesarios = Array.from(ingredientesMap.values());

      if (ingredientesNecesarios.length === 0) {
        console.log('ℹ️ No hay ingredientes con stock bajo');
        return [];
      }

      // Agrupar por proveedor
      const ordenesMap = new Map<string, OrdenSugerida>();

      for (const ing of ingredientesNecesarios) {
        const proveedorId = ing.proveedor?.id || 'SIN_PROVEEDOR';
        const proveedorNombre = ing.proveedor?.nombre || 'Sin proveedor asignado';

        // Calcular cantidad sugerida (hasta el stock máximo)
        const cantidadSugerida = ing.stockMaximo - ing.stockActual;

        if (cantidadSugerida <= 0) continue;

        if (!ordenesMap.has(proveedorId)) {
          ordenesMap.set(proveedorId, {
            proveedorId,
            proveedorNombre,
            items: [],
            totalEstimado: 0,
          });
        }

        const orden = ordenesMap.get(proveedorId)!;
        const subtotalItem = cantidadSugerida * ing.precioPorUnidad;

        orden.items.push({
          ingredienteId: ing.id,
          ingredienteNombre: ing.nombre,
          stockActual: ing.stockActual,
          stockMinimo: ing.stockMinimo,
          stockMaximo: ing.stockMaximo,
          cantidadSugerida,
          unidadMedida: ing.unidadMedida,
          precioPorUnidad: ing.precioPorUnidad,
        });

        orden.totalEstimado += subtotalItem;
      }

      const ordenesSugeridas = Array.from(ordenesMap.values());

      console.log(`✅ ${ordenesSugeridas.length} órdenes sugeridas generadas`);
      return ordenesSugeridas;
    } catch (error) {
      console.error('❌ Error al generar orden sugerida:', error);
      throw new Error('Error al generar orden sugerida');
    }
  }

  /**
   * Crea órdenes de compra a partir de sugerencias
   */
  async crearOrdenesFromSugerencias(
    ordenesSugeridas: OrdenSugerida[],
    solicitadoPor: string
  ): Promise<string[]> {
    const ordenesCreadas: string[] = [];

    for (const sugerencia of ordenesSugeridas) {
      // Ignorar el proveedor "SIN_PROVEEDOR"
      if (sugerencia.proveedorId === 'SIN_PROVEEDOR') {
        console.warn(`⚠️ Ignorando sugerencia sin proveedor asignado (${sugerencia.items.length} items)`);
        continue;
      }

      try {
        const ordenId = await this.createOrdenCompra({
          proveedorId: sugerencia.proveedorId,
          proveedorNombre: sugerencia.proveedorNombre,
          items: sugerencia.items.map((item) => ({
            ingredienteId: item.ingredienteId,
            ingredienteNombre: item.ingredienteNombre,
            cantidadSolicitada: item.cantidadSugerida,
            unidadMedida: item.unidadMedida,
            precioUnitario: item.precioPorUnidad,
          })),
          notas: 'Orden generada automáticamente por stock bajo',
          solicitadoPor,
        });

        ordenesCreadas.push(ordenId);
      } catch (error) {
        console.error(`❌ Error al crear orden para proveedor ${sugerencia.proveedorNombre}:`, error);
      }
    }

    return ordenesCreadas;
  }

  // ==========================================================================
  // MÉTODOS DE ESTADÍSTICAS
  // ==========================================================================

  /**
   * Obtiene estadísticas de órdenes de compra
   */
  async getEstadisticas(fechaInicio: Date, fechaFin: Date): Promise<{
    totalOrdenes: number;
    ordenesRecibidas: number;
    ordenesPendientes: number;
    ordenesCanceladas: number;
    montoTotal: number;
    montoRecibido: number;
    promedioOrden: number;
  }> {
    try {
      const ordenes = await this.getOrdenes({ fechaInicio, fechaFin });

      const stats = {
        totalOrdenes: ordenes.length,
        ordenesRecibidas: 0,
        ordenesPendientes: 0,
        ordenesCanceladas: 0,
        montoTotal: 0,
        montoRecibido: 0,
        promedioOrden: 0,
      };

      for (const orden of ordenes) {
        stats.montoTotal += orden.total;

        switch (orden.estado) {
          case 'RECIBIDA':
            stats.ordenesRecibidas++;
            stats.montoRecibido += orden.total;
            break;
          case 'PENDIENTE':
          case 'APROBADA':
          case 'ENVIADA':
            stats.ordenesPendientes++;
            break;
          case 'CANCELADA':
            stats.ordenesCanceladas++;
            break;
        }
      }

      stats.promedioOrden = stats.totalOrdenes > 0
        ? stats.montoTotal / stats.totalOrdenes
        : 0;

      return stats;
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }

  /**
   * Obtiene historial de compras por proveedor
   */
  async getHistorialPorProveedor(proveedorId: string): Promise<{
    ordenes: OrdenCompra[];
    totalCompras: number;
    ordenesRecibidas: number;
    promedioOrden: number;
  }> {
    try {
      const ordenes = await this.getOrdenes({ proveedorId });

      const ordenesRecibidas = ordenes.filter((o) => o.estado === 'RECIBIDA');
      const totalCompras = ordenesRecibidas.reduce((sum, o) => sum + o.total, 0);
      const promedioOrden = ordenesRecibidas.length > 0
        ? totalCompras / ordenesRecibidas.length
        : 0;

      return {
        ordenes,
        totalCompras,
        ordenesRecibidas: ordenesRecibidas.length,
        promedioOrden,
      };
    } catch (error) {
      console.error('❌ Error al obtener historial por proveedor:', error);
      throw new Error('Error al obtener historial por proveedor');
    }
  }

  // ==========================================================================
  // LISTENERS EN TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha cambios en tiempo real en las órdenes de compra
   */
  onOrdenesChange(
    callback: (ordenes: OrdenCompra[]) => void,
    filtros?: { estado?: EstadoOrdenCompra; limite?: number }
  ): () => void {
    let q = query(
      collection(db, 'ordenes_compra'),
      orderBy('fechaSolicitud', 'desc')
    );

    if (filtros?.estado) {
      q = query(q, where('estado', '==', filtros.estado));
    }

    if (filtros?.limite) {
      q = query(q, limit(filtros.limite));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const ordenes = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fechaSolicitud: data.fechaSolicitud?.toDate(),
            fechaEntregaEstimada: data.fechaEntregaEstimada?.toDate(),
            fechaRecepcion: data.fechaRecepcion?.toDate(),
          } as OrdenCompra;
        });

        callback(ordenes);
      },
      (error) => {
        console.error('❌ Error en listener de órdenes:', error);
      }
    );

    return unsubscribe;
  }

  // ==========================================================================
  // MÉTODOS DE EXPORTACIÓN
  // ==========================================================================

  /**
   * Exporta órdenes de compra a formato CSV
   */
  async exportToCSV(filtros?: FiltrosOrdenesCompra): Promise<string> {
    const ordenes = await this.getOrdenes(filtros);

    const headers = [
      '# Orden',
      'Fecha Solicitud',
      'Proveedor',
      'Items',
      'Subtotal',
      'IVA',
      'Total',
      'Estado',
      'Solicitado Por',
      'Aprobado Por',
      'Recibido Por',
      'Fecha Recepción',
    ].join(',');

    const rows = ordenes.map((o) =>
      [
        o.numeroOrden,
        o.fechaSolicitud.toISOString().split('T')[0],
        `"${o.proveedorNombre}"`,
        o.items.length,
        o.subtotal.toFixed(2),
        o.iva.toFixed(2),
        o.total.toFixed(2),
        o.estado,
        `"${o.solicitadoPor}"`,
        `"${o.aprobadoPor || ''}"`,
        `"${o.recibidoPor || ''}"`,
        o.fechaRecepcion ? o.fechaRecepcion.toISOString().split('T')[0] : '',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Genera PDF de una orden de compra (retorna datos para el componente)
   */
  async getDatosParaPDF(id: string): Promise<{
    orden: OrdenCompra;
    detalleItems: Array<{
      nombre: string;
      cantidad: number;
      unidad: string;
      precioUnitario: number;
      subtotal: number;
    }>;
  }> {
    const orden = await this.getOrdenById(id);
    if (!orden) {
      throw new Error('Orden no encontrada');
    }

    const detalleItems = orden.items.map((item) => ({
      nombre: item.ingredienteNombre,
      cantidad: item.cantidadSolicitada,
      unidad: item.unidadMedida,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
    }));

    return { orden, detalleItems };
  }
}

// Exportar instancia singleton
export const ordenesCompraService = new OrdenesCompraService();
export default ordenesCompraService;
