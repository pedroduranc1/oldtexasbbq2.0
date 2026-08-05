import { BaseService } from './base.service';
import { Empleado, NuevoEmpleado, EstadoEmpleado } from '@/lib/types/firestore';

const CAMPOS_OPCIONALES: (keyof NuevoEmpleado)[] = [
  'telefono',
  'notas',
  'salarioDiario',
  'jornada',
  'sucursal',
  'bonoPermanenciaFecha',
  'curp',
  'rfc',
  'nss',
  'fechaNacimiento',
  'direccion',
  'contactoEmergencia',
  'usuarioId',
];

function limpiarUndefined(data: Partial<NuevoEmpleado>): Partial<NuevoEmpleado> {
  const clean = { ...data } as Record<string, unknown>;
  for (const campo of CAMPOS_OPCIONALES) {
    if (clean[campo] === undefined) delete clean[campo];
  }
  return clean as Partial<NuevoEmpleado>;
}

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
    return this.create(limpiarUndefined(data) as NuevoEmpleado);
  }

  async actualizar(id: string, data: Partial<NuevoEmpleado>): Promise<void> {
    return this.update(id, limpiarUndefined(data));
  }

  async cambiarEstado(id: string, estado: EstadoEmpleado): Promise<void> {
    return this.update(id, { estado } as any);
  }
}

export const empleadosService = new EmpleadosService();
