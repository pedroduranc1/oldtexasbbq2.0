import { BaseService } from './base.service';
import { TurnoEmpleado, NuevoTurnoEmpleado } from '@/lib/types/firestore';

class TurnosEmpleadoService extends BaseService<TurnoEmpleado> {
  constructor() {
    super('TurnosEmpleado');
  }

  /** Devuelve todos los registros de un turno específico. */
  async getPorTurno(turnoId: string): Promise<TurnoEmpleado[]> {
    return this.search([{ field: 'turnoId', operator: '==', value: turnoId }]);
  }

  /** Devuelve todos los turnos en los que participó un empleado. */
  async getPorEmpleado(empleadoId: string): Promise<TurnoEmpleado[]> {
    return this.getAll({
      filters: [{ field: 'empleadoId', operator: '==', value: empleadoId }],
      orderByField: 'fechaCreacion',
      orderDirection: 'desc',
    });
  }

  /** Registra la entrada de un empleado al turno activo. */
  async registrarEntrada(data: NuevoTurnoEmpleado): Promise<string> {
    return this.create(data);
  }

  /** Registra la salida y calcula los minutos trabajados. */
  async registrarSalida(id: string, horaSalida: string): Promise<void> {
    const registro = await this.getById(id);
    let minutosTrabajados: number | undefined;

    if (registro?.horaEntrada) {
      const [hE, mE] = registro.horaEntrada.split(':').map(Number);
      const [hS, mS] = horaSalida.split(':').map(Number);
      minutosTrabajados = (hS * 60 + mS) - (hE * 60 + mE);
      if (minutosTrabajados < 0) minutosTrabajados += 24 * 60; // turno nocturno
    }

    await this.update(id, { horaSalida, minutosTrabajados } as any);
  }
}

export const turnosEmpleadoService = new TurnosEmpleadoService();
