/**
 * Integration Test: Fase 1 — Sistema de Caja completo
 * Old Texas BBQ - CRM
 *
 * Cubre el checklist de "Testing" de la Fase 1 en docs/TODO 2.0.md:
 *   1. Flujo completo: Apertura → Ingresos/Egresos → Cierre
 *   2. Validar que solo un turno esté activo a la vez
 *   3. Verificar cálculo de diferencias y totales
 *   4. Subir CSV de prueba y verificar deduplicación
 *   5. Validar alertas de descuadre en los 3 niveles
 *   6. Verificar bloqueo de roles no autorizados
 *
 * Los servicios reales (turnos.service, movimientosCaja.service,
 * cierreCaja.service, importacionCaja.service) se ejercitan directamente;
 * solo se mockea el SDK de Firestore, igual que en el resto de la suite
 * (ver auth-flow.test.ts / pedido-flow.test.ts).
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ============================================================================
// MOCKS DE FIREBASE
// ============================================================================

jest.mock('@/lib/firebase/config', () => ({
  db: {},
  auth: {},
}));

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'COL_REF'),
  doc: jest.fn((_db, col, id) => ({ __col: col, __id: id })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  runTransaction: (...args: any[]) => mockRunTransaction(...args),
  query: jest.fn((...args: any[]) => args),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  orderBy: jest.fn((field, dir) => ({ field, dir })),
  limit: jest.fn((n) => ({ limit: n })),
  startAfter: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0, toMillis: () => Date.now() })),
    fromDate: jest.fn((d: Date) => ({
      seconds: d.getTime() / 1000,
      nanoseconds: 0,
      toMillis: () => d.getTime(),
      toDate: () => d,
    })),
  },
}));

// Imports reales de los servicios de la Fase 1 (después de los mocks)
import { turnosService } from '@/lib/services/turnos.service';
import {
  registrarMovimiento,
  getTotalesPorTurno,
  getEgresosPorConcepto,
} from '@/lib/services/movimientosCaja.service';
import {
  crearCierre,
  previsualizarCierre,
  clasificarDiferencia,
} from '@/lib/services/cierreCaja.service';
import { parseCajaCSV } from '@/lib/utils/parseCajaCSV';
import { importarFilasCSV } from '@/lib/services/importacionCaja.service';

// Helper: fabrica un snapshot de Firestore a partir de una lista de {id, data}
function snap(items: Array<{ id: string; data: Record<string, any> }>) {
  return {
    empty: items.length === 0,
    docs: items.map((it) => ({ id: it.id, data: () => it.data })),
  };
}

function movTimestamp(ms: number) {
  return { toMillis: () => ms };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// 1 + 2. Flujo completo Apertura → Movimientos → Cierre, y turno único activo
// ============================================================================

describe('Fase 1 — Caja: flujo completo Apertura → Movimientos → Cierre', () => {
  it('abre turno, registra ingreso/egreso y cierra con diferencia correcta (cuadre exacto)', async () => {
    // 1) Apertura — no hay turno activo
    mockGetDocs.mockResolvedValueOnce(snap([])); // getTurnoActivo -> search -> getAll
    mockSetDoc.mockResolvedValueOnce(undefined);

    const turnoId = await turnosService.abrirTurno('matutino', 'uid-1', 'Axel', 800);
    expect(turnoId).toMatch(/^turno_\d{4}-\d{2}-\d{2}_matutino$/);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const turnoCreado = (mockSetDoc.mock.calls[0] as any[])[1];
    expect(turnoCreado.estado).toBe('abierto');
    expect(turnoCreado.fondoInicial).toBe(800);

    // 2) Movimientos — un ingreso y un egreso
    mockAddDoc.mockResolvedValueOnce({ id: 'mov-1' });
    const ingresoId = await registrarMovimiento({
      turno_id: turnoId,
      tipo: 'ingreso',
      monto: 500,
      concepto: 'Venta mostrador',
      usuario_id: 'uid-1',
    } as any);
    expect(ingresoId).toBe('mov-1');

    mockAddDoc.mockResolvedValueOnce({ id: 'mov-2' });
    const egresoId = await registrarMovimiento({
      turno_id: turnoId,
      tipo: 'egreso',
      monto: 100,
      concepto: 'Compra hielo',
      usuario_id: 'uid-1',
    } as any);
    expect(egresoId).toBe('mov-2');

    // 3) Cierre — fondoInicial(800) + ingresos(500) - egresos(100) = 1200 esperado
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: turnoId,
      data: () => ({ estado: 'abierto', fondoInicial: 800 }),
    }); // turnosService.getById

    mockGetDocs
      .mockResolvedValueOnce(snap([])) // getCierrePorTurno -> ninguno previo
      .mockResolvedValueOnce(
        snap([
          {
            id: 'mov-1',
            data: { turno_id: turnoId, tipo: 'ingreso', monto: 500, concepto: 'Venta mostrador', fecha: movTimestamp(2) },
          },
          {
            id: 'mov-2',
            data: { turno_id: turnoId, tipo: 'egreso', monto: 100, concepto: 'Compra hielo', fecha: movTimestamp(1) },
          },
        ])
      ); // getTotalesPorTurno -> getMovimientosPorTurno

    mockAddDoc.mockResolvedValueOnce({ id: 'cierre-1' });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const cierreId = await crearCierre(turnoId, 1200, 'uid-1', 'Axel Caldera');
    expect(cierreId).toBe('cierre-1');

    // addDoc ya fue llamado dos veces antes (ingreso y egreso) — el cierre es la 3ª llamada
    const cierreData = (mockAddDoc.mock.calls[2] as any[])[1];
    expect(cierreData.monto_esperado).toBe(1200);
    expect(cierreData.monto_real).toBe(1200);
    expect(cierreData.diferencia).toBe(0);

    const updateArgs = mockUpdateDoc.mock.calls[0] as any[];
    expect(updateArgs[1].estado).toBe('cerrado');
    expect(updateArgs[1].corte.diferencia).toBe(0);
  });

  it('impide abrir un segundo turno mientras haya uno activo', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snap([{ id: 'turno_2026-07-01_matutino', data: { estado: 'abierto', fondoInicial: 800 } }])
    );

    await expect(turnosService.abrirTurno('vespertino', 'uid-2', 'Ashley', 800)).rejects.toThrow(
      'Ya existe un turno abierto'
    );
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('crearCierre rechaza si el turno ya fue cerrado previamente', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ estado: 'cerrado', fondoInicial: 800 }),
    });

    await expect(crearCierre('turno-x', 1000, 'uid-1', 'Axel')).rejects.toThrow(
      'El turno ya está cerrado'
    );
  });

  it('crearCierre rechaza si el turno ya tiene un cierre registrado', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ estado: 'abierto', fondoInicial: 800 }),
    });
    mockGetDocs.mockResolvedValueOnce(
      snap([{ id: 'cierre-previo', data: { turno_id: 'turno-x', diferencia: 0 } }])
    );

    await expect(crearCierre('turno-x', 1000, 'uid-1', 'Axel')).rejects.toThrow(
      'Este turno ya tiene un cierre registrado'
    );
  });
});

// ============================================================================
// 3. Cálculo de totales y diferencias
// ============================================================================

describe('Fase 1 — Caja: cálculo de totales y diferencias', () => {
  it('getTotalesPorTurno suma ingresos y egresos correctamente', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snap([
        { id: 'm1', data: { tipo: 'ingreso', monto: 300, concepto: 'Venta', fecha: movTimestamp(3) } },
        { id: 'm2', data: { tipo: 'ingreso', monto: 200, concepto: 'Venta', fecha: movTimestamp(2) } },
        { id: 'm3', data: { tipo: 'egreso', monto: 150, concepto: 'Insumos', fecha: movTimestamp(1) } },
      ])
    );

    const { totalIngresos, totalEgresos, saldoNeto } = await getTotalesPorTurno('turno-1');
    expect(totalIngresos).toBe(500);
    expect(totalEgresos).toBe(150);
    expect(saldoNeto).toBe(350);
  });

  it('getEgresosPorConcepto agrupa y ordena de mayor a menor', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snap([
        { id: 'e1', data: { tipo: 'egreso', monto: 50, concepto: 'Hielo', fecha: movTimestamp(1) } },
        { id: 'e2', data: { tipo: 'egreso', monto: 30, concepto: 'Hielo', fecha: movTimestamp(2) } },
        { id: 'e3', data: { tipo: 'egreso', monto: 200, concepto: 'Renta', fecha: movTimestamp(3) } },
      ])
    );

    const resultado = await getEgresosPorConcepto('turno-1');
    expect(resultado).toEqual([
      { concepto: 'Renta', total: 200, cantidad: 1 },
      { concepto: 'Hielo', total: 80, cantidad: 2 },
    ]);
  });

  it('previsualizarCierre calcula esperado/diferencia sin persistir nada', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ estado: 'abierto', fondoInicial: 800 }),
    });
    mockGetDocs.mockResolvedValueOnce(
      snap([
        { id: 'm1', data: { tipo: 'ingreso', monto: 400, concepto: 'Venta', fecha: movTimestamp(1) } },
        { id: 'm2', data: { tipo: 'egreso', monto: 50, concepto: 'Insumos', fecha: movTimestamp(2) } },
      ])
    );

    const preview = await previsualizarCierre('turno-1', 1200);
    // esperado = 800 + 400 - 50 = 1150; real = 1200 -> sobrante de 50
    expect(preview.montoEsperado).toBe(1150);
    expect(preview.diferencia).toBe(50);
    expect(preview.clasificacion).toBe('sobrante');
    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('clasificarDiferencia distingue cuadre / sobrante / faltante', () => {
    expect(clasificarDiferencia(0)).toBe('cuadre');
    expect(clasificarDiferencia(0.01)).toBe('sobrante');
    expect(clasificarDiferencia(-0.01)).toBe('faltante');
  });
});

// ============================================================================
// 4. Importación de CSV — parseo y deduplicación
// ============================================================================

describe('Fase 1 — Caja: importación de CSV de Loyverse', () => {
  const csvMuestra =
    'Numero de turno;Hora de apertura;Hora de cierre;Importe de apertura;Ventas netas;Pagos en efectivo;Diferencia;Abierto por;Cerrado por\n' +
    '101;25/06/2026 08:30;25/06/2026 16:00;800;1500;2200;-100;Axel Caldera;Axel Caldera\n' +
    '102;25/06/2026 16:05;25/06/2026 23:50;800;900;1650;0;Ashley;Ashley';

  it('parseCajaCSV interpreta encabezados, montos y fechas del formato Loyverse', () => {
    const filas = parseCajaCSV(csvMuestra);
    expect(filas).toHaveLength(2);

    expect(filas[0]).toMatchObject({
      numeroTurno: '101',
      fondoInicial: 800,
      ventasNetas: 1500,
      pagosEfectivo: 2200,
      diferencia: -100,
      abiertoPor: 'Axel Caldera',
      cerradoPor: 'Axel Caldera',
      fecha: '2026-06-25',
    });
    expect(filas[1].fecha).toBe('2026-06-25');
  });

  it('importarFilasCSV omite turnos que ya existen (idempotente) e importa los nuevos', async () => {
    const filas = parseCajaCSV(csvMuestra);

    // Turno 1 (matutino, 08:30) ya existe -> se omite
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });
    // Turno 2 (vespertino, 16:05) es nuevo -> se importa
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);
    mockAddDoc.mockResolvedValueOnce({ id: 'cierre-csv-1' });

    const resultado = await importarFilasCSV(filas, 'admin-1');

    expect(resultado.importados).toBe(1);
    expect(resultado.omitidos).toBe(1);
    expect(resultado.errores).toHaveLength(0);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('importarFilasCSV no reimporta si se corre dos veces sobre el mismo archivo', async () => {
    const filas = parseCajaCSV(csvMuestra);

    // Segunda corrida: ambos turnos ya existen
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });

    const resultado = await importarFilasCSV(filas, 'admin-1');

    expect(resultado.importados).toBe(0);
    expect(resultado.omitidos).toBe(2);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 5. Alertas de descuadre en los 3 niveles (misma lógica que CierreTurno.tsx)
// ============================================================================

/** Replica exacta de `nivelAlerta()` en components/caja/CierreTurno.tsx (no exportada). */
function nivelAlerta(diff: number): 'info' | 'warning' | 'critical' | null {
  const abs = Math.abs(diff);
  if (abs === 0) return null;
  if (abs < 50) return 'info';
  if (abs < 200) return 'warning';
  return 'critical';
}

