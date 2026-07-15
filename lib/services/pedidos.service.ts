/**
 * Servicio de Pedidos
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones CRUD para pedidos y sus subcolecciones
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService, QueryOptions } from './base.service';
import {
  Pedido,
  ItemPedido,
  HistorialPedido,
  EstadoPedido,
  CanalVenta,
  NuevoPedido,
  PedidoConDatos,
} from '@/lib/types/firestore';
import { notificacionesService } from './notificaciones.service';
import { turnosService } from './turnos.service';
import { registrarMovimiento as registrarMovimientoCaja } from './movimientosCaja.service';

class PedidosService extends BaseService<Pedido> {
  constructor() {
    super('pedidos');
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ==========================================================================

  /**
   * Elimina campos con valor undefined de un objeto
   * Firebase no acepta campos con undefined
   */
  private removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: any = {};

    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }

    return cleaned;
  }

  // ==========================================================================
  // MÉTODOS ESPECÍFICOS DE PEDIDOS
  // ==========================================================================

  /**
   * Crea un pedido completo con items e historial inicial
   */
  async crearPedidoCompleto(
    pedidoData: Omit<NuevoPedido, 'numeroPedido'>,
    items: Omit<ItemPedido, 'id'>[]
  ): Promise<string> {
    try {
      // 1. Obtener el número de pedido del día
      const numeroPedido = await this.getNextNumeroPedido();

      // 2. Limpiar campos undefined antes de crear
      const pedidoLimpio = this.removeUndefinedFields({
        ...pedidoData,
        numeroPedido,
      });

      // 3. Crear el pedido principal
      const pedidoId = await this.create(pedidoLimpio as any);

      // 3. Agregar items
      await this.addItems(pedidoId, items);

      // 4. Crear entrada en historial
      await this.addHistorial(pedidoId, {
        accion: 'creado',
        estadoNuevo: pedidoData.estado,
        usuarioId: pedidoData.creadoPor,
        usuarioNombre: 'Sistema', // TODO: obtener nombre del usuario
        detalles: `Pedido creado vía ${pedidoData.canal}`,
      });

      // 5. Actualizar resumen del turno con ventas y método de pago
      if (pedidoData.turnoId && !pedidoData.cancelado) {
        const total = pedidoData.totales?.total ?? 0;
        const metodo = pedidoData.pago?.metodo;
        const envio = pedidoData.totales?.envio ?? 0;
        const descuento = pedidoData.totales?.descuento ?? 0;
        const comisionRepartidor = pedidoData.reparto?.comisionRepartidor ?? 0;

        const resumenDelta: Record<string, number> = {
          totalPedidos: 1,
          totalVentas: total,
          totalEnvios: envio,
          totalDescuentos: descuento,
          totalComisionesRepartidores: comisionRepartidor,
        };

        if (metodo === 'efectivo') resumenDelta.efectivo = total;
        else if (metodo === 'tarjeta') resumenDelta.tarjeta = total;
        else if (metodo === 'transferencia') resumenDelta.transferencia = total;
        else if (metodo === 'uber') resumenDelta.uber = total;
        else if (metodo === 'didi') resumenDelta.didi = total;

        // Incremento atómico para evitar condiciones de carrera
        const turnoRef = doc(db, 'turnos', pedidoData.turnoId);
        const incrementos: Record<string, any> = {};
        for (const [key, val] of Object.entries(resumenDelta)) {
          incrementos[`resumen.${key}`] = increment(val);
        }
        await updateDoc(turnoRef, incrementos);
      }

      // 6. 🔔 TRIGGER: Notificar a cocina sobre nuevo pedido
      await this.notificarNuevoPedido(pedidoId, numeroPedido);

      return pedidoId;
    } catch (error) {
      console.error('Error creando pedido completo:', error);
      throw error;
    }
  }

  /**
   * Obtiene el siguiente número de pedido para el día actual
   */
  async getNextNumeroPedido(): Promise<number> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioDelDia = Timestamp.fromDate(hoy);

    const pedidosHoy = await this.search([
      { field: 'fechaCreacion', operator: '>=', value: inicioDelDia },
    ]);

    return pedidosHoy.length + 1;
  }

  /**
   * Obtiene pedidos por estado
   */
  async getByEstado(estado: EstadoPedido): Promise<Pedido[]> {
    return this.search([{ field: 'estado', operator: '==', value: estado }]);
  }

  /**
   * Obtiene pedidos por canal
   */
  async getByCanal(canal: CanalVenta): Promise<Pedido[]> {
    return this.search([{ field: 'canal', operator: '==', value: canal }]);
  }

  /**
   * Obtiene pedidos de un turno específico
   */
  async getByTurno(turnoId: string): Promise<Pedido[]> {
    return this.search([{ field: 'turnoId', operator: '==', value: turnoId }]);
  }

  /**
   * Obtiene pedidos de un repartidor
   */
  async getByRepartidor(repartidorId: string): Promise<Pedido[]> {
    return this.search([
      { field: 'reparto.repartidorId', operator: '==', value: repartidorId },
    ]);
  }

  /**
   * Obtiene pedidos pendientes de liquidar de un repartidor
   */
  async getPendientesLiquidar(repartidorId: string): Promise<Pedido[]> {
    return this.search([
      { field: 'reparto.repartidorId', operator: '==', value: repartidorId },
      { field: 'reparto.liquidado', operator: '==', value: false },
      { field: 'estado', operator: '==', value: 'entregado' },
    ]);
  }

  /**
   * Obtiene pedidos del día actual
   */
  async getPedidosHoy(options?: QueryOptions): Promise<Pedido[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioDelDia = Timestamp.fromDate(hoy);

    const queryOptions: QueryOptions = {
      ...options,
      filters: [
        ...(options?.filters || []),
        { field: 'fechaCreacion', operator: '>=', value: inicioDelDia },
      ],
    };

    return this.getAll(queryOptions);
  }

  /**
   * Obtiene pedidos entre fechas
   */
  async getByRangoFechas(
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<Pedido[]> {
    return this.search([
      {
        field: 'fechaCreacion',
        operator: '>=',
        value: Timestamp.fromDate(fechaInicio),
      },
      {
        field: 'fechaCreacion',
        operator: '<=',
        value: Timestamp.fromDate(fechaFin),
      },
    ]);
  }

  /**
   * Actualiza el estado de un pedido y registra en historial
   */
  async actualizarEstado(
    pedidoId: string,
    nuevoEstado: EstadoPedido,
    usuarioId: string,
    usuarioNombre: string,
    detalles?: string
  ): Promise<void> {
    const pedido = await this.getById(pedidoId);
    if (!pedido) throw new Error('Pedido no encontrado');

    const estadoAnterior = pedido.estado;

    // Actualizar timestamps según el estado
    const updateData: any = { estado: nuevoEstado };

    switch (nuevoEstado) {
      case 'en_preparacion':
        updateData.horaInicioCocina = Timestamp.now();
        break;
      case 'listo':
        updateData.horaListo = Timestamp.now();
        break;
      case 'entregado':
        updateData.horaEntrega = Timestamp.now();
        break;
    }

    // Actualizar pedido
    await this.update(pedidoId, updateData);

    // Registrar en historial
    await this.addHistorial(pedidoId, {
      accion: 'cambio_estado',
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      usuarioId,
      usuarioNombre,
      detalles: detalles || `Estado cambiado de ${estadoAnterior} a ${nuevoEstado}`,
    });

    // 🔔 TRIGGERS: Notificaciones según el nuevo estado
    if (nuevoEstado === 'listo') {
      // Notificar a repartidores que hay pedido listo para recoger
      await this.notificarPedidoListo(pedidoId, pedido.numeroPedido);
    } else if (nuevoEstado === 'entregado') {
      // Notificar a cajera que el pedido fue entregado
      await this.notificarPedidoEntregado(pedidoId, pedido.numeroPedido, pedido.cliente.nombre);
    }
  }

  /**
   * Asigna un repartidor a un pedido
   */
  async asignarRepartidor(
    pedidoId: string,
    repartidorId: string,
    repartidorNombre: string,
    comision: number,
    usuarioId: string,
    usuarioNombre: string
  ): Promise<void> {
    await this.update(pedidoId, {
      reparto: {
        repartidorId,
        repartidorNombre,
        comisionRepartidor: comision,
        estadoReparto: 'asignado',
        horaAsignacion: Timestamp.now(),
        liquidado: false,
      },
    } as any);

    await this.addHistorial(pedidoId, {
      accion: 'asignado',
      usuarioId,
      usuarioNombre,
      detalles: `Pedido asignado a ${repartidorNombre}`,
    });
  }

  /**
   * Cancela un pedido
   */
  async cancelar(
    pedidoId: string,
    motivo: string,
    usuarioId: string,
    usuarioNombre: string
  ): Promise<void> {
    const pedido = await this.getById(pedidoId);
    if (!pedido) throw new Error('Pedido no encontrado');

    await this.update(pedidoId, {
      estado: 'cancelado',
      cancelado: true,
      motivoCancelacion: motivo,
    } as any);

    await this.addHistorial(pedidoId, {
      accion: 'cancelado',
      estadoAnterior: pedido.estado,
      estadoNuevo: 'cancelado',
      usuarioId,
      usuarioNombre,
      detalles: `Pedido cancelado. Motivo: ${motivo}`,
    });

    // Restar la venta del resumen del turno si el pedido no estaba ya cancelado
    if (pedido.turnoId && !pedido.cancelado) {
      const total = pedido.totales?.total ?? 0;
      const metodo = pedido.pago?.metodo;
      const envio = pedido.totales?.envio ?? 0;
      const descuento = pedido.totales?.descuento ?? 0;
      const comisionRepartidor = pedido.reparto?.comisionRepartidor ?? 0;

      const turnoRef = doc(db, 'turnos', pedido.turnoId);
      const decrementos: Record<string, any> = {
        'resumen.totalPedidos': increment(-1),
        'resumen.totalVentas': increment(-total),
        'resumen.totalEnvios': increment(-envio),
        'resumen.totalDescuentos': increment(-descuento),
        'resumen.totalComisionesRepartidores': increment(-comisionRepartidor),
      };

      if (metodo === 'efectivo') decrementos['resumen.efectivo'] = increment(-total);
      else if (metodo === 'tarjeta') decrementos['resumen.tarjeta'] = increment(-total);
      else if (metodo === 'transferencia') decrementos['resumen.transferencia'] = increment(-total);
      else if (metodo === 'uber') decrementos['resumen.uber'] = increment(-total);
      else if (metodo === 'didi') decrementos['resumen.didi'] = increment(-total);

      await updateDoc(turnoRef, decrementos);

      // Registrar egreso en caja si el pago fue en efectivo (dinero que ya entró y ahora se devuelve)
      if (total > 0 && metodo === 'efectivo') {
        try {
          await registrarMovimientoCaja({
            turno_id: pedido.turnoId,
            tipo: 'egreso',
            monto: total,
            concepto: 'Cancelación de pedido',
            descripcion: `Pedido #${pedido.numeroPedido} cancelado. Motivo: ${motivo}`,
            fecha: Timestamp.now(),
            usuario_id: usuarioId,
          });
        } catch {
          // No bloquear la cancelación si el registro de caja falla
        }
      }
    }
  }

  /**
   * Marca pedidos como liquidados
   */
  async liquidarPedidos(
    pedidoIds: string[],
    usuarioId: string
  ): Promise<void> {
    const batch = writeBatch(db);

    pedidoIds.forEach((pedidoId) => {
      const docRef = doc(db, this.collectionName, pedidoId);
      batch.update(docRef, {
        'reparto.liquidado': true,
        'reparto.fechaLiquidacion': Timestamp.now(),
        fechaActualizacion: Timestamp.now(),
      });
    });

    await batch.commit();
  }

  // ==========================================================================
  // MÉTODOS DE ITEMS (SUBCOLECCIÓN)
  // ==========================================================================

  /**
   * Obtiene los items de un pedido
   */
  async getItems(pedidoId: string): Promise<ItemPedido[]> {
    try {
      const itemsRef = this.getSubcollectionRef(pedidoId, 'items');
      const querySnapshot = await getDocs(itemsRef);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ItemPedido[];
    } catch (error) {
      console.error('Error obteniendo items del pedido:', error);
      throw error;
    }
  }

  /**
   * Agrega items a un pedido
   */
  async addItems(
    pedidoId: string,
    items: Omit<ItemPedido, 'id'>[]
  ): Promise<void> {
    try {
      const itemsRef = this.getSubcollectionRef(pedidoId, 'items');

      const batch = writeBatch(db);

      items.forEach((item) => {
        const newDocRef = doc(itemsRef);
        batch.set(newDocRef, item);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error agregando items al pedido:', error);
      throw error;
    }
  }

  /**
   * Obtiene un pedido con sus items
   */
  async getPedidoConItems(pedidoId: string): Promise<PedidoConDatos | null> {
    const pedido = await this.getById(pedidoId);
    if (!pedido) return null;

    const items = await this.getItems(pedidoId);

    return {
      ...pedido,
      items,
    };
  }

  // ==========================================================================
  // MÉTODOS DE HISTORIAL (SUBCOLECCIÓN)
  // ==========================================================================

  /**
   * Obtiene el historial de un pedido
   */
  async getHistorial(pedidoId: string): Promise<HistorialPedido[]> {
    try {
      const historialRef = this.getSubcollectionRef(pedidoId, 'historial');
      const q = query(historialRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as HistorialPedido[];
    } catch (error) {
      console.error('Error obteniendo historial del pedido:', error);
      throw error;
    }
  }

  /**
   * Agrega una entrada al historial del pedido
   */
  async addHistorial(
    pedidoId: string,
    historial: Omit<HistorialPedido, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const historialRef = this.getSubcollectionRef(pedidoId, 'historial');
      await addDoc(historialRef, {
        ...historial,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error agregando historial al pedido:', error);
      throw error;
    }
  }

  // ==========================================================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================================================

  /**
   * Obtiene estadísticas de pedidos del día
   */
  async getEstadisticasHoy(): Promise<{
    total: number;
    porEstado: Record<EstadoPedido, number>;
    porCanal: Record<CanalVenta, number>;
    totalVentas: number;
  }> {
    const pedidosHoy = await this.getPedidosHoy();

    const stats = {
      total: pedidosHoy.length,
      porEstado: {
        pendiente: 0,
        en_preparacion: 0,
        listo: 0,
        en_reparto: 0,
        entregado: 0,
        cancelado: 0,
      } as Record<EstadoPedido, number>,
      porCanal: {
        whatsapp: 0,
        mostrador: 0,
        uber: 0,
        didi: 0,
        llamada: 0,
        web: 0,
      } as Record<CanalVenta, number>,
      totalVentas: 0,
    };

    pedidosHoy.forEach((pedido) => {
      stats.porEstado[pedido.estado]++;
      stats.porCanal[pedido.canal]++;
      if (!pedido.cancelado) {
        stats.totalVentas += pedido.totales.total;
      }
    });

    return stats;
  }

  /**
   * Calcula el tiempo promedio de entrega
   */
  async getTiempoPromedioEntrega(): Promise<number> {
    const pedidosHoy = await this.getPedidosHoy({
      filters: [{ field: 'estado', operator: '==', value: 'entregado' }],
    });

    if (pedidosHoy.length === 0) return 0;

    const tiempos = pedidosHoy
      .filter((p) => p.horaEntrega && p.horaRecepcion)
      .map((p) => {
        const recepcion = p.horaRecepcion.toMillis();
        const entrega = p.horaEntrega!.toMillis();
        return (entrega - recepcion) / 1000 / 60; // En minutos
      });

    const promedio =
      tiempos.reduce((acc, t) => acc + t, 0) / tiempos.length;

    return Math.round(promedio);
  }

  // ==========================================================================
  // MÉTODOS DE TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha pedidos por estado en tiempo real
   */
  onPedidosByEstadoChange(
    estado: EstadoPedido,
    callback: (pedidos: Pedido[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [{ field: 'estado', operator: '==', value: estado }],
        orderByField: 'fechaCreacion',
        orderDirection: 'desc',
      },
      onError
    );
  }

  /**
   * Escucha pedidos de un turno en tiempo real
   */
  onPedidosByTurnoChange(
    turnoId: string,
    callback: (pedidos: Pedido[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [{ field: 'turnoId', operator: '==', value: turnoId }],
        orderByField: 'fechaCreacion',
        orderDirection: 'desc',
      },
      onError
    );
  }

  /**
   * Escucha pedidos de cocina (pendientes y en preparación)
   */
  onPedidosCocinaChange(
    callback: (pedidos: Pedido[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [
          { field: 'estado', operator: 'in', value: ['pendiente', 'en_preparacion', 'listo'] },
        ],
        orderByField: 'fechaCreacion',
        orderDirection: 'asc',
      },
      onError
    );
  }

  /**
   * Escucha pedidos listos para recoger (sin repartidor asignado)
   */
  onPedidosListosParaRecoger(
    callback: (pedidos: Pedido[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [
          { field: 'estado', operator: '==', value: 'listo' },
          { field: 'reparto', operator: '==', value: null },
        ],
        orderByField: 'fechaCreacion',
        orderDirection: 'asc',
      },
      onError
    );
  }

  /**
   * Escucha pedidos asignados a un repartidor específico
   */
  onPedidosAsignadosARepartidor(
    repartidorId: string,
    callback: (pedidos: Pedido[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [
          { field: 'reparto.repartidorId', operator: '==', value: repartidorId },
          { field: 'estado', operator: 'in', value: ['en_reparto', 'listo'] },
        ],
        orderByField: 'fechaCreacion',
        orderDirection: 'desc',
      },
      onError
    );
  }

  // ==========================================================================
  // MÉTODOS DE NOTIFICACIONES (TRIGGERS)
  // ==========================================================================

  /**
   * 🔔 TRIGGER 1: Notifica a cocina cuando se crea un nuevo pedido
   */
  private async notificarNuevoPedido(
    pedidoId: string,
    numeroPedido: number
  ): Promise<void> {
    try {
      await notificacionesService.crearParaRol(
        'cocina',
        'nuevo_pedido',
        'Nuevo Pedido',
        `Pedido #${numeroPedido} recibido y listo para preparar`,
        'alta',
        pedidoId
      );
    } catch (error) {
      console.error('Error al notificar nuevo pedido a cocina:', error);
      // No lanzar error para no bloquear la creación del pedido
    }
  }

  /**
   * 🔔 TRIGGER 2: Notifica a repartidores cuando un pedido está listo
   */
  private async notificarPedidoListo(
    pedidoId: string,
    numeroPedido: number
  ): Promise<void> {
    try {
      await notificacionesService.crearParaRol(
        'repartidor',
        'pedido_listo',
        'Pedido Listo para Recoger',
        `Pedido #${numeroPedido} está listo para entrega`,
        'normal',
        pedidoId
      );
    } catch (error) {
      console.error('Error al notificar pedido listo a repartidores:', error);
    }
  }

  /**
   * 🔔 TRIGGER 3: Notifica a cajera cuando un pedido es entregado
   */
  private async notificarPedidoEntregado(
    pedidoId: string,
    numeroPedido: number,
    nombreCliente: string
  ): Promise<void> {
    try {
      await notificacionesService.crearParaRol(
        'cajera',
        'pedido_entregado',
        'Pedido Entregado',
        `Pedido #${numeroPedido} entregado a ${nombreCliente}`,
        'normal',
        pedidoId
      );
    } catch (error) {
      console.error('Error al notificar pedido entregado a cajera:', error);
    }
  }

  /**
   * 🔔 TRIGGER 4: Reporta una incidencia y notifica a encargado
   */
  async reportarIncidencia(
    pedidoId: string,
    tipoIncidencia: string,
    descripcion: string,
    usuarioId: string,
    usuarioNombre: string
  ): Promise<void> {
    try {
      const pedido = await this.getById(pedidoId);
      if (!pedido) throw new Error('Pedido no encontrado');

      // Agregar al historial del pedido
      await this.addHistorial(pedidoId, {
        accion: 'actualizado',
        usuarioId,
        usuarioNombre,
        detalles: `INCIDENCIA: ${tipoIncidencia} - ${descripcion}`,
      });

      // Notificar a encargado
      await notificacionesService.crearParaRol(
        'encargado',
        'alerta',
        `Incidencia: ${tipoIncidencia}`,
        `Pedido #${pedido.numeroPedido} - ${descripcion}`,
        'urgente',
        pedidoId
      );
    } catch (error) {
      console.error('Error al reportar incidencia:', error);
      throw error;
    }
  }

  /**
   * 🔔 TRIGGER 5: Verifica pedidos con retrasos y notifica a encargado
   * Esta función debe ejecutarse periódicamente (ej: cada 5-10 minutos)
   */
  async verificarYNotificarRetrasos(): Promise<void> {
    try {
      const TIEMPO_LIMITE_MINUTOS = 30;
      const ahora = Timestamp.now();

      // Obtener pedidos activos (no entregados ni cancelados)
      const pedidosActivos = await this.getPedidosHoy({
        filters: [
          {
            field: 'estado',
            operator: 'in',
            value: ['pendiente', 'en_preparacion', 'listo', 'en_reparto'],
          },
        ],
      });

      // Filtrar pedidos con más de 30 minutos
      const pedidosRetrasados = pedidosActivos.filter((pedido) => {
        const tiempoTranscurrido =
          (ahora.toMillis() - pedido.fechaCreacion.toMillis()) / 1000 / 60; // En minutos
        return tiempoTranscurrido > TIEMPO_LIMITE_MINUTOS;
      });

      // Notificar por cada pedido retrasado
      for (const pedido of pedidosRetrasados) {
        const tiempoTranscurrido = Math.round(
          (ahora.toMillis() - pedido.fechaCreacion.toMillis()) / 1000 / 60
        );

        // Verificar si ya se notificó este retraso (para no duplicar)
        const historial = await this.getHistorial(pedido.id);
        const yaNotificado = historial.some(
          (h) =>
            h.detalles?.includes('RETRASO') &&
            h.timestamp.toMillis() > ahora.toMillis() - 10 * 60 * 1000 // Últimos 10 min
        );

        if (!yaNotificado) {
          // Agregar al historial
          await this.addHistorial(pedido.id, {
            accion: 'actualizado',
            usuarioId: 'system',
            usuarioNombre: 'Sistema',
            detalles: `RETRASO: Pedido lleva ${tiempoTranscurrido} minutos sin completarse`,
          });

          // Notificar a encargado
          await notificacionesService.crearParaRol(
            'encargado',
            'alerta',
            'Pedido Retrasado',
            `Pedido #${pedido.numeroPedido} lleva ${tiempoTranscurrido} min en estado: ${pedido.estado}`,
            'urgente',
            pedido.id
          );
        }
      }

      console.log(
        `✅ Verificación de retrasos: ${pedidosRetrasados.length} pedido(s) retrasado(s)`
      );
    } catch (error) {
      console.error('Error al verificar retrasos:', error);
    }
  }
}

// Exportar instancia única (Singleton)
export const pedidosService = new PedidosService();
