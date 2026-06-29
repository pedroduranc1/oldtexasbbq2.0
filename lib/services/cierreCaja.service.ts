/**
 * Servicio de Cierre de Caja
 * Old Texas BBQ - CRM
 *
 * Gestiona la creación del cierre al finalizar un turno y el reporte de diferencias.
 * Concilia efectivo esperado vs real; registra la diferencia con signo:
 *   > 0 = sobrante  |  < 0 = faltante  |  = 0 = cuadre exacto
 *
 * Colección: CierresCaja
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CierreCaja } from '@/lib/types/firestore';
import { turnosService } from './turnos.service';
import { getTotalesPorTurno } from './movimientosCaja.service';

const COL = 'CierresCaja';

// ============================================================================
// ESCRITURA
// ============================================================================

/**
 * Crea el cierre de un turno.
 *
 * Flujo atómico:
 * 1. Valida que el turno existe, está abierto y no tiene cierre previo.
 * 2. Calcula monto_esperado = fondoInicial + totalIngresos − totalEgresos.
 * 3. Persiste el documento en CierresCaja.
 * 4. Marca el turno como 'cerrado' (hora_fin + corte en el mismo doc).
 *
 * Retorna el ID del documento de cierre creado.
 */
export async function crearCierre(
  turnoId: string,
  montoReal: number,
  usuarioId: string,
  usuarioNombre: string,
  notas?: string
): Promise<string> {
  if (montoReal < 0) throw new Error('El monto real no puede ser negativo');
  if (!usuarioNombre?.trim()) throw new Error('No se pudo determinar quién cierra el turno');

  const turno = await turnosService.getById(turnoId);
  if (!turno) throw new Error('Turno no encontrado');
  if (turno.estado === 'cerrado') throw new Error('El turno ya está cerrado');

  const cierreExistente = await getCierrePorTurno(turnoId);
  if (cierreExistente) throw new Error('Este turno ya tiene un cierre registrado');

  const { totalIngresos, totalEgresos } = await getTotalesPorTurno(turnoId);
  const montoEsperado = turno.fondoInicial + totalIngresos - totalEgresos;
  const diferencia = montoReal - montoEsperado;
  const ahora = Timestamp.now();

  // Persistir documento de cierre
  const ref = await addDoc(collection(db, COL), {
    turno_id: turnoId,
    monto_esperado: montoEsperado,
    monto_real: montoReal,
    diferencia,
    notas: notas ?? null,
    fecha: ahora,
    usuario_id: usuarioId,
    usuario_nombre: usuarioNombre.trim(),
  });

  // Actualizar el turno como cerrado
  await updateDoc(doc(db, 'turnos', turnoId), {
    estado: 'cerrado',
    horaFin: ahora,
    corte: {
      efectivoEsperado: montoEsperado,
      efectivoReal: montoReal,
      diferencia,
      observaciones: notas ?? '',
      cerradoPor: usuarioId,
      cerradoPorNombre: usuarioNombre.trim(),
      horaCierre: ahora,
    },
  });

  return ref.id;
}

// ============================================================================
// LECTURA
// ============================================================================

/**
 * Obtiene el cierre de un turno (uno por turno como máximo).
 */
export async function getCierrePorTurno(turnoId: string): Promise<CierreCaja | null> {
  const q = query(collection(db, COL), where('turno_id', '==', turnoId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as CierreCaja;
}

/**
 * Obtiene un cierre por su ID directo.
 */
export async function getCierreById(cierreId: string): Promise<CierreCaja | null> {
  const snap = await getDoc(doc(db, COL, cierreId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CierreCaja;
}

/**
 * Obtiene todos los cierres ordenados por fecha descendente.
 */
export async function getTodosCierres(): Promise<CierreCaja[]> {
  const q = query(collection(db, COL), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CierreCaja);
}

// ============================================================================
// REPORTE DE DIFERENCIAS
// ============================================================================

/**
 * Clasifica la diferencia de un cierre.
 *   'cuadre'   — diferencia === 0
 *   'sobrante' — diferencia > 0
 *   'faltante' — diferencia < 0
 */
export function clasificarDiferencia(diferencia: number): 'cuadre' | 'sobrante' | 'faltante' {
  if (diferencia === 0) return 'cuadre';
  return diferencia > 0 ? 'sobrante' : 'faltante';
}

/**
 * Genera el reporte de diferencias de un conjunto de cierres.
 *
 * Retorna:
 * - totalCierres        — cantidad total de cierres analizados
 * - cuadres             — cierres sin diferencia
 * - sobrantes           — cierres con efectivo de más
 * - faltantes           — cierres con efectivo de menos
 * - diferenciaAcumulada — suma de todas las diferencias (positivo = neto sobrante)
 * - mayorSobrante       — cierre con mayor sobrante
 * - mayorFaltante       — cierre con mayor faltante (diferencia más negativa)
 * - detalle             — lista con clasificación por cierre
 */
export async function getReporteDiferencias(cierres?: CierreCaja[]): Promise<{
  totalCierres: number;
  cuadres: number;
  sobrantes: number;
  faltantes: number;
  diferenciaAcumulada: number;
  mayorSobrante: CierreCaja | null;
  mayorFaltante: CierreCaja | null;
  detalle: Array<CierreCaja & { clasificacion: 'cuadre' | 'sobrante' | 'faltante' }>;
}> {
  const lista = cierres ?? (await getTodosCierres());

  let cuadres = 0;
  let sobrantes = 0;
  let faltantes = 0;
  let diferenciaAcumulada = 0;
  let mayorSobrante: CierreCaja | null = null;
  let mayorFaltante: CierreCaja | null = null;

  const detalle = lista.map((c) => {
    const clasificacion = clasificarDiferencia(c.diferencia);
    diferenciaAcumulada += c.diferencia;

    if (clasificacion === 'cuadre') cuadres++;
    if (clasificacion === 'sobrante') {
      sobrantes++;
      if (!mayorSobrante || c.diferencia > mayorSobrante.diferencia) mayorSobrante = c;
    }
    if (clasificacion === 'faltante') {
      faltantes++;
      if (!mayorFaltante || c.diferencia < mayorFaltante.diferencia) mayorFaltante = c;
    }

    return { ...c, clasificacion };
  });

  return {
    totalCierres: lista.length,
    cuadres,
    sobrantes,
    faltantes,
    diferenciaAcumulada,
    mayorSobrante,
    mayorFaltante,
    detalle,
  };
}

/**
 * Vista previa del cierre — calcula sin persistir.
 * Usar antes de mostrar el modal de confirmación al cajero.
 */
export async function previsualizarCierre(
  turnoId: string,
  montoReal: number
): Promise<{
  montoEsperado: number;
  montoReal: number;
  diferencia: number;
  clasificacion: 'cuadre' | 'sobrante' | 'faltante';
  totalIngresos: number;
  totalEgresos: number;
  fondoInicial: number;
}> {
  const turno = await turnosService.getById(turnoId);
  if (!turno) throw new Error('Turno no encontrado');

  const { totalIngresos, totalEgresos } = await getTotalesPorTurno(turnoId);
  const montoEsperado = turno.fondoInicial + totalIngresos - totalEgresos;
  const diferencia = montoReal - montoEsperado;

  return {
    montoEsperado,
    montoReal,
    diferencia,
    clasificacion: clasificarDiferencia(diferencia),
    totalIngresos,
    totalEgresos,
    fondoInicial: turno.fondoInicial,
  };
}
