/**
 * Integration Test: Fase 4 — Sistema de Nómina integrado
 * Old Texas BBQ - CRM
 *
 * Cubre el checklist de "Testing" de la Fase 4 en docs/TODO 2.0.md:
 *   1. Crear empleado y verificar en BD
 *   2. Generar nómina y validar cálculos (salarioBase + bonos - descuentos, periodoFin)
 *   3. Pagar nómina y verificar egreso en caja (integración Nómina → MovimientosCaja)
 *
 * Estrategia: mocks con jest global (no @jest/globals), accediendo a los mocks
 * via require() después de jest.mock() para conservar la referencia mutable.
 */

jest.mock('@/lib/firebase/config', () => ({
  db:   { app: {}, type: 'firestore' },
  auth: {},
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps:       jest.fn(() => [{ name: '[DEFAULT]' }]),
  getApp:        jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/auth',    () => ({ getAuth:    jest.fn(() => ({})) }));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn(() => ({})) }));
jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  isSupported:  jest.fn(() => Promise.resolve(false)),
}));

jest.mock('firebase/firestore', () => ({
  collection:      jest.fn(() => ({ id: 'col', path: 'col', type: 'collection' })),
  doc:             jest.fn((_db: any, col: string, id: string) => ({ path: `${col}/${id}` })),
  addDoc:          jest.fn(),
  getDoc:          jest.fn(),
  getDocs:         jest.fn(),
  updateDoc:       jest.fn(),
  setDoc:          jest.fn(),
  deleteDoc:       jest.fn(),
  query:           jest.fn((...a: any[]) => ({ type: 'query', a })),
  where:           jest.fn((f: any, op: any, v: any) => ({ f, op, v })),
  orderBy:         jest.fn((f: any, dir: any) => ({ f, dir })),
  limit:           jest.fn((n: any) => ({ n })),
  startAfter:      jest.fn(),
  onSnapshot:      jest.fn(() => () => {}),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  writeBatch:      jest.fn(() => ({ set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() })),
  runTransaction:  jest.fn(),
  Timestamp: {
    now:      jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((d: Date) => ({ seconds: d.getTime() / 1000, nanoseconds: 0 })),
  },
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
}));

// Acceso a los mocks via require (después de jest.mock, antes de imports reales)
const firestore = require('firebase/firestore');
const mockAddDoc    = firestore.addDoc    as jest.Mock;
const mockGetDocs   = firestore.getDocs   as jest.Mock;
const mockUpdateDoc = firestore.updateDoc as jest.Mock;

// Imports de servicios (después de todos los mocks)
import { empleadosService } from '@/lib/services/empleados.service';
import { nominasService }   from '@/lib/services/nominas.service';
import { pagarNomina }      from '@/lib/services/integracionCaja.service';
import type { Empleado }    from '@/lib/types/firestore';

// ============================================================================
// HELPERS
// ============================================================================

function snap(items: Array<{ id: string; data: Record<string, any> }>) {
  return {
    empty: items.length === 0,
    docs:  items.map((it) => ({ id: it.id, data: () => it.data })),
  };
}

const EMPLEADO_BASE: Omit<Empleado, 'id' | 'fechaCreacion' | 'fechaActualizacion'> = {
  nombre:            'María González',
  cargo:             'cajera',
  salarioBase:       3_500,
  periodoPago:       'semanal',
  fechaContratacion: '2026-01-10',
  estado:            'activo',
};

const EMPLEADO: Empleado = {
  id: 'emp-001',
  ...EMPLEADO_BASE,
  fechaCreacion:      { seconds: 0, nanoseconds: 0 } as any,
  fechaActualizacion: { seconds: 0, nanoseconds: 0 } as any,
};

beforeEach(() => jest.clearAllMocks());

// ============================================================================
// 1. CREAR EMPLEADO Y VERIFICAR EN BD
// ============================================================================

