/**
 * Servicio de Anticipos — Old Texas BBQ CRM
 *
 * Gestiona el ciclo de vida completo de anticipos de pedidos especiales:
 *   recibido → aplicado → saldado | cancelado
 *
 * Colección: Anticipos
 *
 * Regla de negocio:
 * - Al crear un anticipo en efectivo, se registra el día que entra en caja.
 * - Al crear un anticipo por tarjeta (Clip), el ingreso en caja se registra al
 *   día siguiente (D+1) ya descontando la comisión del 3.6% + IVA (4.176%).
 * - Un anticipo cancelado genera un egreso de corrección si ya se había
 *   registrado el ingreso en caja.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  Anticipo,
  NuevoAnticipo,
  EstadoAnticipo,
} from '@/lib/types/firestore';
import { registrarMovimiento as registrarMovimientoCaja } from './movimientosCaja.service';

const COL = 'Anticipos';

// Comisión Clip: 3.6% + IVA (16%) sobre el 3.6% → factor neto = 1 - (0.036 * 1.16)
const FACTOR_COMISION_CLIP = 1 - 0.036 * 1.16;

function colRef() {
  if (!db) throw new Error('Firestore no disponible');
  return collection(db, COL);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcularMontoNetoClip(monto: number): number {
  return Math.round(monto * FACTOR_COMISION_CLIP * 100) / 100;
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

export async function getAnticipo(id: string): Promise<Anticipo | null> {
  if (!db) throw new Error('Firestore no disponible');
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Anticipo;
}

export async function getAnticipos(
  soloActivos = false
): Promise<Anticipo[]> {
  const q = soloActivos
    ? query(colRef(), where('estado', 'in', ['recibido', 'aplicado']), orderBy('fechaCreacion', 'desc'))
    : query(colRef(), orderBy('fechaCreacion', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Anticipo);
}

export async function getAnticiposPorEstado(
  estado: EstadoAnticipo
): Promise<Anticipo[]> {
  const q = query(
    colRef(),
    where('estado', '==', estado),
    orderBy('fechaCreacion', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Anticipo);
}

// ─── Escritura ────────────────────────────────────────────────────────────────

/**
 * Crea un anticipo y registra el movimiento de caja correspondiente.
 * Si el pago es por tarjeta, el ingreso neto (ya sin comisión Clip)
 * debe registrarse D+1 — por eso no se crea el MovimientoCaja aquí;
 * el componente UI se encarga de mostrar el aviso y el monto neto.
 *
 * Para efectivo: crea el MovimientoCaja en el mismo turno abierto.
 */
export async function crearAnticipo(
  data: NuevoAnticipo,
  turnoId?: string
): Promise<string> {
  if (!db) throw new Error('Firestore no disponible');

  const ahora = Timestamp.now();
  const docRef = await addDoc(colRef(), {
    ...data,
    turnoId: turnoId ?? null,
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
  });

  // Registrar ingreso en caja solo si es efectivo y hay turno abierto
  if (data.metodoPago === 'efectivo' && turnoId) {
    const movId = await registrarMovimientoCaja({
      turno_id: turnoId,
      tipo: 'ingreso',
      monto: data.montoAnticipo,
      concepto: 'Anticipo pedido especial',
      descripcion: `${data.clienteNombre} — ${data.descripcion}`,
      fecha: ahora,
      usuario_id: data.usuarioId,
    });
    // Guardar referencia cruzada
    await updateDoc(doc(db, COL, docRef.id), { movimientoCajaId: movId });
  }

  return docRef.id;
}

/**
 * Marca el anticipo como aplicado (pedido entregado, anticipo descontado del total).
 */
export async function aplicarAnticipo(
  id: string,
  pedidoId?: string
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  await updateDoc(doc(db, COL, id), {
    estado: 'aplicado' as EstadoAnticipo,
    pedidoId: pedidoId ?? null,
    fechaAplicacion: Timestamp.now(),
    fechaActualizacion: Timestamp.now(),
  });
}

/**
 * Marca el anticipo como saldado (cliente pagó el resto, ciclo cerrado).
 */
export async function saldarAnticipo(id: string): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  await updateDoc(doc(db, COL, id), {
    estado: 'saldado' as EstadoAnticipo,
    fechaActualizacion: Timestamp.now(),
  });
}

/**
 * Cancela un anticipo.
 * Si había un movimiento de caja generado (efectivo), crea un egreso de corrección.
 */
export async function cancelarAnticipo(
  id: string,
  motivo: string,
  turnoId: string,
  usuarioId: string
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');

  const anticipo = await getAnticipo(id);
  if (!anticipo) throw new Error('Anticipo no encontrado');
  if (anticipo.estado === 'saldado') throw new Error('No se puede cancelar un anticipo ya saldado');

  // Si fue en efectivo y generó un ingreso, registrar egreso de devolución
  if (anticipo.metodoPago === 'efectivo' && anticipo.movimientoCajaId && turnoId) {
    await registrarMovimientoCaja({
      turno_id: turnoId,
      tipo: 'egreso',
      monto: anticipo.montoAnticipo,
      concepto: 'Devolución anticipo',
      descripcion: `Cancelación anticipo ${anticipo.clienteNombre}. Motivo: ${motivo}`,
      fecha: Timestamp.now(),
      usuario_id: usuarioId,
    });
  }

  await updateDoc(doc(db, COL, id), {
    estado: 'cancelado' as EstadoAnticipo,
    notas: motivo,
    fechaActualizacion: Timestamp.now(),
  });
}

/**
 * Actualiza campos editables de un anticipo en estado 'recibido'.
 */
export async function actualizarAnticipo(
  id: string,
  cambios: Partial<Pick<Anticipo, 'clienteNombre' | 'clienteTelefono' | 'descripcion' | 'totalEstimado' | 'fechaEntregaEstimada' | 'notas'>>
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  await updateDoc(doc(db, COL, id), {
    ...cambios,
    fechaActualizacion: Timestamp.now(),
  });
}
