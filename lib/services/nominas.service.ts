import { BaseService } from './base.service';
import {
  Nomina,
  NuevaNomina,
  Empleado,
  PeriodoNomina,
  DiasSemana,
  ValorAsistencia,
} from '@/lib/types/firestore';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

// ============================================================================
// Parámetros extendidos para generarNomina con conceptos individuales
// ============================================================================

export interface ConceptosNomina {
  // Bonos
  bonoPA?: number;
  bonoLimpieza?: number;
  comisiones?: number;
  tiempoExtra?: number;
  // Descuentos
  adelantoSueldo?: number;
  descuentoPrestamo?: number;
  descuentoComida?: number;
  faltantesCaja?: number;
  fondoAhorro?: number;
  // Asistencia
  totalDias?: number;
  asistencias?: Partial<Record<DiasSemana, ValorAsistencia>>;
  // Nota libre
  notas?: string;
}

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

  /**
   * Crea una nómina pendiente.
   *
   * Cálculo del salario:
   *   - Si el empleado tiene `salarioDiario` y se provee `conceptos.totalDias`:
   *       salarioCalculado = salarioDiario × totalDias
   *   - En caso contrario usa `salarioBase` (legado / compatibilidad)
   *
   * totalNeto = salarioCalculado
   *           + (bonoPA + bonoLimpieza + comisiones + tiempoExtra + bonosLegado)
   *           - (adelantoSueldo + descuentoPrestamo + descuentoComida + faltantesCaja + fondoAhorro + descuentosLegado)
   */
  async generarNomina(
    empleado: Empleado,
    periodoInicio: Date,
    bonosLegado = 0,
    descuentosLegado = 0,
    notasLegado?: string,
    conceptos?: ConceptosNomina,
  ): Promise<string> {
    const periodoFin = calcularFinPeriodo(periodoInicio, empleado.periodoPago);

    // Salario: usar salarioDiario × días si están disponibles
    const usarSalarioDiario =
      !!empleado.salarioDiario &&
      conceptos?.totalDias !== undefined &&
      conceptos.totalDias >= 0;

    const salarioCalculado = usarSalarioDiario
      ? (empleado.salarioDiario ?? 0) * (conceptos!.totalDias ?? 0)
      : empleado.salarioBase;

    // Bonos
    const bonoPA       = conceptos?.bonoPA       ?? 0;
    const bonoLimpieza = conceptos?.bonoLimpieza ?? 0;
    const comisiones   = conceptos?.comisiones   ?? 0;
    const tiempoExtra  = conceptos?.tiempoExtra  ?? 0;
    const sumaBonos    = bonoPA + bonoLimpieza + comisiones + tiempoExtra + bonosLegado;

    // Descuentos
    const adelantoSueldo    = conceptos?.adelantoSueldo    ?? 0;
    const descuentoPrestamo = conceptos?.descuentoPrestamo ?? 0;
    const descuentoComida   = conceptos?.descuentoComida   ?? 0;
    const faltantesCaja     = conceptos?.faltantesCaja     ?? 0;
    const fondoAhorro       = conceptos?.fondoAhorro       ?? 0;
    const sumaDescuentos    =
      adelantoSueldo + descuentoPrestamo + descuentoComida +
      faltantesCaja + fondoAhorro + descuentosLegado;

    const totalNeto = salarioCalculado + sumaBonos - sumaDescuentos;
    const notas     = conceptos?.notas ?? notasLegado;

    const data: NuevaNomina = {
      empleadoId:     empleado.id,
      empleadoNombre: empleado.nombre,
      cargo:          empleado.cargo,
      periodoInicio:  format(periodoInicio, 'yyyy-MM-dd'),
      periodoFin:     format(periodoFin, 'yyyy-MM-dd'),
      periodoPago:    empleado.periodoPago,
      salarioBase:    salarioCalculado,
      bonos:          sumaBonos,
      descuentos:     sumaDescuentos,
      totalNeto,
      estado:         'pendiente',
      // Campos desglosados — solo se incluyen si tienen valor
      ...(conceptos?.totalDias !== undefined ? { totalDias: conceptos.totalDias } : {}),
      ...(conceptos?.asistencias             ? { asistencias: conceptos.asistencias } : {}),
      ...(bonoPA          ? { bonoPA }          : {}),
      ...(bonoLimpieza    ? { bonoLimpieza }    : {}),
      ...(comisiones      ? { comisiones }      : {}),
      ...(tiempoExtra     ? { tiempoExtra }     : {}),
      ...(adelantoSueldo    ? { adelantoSueldo }    : {}),
      ...(descuentoPrestamo ? { descuentoPrestamo } : {}),
      ...(descuentoComida   ? { descuentoComida }   : {}),
      ...(faltantesCaja     ? { faltantesCaja }     : {}),
      ...(fondoAhorro       ? { fondoAhorro }       : {}),
      ...(notas             ? { notas }             : {}),
    };

    return this.create(data);
  }

  /**
   * Devuelve todas las nóminas de un período con sus campos desglosados,
   * más totales acumulados por concepto para la tabla de reporte.
   */
  async getResumenPorPeriodo(inicio: string, fin: string): Promise<ResumenNominaPeriodo> {
    const nominas = await this.getPorPeriodo(inicio, fin);

    const totales: ResumenNominaTotales = {
      salarioBase: 0,
      bonoPA: 0, bonoLimpieza: 0, comisiones: 0, tiempoExtra: 0,
      adelantoSueldo: 0, descuentoPrestamo: 0, descuentoComida: 0,
      faltantesCaja: 0, fondoAhorro: 0,
      totalNeto: 0,
    };

    for (const n of nominas) {
      totales.salarioBase      += n.salarioBase       ?? 0;
      totales.bonoPA           += n.bonoPA            ?? 0;
      totales.bonoLimpieza     += n.bonoLimpieza      ?? 0;
      totales.comisiones       += n.comisiones        ?? 0;
      totales.tiempoExtra      += n.tiempoExtra       ?? 0;
      totales.adelantoSueldo   += n.adelantoSueldo    ?? 0;
      totales.descuentoPrestamo += n.descuentoPrestamo ?? 0;
      totales.descuentoComida  += n.descuentoComida   ?? 0;
      totales.faltantesCaja    += n.faltantesCaja     ?? 0;
      totales.fondoAhorro      += n.fondoAhorro       ?? 0;
      totales.totalNeto        += n.totalNeto         ?? 0;
    }

    return { nominas, totales };
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

function calcularFinPeriodo(inicio: Date, periodo: PeriodoNomina | undefined): Date {
  switch (periodo) {
    case 'quincenal': return addDays(inicio, 14);
    case 'mensual':   return addDays(addMonths(inicio, 1), -1);
    default:          return addDays(addWeeks(inicio, 1), -1);
  }
}

export interface ResumenNominaTotales {
  salarioBase: number;
  bonoPA: number; bonoLimpieza: number; comisiones: number; tiempoExtra: number;
  adelantoSueldo: number; descuentoPrestamo: number; descuentoComida: number;
  faltantesCaja: number; fondoAhorro: number;
  totalNeto: number;
}

export interface ResumenNominaPeriodo {
  nominas: Nomina[];
  totales: ResumenNominaTotales;
}

export const nominasService = new NominasService();