describe('Fase 4 — Nómina: crear empleado y verificar en BD', () => {
  it('persiste el empleado con los campos correctos y devuelve su id', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'emp-001' });

    const id = await empleadosService.crear({ ...EMPLEADO_BASE });

    expect(id).toBe('emp-001');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const docData = mockAddDoc.mock.calls[0][1];
    expect(docData.nombre).toBe('María González');
    expect(docData.cargo).toBe('cajera');
    expect(docData.salarioBase).toBe(3_500);
    expect(docData.periodoPago).toBe('semanal');
    expect(docData.estado).toBe('activo');
    expect(docData.fechaCreacion).toBe('SERVER_TIMESTAMP');
    expect(docData.fechaActualizacion).toBe('SERVER_TIMESTAMP');
  });

  it('getActivos consulta Firestore y devuelve la lista de empleados', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snap([
        { id: 'emp-001', data: { ...EMPLEADO_BASE, estado: 'activo' } },
        { id: 'emp-002', data: { ...EMPLEADO_BASE, nombre: 'Juan Cocinero', cargo: 'cocinero', estado: 'activo' } },
      ]),
    );

    const activos = await empleadosService.getActivos();

    expect(activos).toHaveLength(2);
    expect(activos[0].id).toBe('emp-001');
    expect(activos[1].nombre).toBe('Juan Cocinero');
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('cambiarEstado llama updateDoc con el estado correcto', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await empleadosService.cambiarEstado('emp-001', 'inactivo');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateArg = mockUpdateDoc.mock.calls[0][1];
    expect(updateArg.estado).toBe('inactivo');
    expect(updateArg.fechaActualizacion).toBe('SERVER_TIMESTAMP');
  });

  it('actualizar empleado persiste los campos enviados más fechaActualizacion', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await empleadosService.actualizar('emp-001', { salarioBase: 4_000, notas: 'Aumento julio' });

    const updateArg = mockUpdateDoc.mock.calls[0][1];
    expect(updateArg.salarioBase).toBe(4_000);
    expect(updateArg.notas).toBe('Aumento julio');
    expect(updateArg.fechaActualizacion).toBe('SERVER_TIMESTAMP');
  });
});

// ============================================================================
// 2. GENERAR NÓMINA Y VALIDAR CÁLCULOS
// ============================================================================

