import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService } from './base.service';
import { Prestamo, NuevoPrestamo, EstadoPrestamo } from '@/lib/types/firestore';

// ─── Historial de descuentos ──────────────────────────────────────────────────

export interface DescuentoAplicado {
  id: string;
  prestamoId: string;
  empleadoId: string;
  empleadoNombre: string;
  monto: number;
  saldoAntes: number;
  saldoDespues: number;
  fechaAplicacion: Timestamp;
}

const COL_HISTORIAL = 'HistorialDescuentoPrestamo';

async function registrarDescuentoEnHistorial(data: Omit<DescuentoAplicado, 'id'>): Promise<void> {
  await addDoc(collection(db, COL_HISTORIAL), data);
}

export async function getHistorialPorPrestamo(prestamoId: string): Promise<DescuentoAplicado[]> {
  const q = query(
    collection(db, COL_HISTORIAL),
    where('prestamoId', '==', prestamoId),
    orderBy('fechaAplicacion', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DescuentoAplicado);
}

// ─── Tipos de reporte ─────────────────────────────────────────────────────────

export interface PrestamoConSemanasRestantes extends Prestamo {
  semanasRestantes: number | null;
}

export interface ResumenDeuda {
  prestamosActivos: PrestamoConSemanasRestantes[];
  totalDeuda: number;
  totalEmpleadosConDeuda: number;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

class PrestamosService extends BaseService<Prestamo> {
  constructor() {
    super('Prestamos');
  }

  async getPorEmpleado(empleadoId: string): Promise<Prestamo[]> {
    return this.getAll({
      filters: [{ field: 'empleadoId', operator: '==', value: empleadoId }],
      orderByField: 'fechaCreacion',
      orderDirection: 'desc',
    });
  }

  async getActivosPorEmpleado(empleadoId: string): Promise<Prestamo[]> {
    return this.getAll({
      filters: [
        { field: 'empleadoId', operator: '==', value: empleadoId },
        { field: 'estado',     operator: '==', value: 'activo'   },
      ],
      orderByField: 'fechaCreacion',
      orderDirection: 'desc',
    });
  }

  async getTodos(): Promise<Prestamo[]> {
    return this.getAll({ orderByField: 'fechaCreacion', orderDirection: 'desc' });
  }

  /** Resumen de deuda total con semanas estimadas para liquidar cada préstamo */
  async getResumenDeuda(): Promise<ResumenDeuda> {
    const activos = await this.getAll({
      filters: [{ field: 'estado', operator: '==', value: 'activo' }],
      orderByField: 'fechaCreacion',
      orderDirection: 'desc',
    });

    const prestamosConSemanas: PrestamoConSemanasRestantes[] = activos.map((p) => ({
      ...p,
      semanasRestantes: p.descuentoSemanal > 0
        ? Math.ceil(p.saldoPendiente / p.descuentoSemanal)
        : null,
    }));

    const totalDeuda = activos.reduce((acc, p) => acc + p.saldoPendiente, 0);
    const totalEmpleadosConDeuda = new Set(activos.map((p) => p.empleadoId)).size;

    return { prestamosActivos: prestamosConSemanas, totalDeuda, totalEmpleadosConDeuda };
  }

  async crear(data: NuevoPrestamo): Promise<string> {
    return this.create(data);
  }

  /**
   * Aplica el descuento semanal al préstamo y registra el movimiento en
   * HistorialDescuentoPrestamo para auditoría.
   * Devuelve el monto realmente descontado.
   */
  async aplicarDescuentoSemanal(prestamoId: string): Promise<number> {
    const prestamo = await this.getById(prestamoId);
    if (!prestamo) throw new Error('Préstamo no encontrado');
    if (prestamo.estado !== 'activo') throw new Error('El préstamo no está activo');

    const montoDescontado = Math.min(prestamo.descuentoSemanal, prestamo.saldoPendiente);
    const nuevoSaldo      = prestamo.saldoPendiente - montoDescontado;
    const nuevoEstado: EstadoPrestamo = nuevoSaldo <= 0 ? 'saldado' : 'activo';

    await this.update(prestamoId, {
      saldoPendiente: nuevoSaldo,
      estado:         nuevoEstado,
    } as Partial<Prestamo>);

    await registrarDescuentoEnHistorial({
      prestamoId,
      empleadoId:     prestamo.empleadoId,
      empleadoNombre: prestamo.empleadoNombre,
      monto:          montoDescontado,
      saldoAntes:     prestamo.saldoPendiente,
      saldoDespues:   nuevoSaldo,
      fechaAplicacion: Timestamp.now(),
    });

    return montoDescontado;
  }

  async saldar(prestamoId: string): Promise<void> {
    const prestamo = await this.getById(prestamoId);
    if (prestamo && prestamo.saldoPendiente > 0) {
      await registrarDescuentoEnHistorial({
        prestamoId,
        empleadoId:     prestamo.empleadoId,
        empleadoNombre: prestamo.empleadoNombre,
        monto:          prestamo.saldoPendiente,
        saldoAntes:     prestamo.saldoPendiente,
        saldoDespues:   0,
        fechaAplicacion: Timestamp.now(),
      });
    }
    await this.update(prestamoId, {
      saldoPendiente: 0,
      estado:         'saldado',
    } as Partial<Prestamo>);
  }

  async cancelar(prestamoId: string): Promise<void> {
    await this.update(prestamoId, { estado: 'cancelado' } as Partial<Prestamo>);
  }
}

export const prestamosService = new PrestamosService();
