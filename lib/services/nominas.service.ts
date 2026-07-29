import { BaseService } from './base.service';
import { Nomina, NuevaNomina, Empleado, PeriodoNomina } from '@/lib/types/firestore';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

class NominasService extends BaseService<Nomina> {
  constructor() {
    super('Nominas');
  }

  async getPorEmpleado(empleadoId: string): Promise<Nomina[]> {
    return this.getAll({
      filters: [{ field: 'empleadoId', operator: '==', value: empleadoId }],
      orderByField: 'periodoInicio',
      orderDirection: 'desc',
    });
  }

  async getPendientes(): Promise<Nomina[]> {
    return this.search([{ field: 'estado', operator: '==', value: 'pendiente' }]);
  }

  async getPorPeriodo(inicio: string, fin: string): Promise<Nomina[]> {
    return this.getAll({
      filters: [
        { field: 'periodoInicio', operator: '>=', value: inicio },
        { field: 'periodoInicio', operator: '<=', value: fin },
      ],
      orderByField: 'periodoInicio',
      orderDirection: 'desc',
    });
  }

  /** Crea una nómina pendiente para un empleado dado un periodo. */
  async generarNomina(
    empleado: Empleado,
    periodoInicio: Date,
    bonos = 0,
    descuentos = 0,
    notas?: string,
  ): Promise<string> {
    const periodoFin = calcularFinPeriodo(periodoInicio, empleado.periodoPago);
    const totalNeto = empleado.salarioBase + bonos - descuentos;

    const data: NuevaNomina = {
      empleadoId: empleado.id,
      empleadoNombre: empleado.nombre,
      cargo: empleado.cargo,
      periodoInicio: format(periodoInicio, 'yyyy-MM-dd'),
      periodoFin: format(periodoFin, 'yyyy-MM-dd'),
      periodoPago: empleado.periodoPago,
      salarioBase: empleado.salarioBase,
      bonos,
      descuentos,
      totalNeto,
      estado: 'pendiente',
      notas,
    };

    return this.create(data);
  }

  /** Marca la nómina como pagada y guarda la referencia al movimiento de caja. */
  async marcarPagada(
    nominaId: string,
    movimientoCajaId: string,
    turnoId: string,
    pagadoPor: string,
    pagadoPorNombre: string,
  ): Promise<void> {
    const { Timestamp } = await import('firebase/firestore');
    await this.update(nominaId, {
      estado: 'pagada',
      movimientoCajaId,
      turnoId,
      pagadoPor,
      pagadoPorNombre,
      fechaPago: Timestamp.now(),
    } as any);
  }

  async cancelar(nominaId: string): Promise<void> {
    await this.update(nominaId, { estado: 'cancelada' } as any);
  }
}

function calcularFinPeriodo(inicio: Date, periodo: PeriodoNomina): Date {
  switch (periodo) {
    case 'semanal':    return addDays(addWeeks(inicio, 1), -1);
    case 'quincenal':  return addDays(inicio, 14);
    case 'mensual':    return addDays(addMonths(inicio, 1), -1);
  }
}

export const nominasService = new NominasService();