describe('Fase 4 — Nómina: generar nómina y validar cálculos', () => {
  it('totalNeto = salarioBase + bonos - descuentos', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'nom-001' });

    const id = await nominasService.generarNomina(
      EMPLEADO,
      new Date('2026-07-28T12:00:00'),
      200,  // bonos
      100,  // descuentos
    );

    expect(id).toBe('nom-001');
    const docData = mockAddDoc.mock.calls[0][1];
    expect(docData.salarioBase).toBe(3_500);
    expect(docData.bonos).toBe(200);
    expect(docData.descuentos).toBe(100);
    expect(docData.totalNeto).toBe(3_600); // 3500 + 200 - 100
    expect(docData.estado).toBe('pendiente');
    expect(docData.empleadoId).toBe('emp-001');
    expect(docData.empleadoNombre).toBe('María González');
  });

  it('periodoFin semanal = periodoInicio + 6 días', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'nom-002' });

    await nominasService.generarNomina(EMPLEADO, new Date('2026-07-28T12:00:00'));

    const docData = mockAddDoc.mock.calls[0][1];
    expect(docData.periodoInicio).toBe('2026-07-28');
    expect(docData.periodoFin).toBe('2026-08-03'); // +7 días -1
  });

  it('periodoFin quincenal = periodoInicio + 14 días', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'nom-003' });
    const quincenal: Empleado = { ...EMPLEADO, periodoPago: 'quincenal' };

    await nominasService.generarNomina(quincenal, new Date('2026-07-01T12:00:00'));

    const docData = mockAddDoc.mock.calls[0][1];
    expect(docData.periodoInicio).toBe('2026-07-01');
    expect(docData.periodoFin).toBe('2026-07-15');
  });

  it('periodoFin mensual = último día del mismo mes', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'nom-004' });
    const mensual: Empleado = { ...EMPLEADO, periodoPago: 'mensual' };

    await nominasService.generarNomina(mensual, new Date('2026-07-01T12:00:00'));

    const docData = mockAddDoc.mock.calls[0][1];
    expect(docData.periodoInicio).toBe('2026-07-01');
    expect(docData.periodoFin).toBe('2026-07-31');
  });

  it('totalNeto sin bonos ni descuentos es igual al salarioBase', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'nom-005' });

    await nominasService.generarNomina(EMPLEADO, new Date('2026-07-28T12:00:00'));

    const docData = mockAddDoc.mock.calls[0][1];
    expect(docData.totalNeto).toBe(EMPLEADO.salarioBase);
    expect(docData.bonos).toBe(0);
    expect(docData.descuentos).toBe(0);
  });

  it('getPendientes consulta Firestore y devuelve nóminas pendientes', async () => {
    mockGetDocs.mockResolvedValueOnce(snap([
      { id: 'nom-001', data: { estado: 'pendiente', totalNeto: 3_500, empleadoNombre: 'María González' } },
      { id: 'nom-002', data: { estado: 'pendiente', totalNeto: 2_800, empleadoNombre: 'Juan Repartidor' } },
    ]));

    const pendientes = await nominasService.getPendientes();

    expect(pendientes).toHaveLength(2);
    expect(pendientes[0].estado).toBe('pendiente');
    expect(pendientes[1].totalNeto).toBe(2_800);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 3. PAGAR NÓMINA Y VERIFICAR EGRESO EN CAJA
//    + Criterio: totalNeto en Nómina == monto del egreso en MovimientosCaja
// ============================================================================

describe('Fase 4 — Nómina: pagar nómina y verificar egreso en caja', () => {
  it('pagarNomina registra egreso en caja con el monto exacto de la nómina', async () => {
    // getTurnoActivo → turno abierto
    mockGetDocs.mockResolvedValueOnce(
      snap([{ id: 'turno-hoy', data: { estado: 'abierto', tipo: 'matutino' } }]),
    );
    // registrarMovimiento → addDoc en MovimientosCaja
    mockAddDoc.mockResolvedValueOnce({ id: 'mov-nom-001' });
    // nominasService.marcarPagada → updateDoc
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const totalNeto = 3_600;

    await pagarNomina({
      nominaId:       'nom-001',
      empleadoNombre: 'María González',
      monto:          totalNeto,
      usuarioId:      'uid-encargado',
      usuarioNombre:  'Carlos Encargado',
    });

    // El egreso se registró en MovimientosCaja con el monto correcto
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const movData = mockAddDoc.mock.calls[0][1];
    expect(movData.tipo).toBe('egreso');
    expect(movData.concepto).toBe('Pago de nómina');
    expect(movData.monto).toBe(totalNeto);           // consistencia Nómina ↔ Caja
    expect(movData.descripcion).toContain('María González');
    expect(movData.turno_id).toBe('turno-hoy');

    // La nómina quedó marcada como pagada
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.estado).toBe('pagada');
    expect(updateData.movimientoCajaId).toBe('mov-nom-001');
    expect(updateData.turnoId).toBe('turno-hoy');
    expect(updateData.pagadoPor).toBe('uid-encargado');
    expect(updateData.pagadoPorNombre).toBe('Carlos Encargado');
  });

  it('pagarNomina lanza error si no hay turno activo', async () => {
    // getTurnoActivo → sin resultados
    mockGetDocs.mockResolvedValueOnce(snap([]));

    await expect(
      pagarNomina({
        nominaId:       'nom-002',
        empleadoNombre: 'Juan Repartidor',
        monto:          2_800,
        usuarioId:      'uid-admin',
        usuarioNombre:  'Admin',
      }),
    ).rejects.toThrow('No hay turno activo');

    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('cancelar nómina actualiza estado a cancelada sin tocar caja', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await nominasService.cancelar('nom-003');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.estado).toBe('cancelada');
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('el monto del egreso en caja es consistente con el totalNeto de la nómina generada', async () => {
    // Flujo completo: generarNomina → pagarNomina
    const salarioBase = 4_000;
    const bonos       = 500;
    const descuentos  = 200;
    const totalNeto   = salarioBase + bonos - descuentos; // 4_300

    // Paso 1: generarNomina
    mockAddDoc.mockResolvedValueOnce({ id: 'nom-flex-001' });
    const empleado: Empleado = {
      id: 'emp-002', nombre: 'Luis Cocinero', cargo: 'cocinero',
      salarioBase, periodoPago: 'quincenal', fechaContratacion: '2026-03-01',
      estado: 'activo',
      fechaCreacion:      { seconds: 0, nanoseconds: 0 } as any,
      fechaActualizacion: { seconds: 0, nanoseconds: 0 } as any,
    };

    await nominasService.generarNomina(empleado, new Date('2026-07-15T12:00:00'), bonos, descuentos);
    const nominaDoc = mockAddDoc.mock.calls[0][1];
    expect(nominaDoc.totalNeto).toBe(totalNeto);

    jest.clearAllMocks();

    // Paso 2: pagarNomina usando el totalNeto calculado
    mockGetDocs.mockResolvedValueOnce(
      snap([{ id: 'turno-activo', data: { estado: 'abierto', tipo: 'vespertino' } }]),
    );
    mockAddDoc.mockResolvedValueOnce({ id: 'mov-flex-001' });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await pagarNomina({
      nominaId:       'nom-flex-001',
      empleadoNombre: empleado.nombre,
      monto:          nominaDoc.totalNeto,  // mismo valor que guardó la nómina
      usuarioId:      'uid-encargado',
      usuarioNombre:  'Encargado',
    });

    const egresoDoc = mockAddDoc.mock.calls[0][1];
    // CONSISTENCIA: egreso en caja == totalNeto en nómina
    expect(egresoDoc.monto).toBe(totalNeto);
    expect(egresoDoc.monto).toBe(nominaDoc.totalNeto);
  });
});