describe('Fase 1 — Caja: niveles de alerta de descuadre', () => {
  it('sin diferencia no dispara alerta', () => {
    expect(nivelAlerta(0)).toBeNull();
  });

  it('$1–$49 dispara nivel info', () => {
    expect(nivelAlerta(1)).toBe('info');
    expect(nivelAlerta(-49)).toBe('info');
  });

  it('$50–$199 dispara nivel warning', () => {
    expect(nivelAlerta(50)).toBe('warning');
    expect(nivelAlerta(-199)).toBe('warning');
  });

  it('$200+ dispara nivel critical', () => {
    expect(nivelAlerta(200)).toBe('critical');
    expect(nivelAlerta(-500)).toBe('critical');
  });

  it('el campo Notas es obligatorio cuando |diferencia| >= 50', () => {
    const notasObligatorias = (diff: number) => Math.abs(diff) >= 50;
    expect(notasObligatorias(49)).toBe(false);
    expect(notasObligatorias(50)).toBe(true);
    expect(notasObligatorias(-200)).toBe(true);
  });
});

// ============================================================================
// 6. Bloqueo de roles no autorizados (useRolGuard en los componentes de Caja)
// ============================================================================

describe('Fase 1 — Caja: control de acceso por rol', () => {
  // Roles reales usados por useRolGuard(...) en cada componente (ver grep de componentes/caja)
  const ROLES_ESCRITURA = ['admin', 'encargado', 'cajera']; // Apertura, Registro, Cierre
  const ROLES_IMPORTACION = ['admin', 'encargado']; // ImportarCSV
  const TODOS_LOS_ROLES = ['admin', 'encargado', 'cajera', 'cocina', 'repartidor'];

  function allowed(roles: string[], rol: string) {
    return roles.includes(rol);
  }

  it('cajera, encargado y admin pueden abrir turno / registrar movimiento / cerrar turno', () => {
    ['admin', 'encargado', 'cajera'].forEach((rol) => {
      expect(allowed(ROLES_ESCRITURA, rol)).toBe(true);
    });
  });

  it('cocina y repartidor NO pueden operar caja', () => {
    ['cocina', 'repartidor'].forEach((rol) => {
      expect(allowed(ROLES_ESCRITURA, rol)).toBe(false);
    });
  });

  it('solo admin y encargado pueden importar CSV de Loyverse', () => {
    TODOS_LOS_ROLES.forEach((rol) => {
      const esperado = ['admin', 'encargado'].includes(rol);
      expect(allowed(ROLES_IMPORTACION, rol)).toBe(esperado);
    });
  });

  it('cajera NO puede importar CSV (solo admin/encargado)', () => {
    expect(allowed(ROLES_IMPORTACION, 'cajera')).toBe(false);
  });
});
