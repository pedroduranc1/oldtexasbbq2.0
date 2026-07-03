/**
 * Servicio de Movimientos de Caja
 * Old Texas BBQ - CRM
 *
 * Registra y consulta ingresos/egresos dentro de un turno activo.
 * Colección: MovimientosCaja
 */

import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  runTransaction,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MovimientoCaja, NuevoMovimientoCaja, TipoMovimientoCaja } from '@/lib/types/firestore';

const COL = 'MovimientosCaja';

// ============================================================================
// ESCRITURA
// ============================================================================

/**
 * Registra un movimiento (ingreso o egreso) en el turno activo.
 * Retorna el ID del documento creado.
 *
 * Precondición: el turnoId debe pertenecer a un turno en estado 'abierto'.
 * La validación del turno abierto es responsabilidad del componente llamador
 * (o del hook useRegistrarMovimiento).
 */
export async function registrarMovimiento(data: NuevoMovimientoCaja): Promise<string> {
  if (data.monto <= 0) throw new Error('El monto debe ser mayor a cero');

  const ref = await addDoc(collection(db, COL), {
    turno_id: data.turno_id,
    tipo: data.tipo,
    monto: data.monto,
    concepto: data.concepto,
    descripcion: data.descripcion ?? null,
    fecha: Timestamp.now(),
    usuario_id: data.usuario_id,
  });
  return ref.id;
}

/**
 * Corrige un movimiento existente creando un movimiento inverso (mismo monto,
 * tipo contrario) y marcando el original como corregido.
 *
 * MovimientosCaja es inmutable — nunca se edita ni se borra un registro.
 * Esto preserva el audit trail completo: el movimiento erróneo sigue visible,
 * junto con el registro que lo anula y quién/cuándo lo corrigió.
 *
 * Operación atómica: si la corrección falla, no se crea el movimiento inverso.
 */
export async function corregirMovimiento(
  movimientoId: string,
  usuarioId: string,
  motivo: string
): Promise<string> {
  if (!motivo.trim()) throw new Error('El motivo de la corrección es requerido');

  const movRef = doc(db, COL, movimientoId);
  const nuevoRef = doc(collection(db, COL));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(movRef);
    if (!snap.exists()) throw new Error('El movimiento original no existe');

    const original = snap.data() as Omit<MovimientoCaja, 'id'>;
    if (original.corregidoPor) {
      throw new Error('Este movimiento ya fue corregido anteriormente');
    }

    const tipoInverso: TipoMovimientoCaja =
      original.tipo === 'ingreso' ? 'egreso' : 'ingreso';

    tx.set(nuevoRef, {
      turno_id: original.turno_id,
      tipo: tipoInverso,
      monto: original.monto,
      concepto: `Corrección: ${original.concepto}`,
      descripcion: `Anula movimiento ${movimientoId}. Motivo: ${motivo.trim()}`,
      fecha: Timestamp.now(),
      usuario_id: usuarioId,
      correccionDe: movimientoId,
    });

    tx.update(movRef, { corregidoPor: nuevoRef.id });
  });

  return nuevoRef.id;
}

// ============================================================================
// LECTURA
// ============================================================================

/**
 * Obtiene todos los movimientos de un turno, ordenados por fecha descendente.
 */
export async function getMovimientosPorTurno(turnoId: string): Promise<MovimientoCaja[]> {
  const q = query(
    collection(db, COL),
    where('turno_id', '==', turnoId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MovimientoCaja);
  // Ordenar en cliente mientras se crean los índices compuestos en Firestore
  return docs.sort((a, b) => {
    const ta = a.fecha?.toMillis?.() ?? 0;
    const tb = b.fecha?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/**
 * Obtiene solo ingresos o solo egresos de un turno.
 */
export async function getMovimientosPorTipo(
  turnoId: string,
  tipo: TipoMovimientoCaja
): Promise<MovimientoCaja[]> {
  const q = query(
    collection(db, COL),
    where('turno_id', '==', turnoId),
    where('tipo', '==', tipo)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MovimientoCaja);
  return docs.sort((a, b) => {
    const ta = a.fecha?.toMillis?.() ?? 0;
    const tb = b.fecha?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/**
 * Obtiene movimientos de múltiples turnos en un rango de IDs.
 * Útil para reportes multi-turno.
 */
export async function getMovimientosPorTurnos(turnoIds: string[]): Promise<MovimientoCaja[]> {
  if (turnoIds.length === 0) return [];

  // Firestore 'in' acepta máximo 30 valores; particionamos si hace falta
  const chunks: string[][] = [];
  for (let i = 0; i < turnoIds.length; i += 30) {
    chunks.push(turnoIds.slice(i, i + 30));
  }

  const results: MovimientoCaja[] = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, COL),
      where('turno_id', 'in', chunk),
      orderBy('fecha', 'desc')
    );
    const snap = await getDocs(q);
    results.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MovimientoCaja));
  }
  return results;
}

// ============================================================================
// CÁLCULOS / TOTALES
// ============================================================================

/**
 * Calcula totales de ingresos y egresos para un turno.
 * Retorna también la lista completa de movimientos para evitar doble fetch.
 */
export async function getTotalesPorTurno(turnoId: string): Promise<{
  totalIngresos: number;
  totalEgresos: number;
  saldoNeto: number;
  movimientos: MovimientoCaja[];
}> {
  const movimientos = await getMovimientosPorTurno(turnoId);

  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0);

  const totalEgresos = movimientos
    .filter((m) => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.monto, 0);

  return {
    totalIngresos,
    totalEgresos,
    saldoNeto: totalIngresos - totalEgresos,
    movimientos,
  };
}

/**
 * Agrupa los egresos de un turno por concepto.
 * Útil para el desglose del ResumenCaja.
 */
export async function getEgresosPorConcepto(
  turnoId: string
): Promise<{ concepto: string; total: number; cantidad: number }[]> {
  const egresos = await getMovimientosPorTipo(turnoId, 'egreso');

  const mapa = new Map<string, { total: number; cantidad: number }>();
  for (const e of egresos) {
    const prev = mapa.get(e.concepto) ?? { total: 0, cantidad: 0 };
    mapa.set(e.concepto, { total: prev.total + e.monto, cantidad: prev.cantidad + 1 });
  }

  return Array.from(mapa.entries())
    .map(([concepto, { total, cantidad }]) => ({ concepto, total, cantidad }))
    .sort((a, b) => b.total - a.total);
}

// ============================================================================
// TIEMPO REAL
// ============================================================================

/**
 * Escucha en tiempo real los movimientos de un turno.
 * Retorna unsubscribe para limpiar en useEffect.
 */
export function onMovimientosTurnoChange(
  turnoId: string,
  callback: (movimientos: MovimientoCaja[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('turno_id', '==', turnoId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MovimientoCaja);
      callback(docs.sort((a, b) => {
        const ta = a.fecha?.toMillis?.() ?? 0;
        const tb = b.fecha?.toMillis?.() ?? 0;
        return tb - ta;
      }));
    },
    (err) => onError?.(err)
  );
}
