/**
 * Servicio de Turnos
 * Old Texas BBQ - CRM
 *
 * CRUD completo para la colección `turnos`.
 * Regla crítica: solo un turno puede estar abierto a la vez.
 */

import { BaseService } from './base.service';
import { Turno, TipoTurno, TransaccionTurno } from '@/lib/types/firestore';
import {
  Timestamp,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

class TurnosService extends BaseService<Turno> {
  constructor() {
    super('turnos');
  }

  // ==========================================================================
  // LECTURA
  // ==========================================================================

  /**
   * Obtiene el turno abierto actualmente (máximo uno).
   * Alias getTurnoActivo — nombre canónico del contexto.
   */
  async getTurnoActual(): Promise<Turno | null> {
    const turnos = await this.search([
      { field: 'estado', operator: '==', value: 'abierto' },
    ]);
    return turnos[0] || null;
  }

  async getTurnoActivo(): Promise<Turno | null> {
    return this.getTurnoActual();
  }

  /**
   * Obtiene todos los turnos ordenados por fecha descendente.
   */
  async getTodos(): Promise<Turno[]> {
    return this.getAll({
      orderByField: 'horaInicio',
      orderDirection: 'desc',
    });
  }

  /**
   * Obtiene turnos cerrados ordenados por fecha descendente.
   */
  async getTurnosCerrados(): Promise<Turno[]> {
    return this.search([{ field: 'estado', operator: '==', value: 'cerrado' }]);
  }

  /**
   * Obtiene turnos en un rango de fechas (formato "YYYY-MM-DD").
   */
  async getTurnosPorRango(fechaInicio: string, fechaFin: string): Promise<Turno[]> {
    return this.getAll({
      filters: [
        { field: 'fecha', operator: '>=', value: fechaInicio },
        { field: 'fecha', operator: '<=', value: fechaFin },
      ],
      orderByField: 'fecha',
      orderDirection: 'asc',
    });
  }

  /**
   * Obtiene turnos abiertos que llevan más de `horas` horas activos.
   * Útil para detectar turnos olvidados / sin cerrar.
   */
  async getTurnosAbiertosVencidos(horas: number = 10): Promise<Turno[]> {
    const abiertos = await this.getTurnoActual().then((t) => (t ? [t] : []));
    const ahora = Date.now();
    const umbralMs = horas * 60 * 60 * 1000;
    return abiertos.filter((t) => {
      const inicio = t.horaInicio?.toDate ? t.horaInicio.toDate().getTime() : 0;
      return ahora - inicio > umbralMs;
    });
  }

  /**
   * Obtiene turnos de una fecha específica.
   */
  async getByFecha(fecha: string): Promise<Turno[]> {
    return this.search([{ field: 'fecha', operator: '==', value: fecha }]);
  }

  /**
   * Obtiene el turno de hoy por tipo (matutino / vespertino).
   */
  async getTurnoHoy(tipo: TipoTurno): Promise<Turno | null> {
    const fecha = new Date().toISOString().split('T')[0];
    const id = `turno_${fecha}_${tipo}`;
    return this.getById(id);
  }

  // ==========================================================================
  // APERTURA
  // ==========================================================================

  /**
   * Abre un nuevo turno.
   * Lanza error si ya existe un turno abierto (turno único activo).
   */
  async abrirTurno(
    tipo: TipoTurno,
    cajeroId: string,
    cajeroNombre: string,
    fondoInicial: number,
    encargadoId?: string,
    encargadoNombre?: string
  ): Promise<string> {
    const activo = await this.getTurnoActivo();
    if (activo) throw new Error('Ya existe un turno abierto. Ciérralo antes de abrir uno nuevo.');

    const fecha = new Date().toISOString().split('T')[0];
    const id = `turno_${fecha}_${tipo}`;

    const turnoData: Omit<Turno, 'id' | 'fechaCreacion' | 'fechaActualizacion'> = {
      tipo,
      fecha,
      cajeroId,
      cajeroNombre,
      ...(encargadoId ? { encargadoId } : {}),
      ...(encargadoNombre ? { encargadoNombre } : {}),
      horaInicio: Timestamp.now(),
      estado: 'abierto',
      fondoInicial,
      resumen: {
        totalPedidos: 0,
        totalVentas: 0,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        uber: 0,
        didi: 0,
        totalEnvios: 0,
        totalDescuentos: 0,
        totalComisionesRepartidores: 0,
      },
    };

    await this.createWithId(id, turnoData);
    return id;
  }

  // ==========================================================================
  // JUSTIFICACIÓN DE DESCUADRE
  // ==========================================================================

  /**
   * Registra la justificación de un descuadre en el campo corte.justificacion.
   * Solo aplica a turnos ya cerrados.
   */
  async justificarDescuadre(
    turnoId: string,
    justificacion: string,
    justificadoPor: string
  ): Promise<void> {
    const turno = await this.getById(turnoId);
    if (!turno) throw new Error('Turno no encontrado');
    if (turno.estado !== 'cerrado') throw new Error('El turno no está cerrado');

    await this.update(turnoId, {
      corte: {
        ...turno.corte,
        justificacion,
        justificadoPor,
        fechaJustificacion: Timestamp.now(),
      },
    } as any);
  }

  // ==========================================================================
  // CIERRE
  // ==========================================================================

  /**
   * Cierra el turno y persiste el corte.
   * Uso interno: el flujo completo de cierre debe ir por cierreCaja.service.ts
   * para que quede el documento en CierresCaja además de actualizar el turno.
   */
  async cerrarTurno(
    turnoId: string,
    efectivoReal: number,
    observaciones: string,
    cerradoPor: string
  ): Promise<void> {
    const turno = await this.getById(turnoId);
    if (!turno) throw new Error('Turno no encontrado');
    if (turno.estado === 'cerrado') throw new Error('El turno ya está cerrado');

    const efectivoEsperado = turno.fondoInicial + turno.resumen.efectivo;
    const diferencia = efectivoReal - efectivoEsperado;

    await this.update(turnoId, {
      estado: 'cerrado',
      horaFin: Timestamp.now(),
      corte: {
        efectivoEsperado,
        efectivoReal,
        diferencia,
        observaciones,
        cerradoPor,
        horaCierre: Timestamp.now(),
      },
    } as any);
  }

  // ==========================================================================
  // ACTUALIZACIÓN DE RESUMEN
  // ==========================================================================

  /**
   * Actualiza los campos de resumen del turno (totales de ventas, métodos de pago, etc.).
   * Llamado automáticamente al registrar pedidos.
   */
  async actualizarResumen(turnoId: string, resumen: Partial<Turno['resumen']>): Promise<void> {
    const turno = await this.getById(turnoId);
    if (!turno) return;

    await this.update(turnoId, {
      resumen: {
        ...turno.resumen,
        ...resumen,
      },
    } as any);
  }

  // ==========================================================================
  // TRANSACCIONES (subcolección)
  // ==========================================================================

  /**
   * Obtiene todas las transacciones de un turno ordenadas por fecha descendente.
   */
  async getTransacciones(turnoId: string): Promise<TransaccionTurno[]> {
    const transaccionesRef = this.getSubcollectionRef(turnoId, 'transacciones');
    const q = query(transaccionesRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TransaccionTurno);
  }

  /**
   * Agrega una transacción al turno.
   */
  async addTransaccion(
    turnoId: string,
    transaccion: Omit<TransaccionTurno, 'id' | 'timestamp'>
  ): Promise<void> {
    const transaccionesRef = this.getSubcollectionRef(turnoId, 'transacciones');
    await addDoc(transaccionesRef, {
      ...transaccion,
      timestamp: Timestamp.now(),
    });
  }

  // ==========================================================================
  // TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha en tiempo real el turno actualmente abierto.
   * Retorna unsubscribe para limpiar en useEffect.
   */
  onTurnoActualChange(
    callback: (turno: Turno | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return this.onCollectionChange(
      (turnos) => callback(turnos[0] || null),
      { filters: [{ field: 'estado', operator: '==', value: 'abierto' }], limitCount: 1 },
      onError
    );
  }

  /**
   * Escucha en tiempo real todos los turnos cerrados.
   */
  onTurnosCerradosChange(
    callback: (turnos: Turno[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    if (!db) return () => {};
    const q = query(
      this.collectionRef,
      where('estado', '==', 'cerrado'),
      orderBy('horaInicio', 'desc')
    );
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Turno)),
      (err) => onError?.(err)
    );
  }
}

export const turnosService = new TurnosService();
