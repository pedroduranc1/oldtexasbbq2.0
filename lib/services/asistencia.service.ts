import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { BaseService } from './base.service';
import {
  AsistenciaSemanal,
  NuevaAsistenciaSemanal,
  DiasSemana,
  ValorAsistencia,
} from '@/lib/types/firestore';

export const DIAS_SEMANA: DiasSemana[] = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];

export const LABELS_DIA: Record<DiasSemana, string> = {
  L:  'Lun',
  M:  'Mar',
  Mi: 'Mié',
  J:  'Jue',
  V:  'Vie',
  S:  'Sáb',
  D:  'Dom',
};

export const LABELS_ASISTENCIA: Record<ValorAsistencia, string> = {
  A: 'Asistió',
  D: 'Descanso',
  V: 'Vacaciones',
  F: 'Falta',
};

export const COLORES_ASISTENCIA: Record<ValorAsistencia, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  D: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  V: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  F: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/** Calcula el lunes de la semana que contiene la fecha dada */
export function getLunesDeSemana(fecha: Date): Date {
  return startOfWeek(fecha, { weekStartsOn: 1 });
}

/** Calcula el domingo de la semana que contiene la fecha dada */
export function getDomingoDeSemana(fecha: Date): Date {
  return endOfWeek(fecha, { weekStartsOn: 1 });
}

/** Genera un array de 7 fechas (L→D) para la semana que contiene `fecha` */
export function getFechasDeSemana(semanaInicio: Date): Date[] {
  return DIAS_SEMANA.map((_, i) => addDays(semanaInicio, i));
}

/** Cuenta cuántos días tienen valor 'A' en el mapa de asistencias */
export function contarDiasTrabajados(
  asistencias: Partial<Record<DiasSemana, ValorAsistencia>>,
): number {
  return DIAS_SEMANA.filter((d) => asistencias[d] === 'A').length;
}

class AsistenciaService extends BaseService<AsistenciaSemanal> {
  constructor() {
    super('AsistenciaSemanal');
  }

  /** Obtiene la asistencia de un empleado para la semana que comienza en `semanaInicio` (YYYY-MM-DD) */
  async getPorEmpleadoYSemana(
    empleadoId: string,
    semanaInicio: string,
  ): Promise<AsistenciaSemanal | null> {
    const resultados = await this.search([
      { field: 'empleadoId',   operator: '==', value: empleadoId },
      { field: 'semanaInicio', operator: '==', value: semanaInicio },
    ]);
    return resultados[0] ?? null;
  }

  /** Historial de asistencias de un empleado, ordenado desc */
  async getPorEmpleado(empleadoId: string): Promise<AsistenciaSemanal[]> {
    return this.getAll({
      filters: [{ field: 'empleadoId', operator: '==', value: empleadoId }],
      orderByField: 'semanaInicio',
      orderDirection: 'desc',
    });
  }

  /** Asistencias de la semana actual para todos los empleados */
  async getPorSemana(semanaInicio: string): Promise<AsistenciaSemanal[]> {
    return this.search([
      { field: 'semanaInicio', operator: '==', value: semanaInicio },
    ]);
  }

  /**
   * Crea o actualiza el registro de asistencia de una semana completa.
   * Si ya existe un documento para ese empleado+semana, lo actualiza.
   */
  async guardarSemana(data: NuevaAsistenciaSemanal): Promise<string> {
    const existente = await this.getPorEmpleadoYSemana(
      data.empleadoId,
      data.semanaInicio,
    );

    const totalDias = contarDiasTrabajados(data.asistencias);
    const payload = { ...data, totalDias };

    if (existente) {
      await this.actualizar(existente.id, payload);
      return existente.id;
    }

    return this.create(payload);
  }

  /**
   * Actualiza un solo día dentro de un registro existente.
   * Si no existe el registro, lo crea con solo ese día marcado.
   */
  async marcarDia(
    empleadoId: string,
    empleadoNombre: string,
    semanaInicio: string,
    semanaFin: string,
    dia: DiasSemana,
    valor: ValorAsistencia,
  ): Promise<string> {
    const existente = await this.getPorEmpleadoYSemana(empleadoId, semanaInicio);

    if (existente) {
      const nuevasAsistencias = { ...existente.asistencias, [dia]: valor };
      const totalDias = contarDiasTrabajados(nuevasAsistencias);
      await this.actualizar(existente.id, { asistencias: nuevasAsistencias, totalDias });
      return existente.id;
    }

    const asistencias: Partial<Record<DiasSemana, ValorAsistencia>> = { [dia]: valor };
    return this.create({
      empleadoId,
      empleadoNombre,
      semanaInicio,
      semanaFin,
      asistencias,
      totalDias: valor === 'A' ? 1 : 0,
    });
  }

  /**
   * Devuelve las últimas N semanas de asistencia de un empleado (o de todos
   * si empleadoId es null) con una tasa de asistencia calculada por semana.
   */
  async getResumenMultiSemana(
    empleadoId: string | null,
    cantSemanas: number,
  ): Promise<ResumenAsistenciaSemana[]> {
    const hoy   = new Date();
    const lunes = getLunesDeSemana(hoy);

    // Generar las N semanas hacia atrás (más reciente primero)
    const semanas: string[] = [];
    for (let i = 0; i < cantSemanas; i++) {
      semanas.push(format(addDays(lunes, -7 * i), 'yyyy-MM-dd'));
    }

    const registros = empleadoId
      ? await this.getPorEmpleado(empleadoId)
      : await this.getAll({ orderByField: 'semanaInicio', orderDirection: 'desc' });

    return semanas.map((semana) => {
      const delaSemana = registros.filter((r) => r.semanaInicio === semana);
      const totalEmpleados = delaSemana.length;
      const totalDiasTrabajados = delaSemana.reduce((acc, r) => acc + r.totalDias, 0);
      const diasPosibles = totalEmpleados * 7;
      const tasaAsistencia = diasPosibles > 0
        ? Math.round((totalDiasTrabajados / diasPosibles) * 100)
        : null;

      return {
        semanaInicio: semana,
        registros:   delaSemana,
        totalEmpleados,
        totalDiasTrabajados,
        tasaAsistencia,
      };
    });
  }

  private async actualizar(
    id: string,
    data: Partial<Omit<AsistenciaSemanal, 'id' | 'fechaCreacion' | 'fechaActualizacion'>>,
  ): Promise<void> {
    return this.update(id, data);
  }
}

export interface ResumenAsistenciaSemana {
  semanaInicio: string;
  registros: AsistenciaSemanal[];
  totalEmpleados: number;
  totalDiasTrabajados: number;
  tasaAsistencia: number | null;
}

export const asistenciaService = new AsistenciaService();
