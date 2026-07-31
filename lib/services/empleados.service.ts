import { BaseService } from './base.service';
import { Empleado, NuevoEmpleado, EstadoEmpleado } from '@/lib/types/firestore';

class EmpleadosService extends BaseService<Empleado> {
  constructor() {
    super('Empleados');
  }

  async getActivos(): Promise<Empleado[]> {
    return this.search([{ field: 'estado', operator: '==', value: 'activo' }]);
  }

  async getTodos(): Promise<Empleado[]> {
    return this.getAll({ orderByField: 'nombre', orderDirection: 'asc' });
  }

  async crear(data: NuevoEmpleado): Promise<string> {
    const clean = { ...data };
    if (clean.telefono === undefined) delete clean.telefono;
    if (clean.notas    === undefined) delete clean.notas;
    return this.create(clean);
  }

  async actualizar(id: string, data: Partial<NuevoEmpleado>): Promise<void> {
    const clean = { ...data };
    if (clean.telefono === undefined) delete clean.telefono;
    if (clean.notas    === undefined) delete clean.notas;
    return this.update(id, clean);
  }

  async cambiarEstado(id: string, estado: EstadoEmpleado): Promise<void> {
    return this.update(id, { estado } as any);
  }
}

export const empleadosService = new EmpleadosService();
