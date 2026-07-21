/**
 * Servicio de Flujo de Efectivo Semanal — Old Texas BBQ CRM
 *
 * Estructura: saldo inicial → movimientos del periodo → saldo final
 * Periodo: lunes a domingo.
 *
 * Los movimientos se calculan dinámicamente cruzando:
 *   - Turnos del periodo (ventas por método de pago desde resumen del turno)
 *   - MovimientosCaja del periodo (egresos, ingresos manuales, anticipos)
 *   - Anticipos recibidos en el periodo
 *
 * Depósitos Clip (D+1): las ventas con tarjeta del día N se suman al flujo
 * del día N+1, descontando la comisión (3.6% + IVA → 4.176%).
 * Depósitos Uber/Didi: son manuales — se registran como MovimientoCaja
 * con concepto "Depósito Uber Eats" o "Depósito Didi Food" cuando llegan.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  eachDayOfInterval,
} from 'date-fns';
import type { FlujoSemanal } from '@/lib/types/firestore';
import { turnosService } from './turnos.service';
import { getMovimientosPorTurnos } from './movimientosCaja.service';
import { getAnticipos } from './anticipos.service';

const COL = 'FlujoSemanal';

// Comisión Clip: 3.6% base + 16% IVA sobre la comisión
const COMISION_CLIP = 0.036 * 1.16;

function colRef() {
  if (!db) throw new Error('Firestore no disponible');
  return collection(db, COL);
}

// ─── Tipos de resumen ──────────────────────────────────────────────────────────

export interface ResumenDiaFlujo {
  fecha: string; // YYYY-MM-DD
  diaSemana: string; // 'Lun', 'Mar', ...
  // Ingresos directos
  efectivoVentas: number;     // ventas pagadas en efectivo ese día
  tarjetaVentas: number;      // ventas por tarjeta ese día (bruto)
  tarjetaNeto: number;        // tarjeta - comisión Clip (D+1 del día anterior)
  envios: number;             // cobros de envío del día
  anticiposEfectivo: number;  // anticipos recibidos en efectivo ese día
  otrosIngresos: number;      // MovimientosCaja tipo ingreso manual
  // Egresos
  egresos: number;            // MovimientosCaja tipo egreso
  // Totales
  ingresoTotal: number;
  egresoTotal: number;
  netoDia: number;
}

export interface ResumenFlujoSemanal {
  flujo: FlujoSemanal;
  dias: ResumenDiaFlujo[];
  // Totales del periodo
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;       // bruto
  totalTarjetaNeto: number;   // ya descontando Clip
  totalEnvios: number;
  totalEgresos: number;
  totalAnticipos: number;
  totalOtrosIngresos: number;
  // Saldos
  saldoInicial: number;
  efectivoTeorico: number;    // saldoInicial + efectivo + anticipos efectivo - egresos efectivo
  saldoFinalEsperado: number; // saldoInicial + todos los ingresos - egresos
  gananciaEstimada: number;
  // Desglose por canal de apps
  ventasUber: number;
  ventasDidi: number;
}

// ─── CRUD del registro semanal ─────────────────────────────────────────────────

export async function getFlujoSemanaActual(): Promise<FlujoSemanal | null> {
  const hoy = new Date();
  const lunes = format(startOfWeek(hoy, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const q = query(colRef(), where('semanaInicio', '==', lunes));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as FlujoSemanal;
}

export async function getFlujoSemana(semanaInicio: string): Promise<FlujoSemanal | null> {
  const q = query(colRef(), where('semanaInicio', '==', semanaInicio));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as FlujoSemanal;
}

export async function listarFlujos(): Promise<FlujoSemanal[]> {
  const q = query(colRef(), orderBy('semanaInicio', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FlujoSemanal);
}

export async function crearFlujoSemanal(
  semanaInicio: string,
  saldoInicial: number,
  usuarioId: string,
  usuarioNombre: string,
  notas?: string
): Promise<string> {
  const inicio = parseISO(semanaInicio);
  const semanaFin = format(endOfWeek(inicio, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Verificar que no exista ya para esa semana
  const existente = await getFlujoSemana(semanaInicio);
  if (existente) throw new Error(`Ya existe un flujo para la semana del ${semanaInicio}`);

  const ahora = Timestamp.now();
  const docRef = await addDoc(colRef(), {
    semanaInicio,
    semanaFin,
    saldoInicial,
    estado: 'abierto',
    notas: notas ?? null,
    usuarioId,
    usuarioNombre,
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
  });
  return docRef.id;
}

export async function cerrarFlujoSemanal(
  id: string,
  saldoFinal: number
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  await updateDoc(doc(db, COL, id), {
    saldoFinal,
    estado: 'cerrado',
    fechaActualizacion: Timestamp.now(),
  });
}

// ─── Cálculo del resumen ───────────────────────────────────────────────────────

export async function calcularResumenFlujo(
  flujo: FlujoSemanal
): Promise<ResumenFlujoSemanal> {
  const { semanaInicio, semanaFin } = flujo;

  // 1. Turnos del periodo
  const turnos = await turnosService.getTurnosPorRango(semanaInicio, semanaFin);
  const turnoIds = turnos.map((t) => t.id);

  // 2. Movimientos de caja del periodo
  const movsCaja = turnoIds.length > 0
    ? await getMovimientosPorTurnos(turnoIds)
    : [];

  // 3. Anticipos del periodo
  const todosAnticipos = await getAnticipos();
  const anticiposPeriodo = todosAnticipos.filter((a) => {
    const f = format(a.fechaCreacion.toDate(), 'yyyy-MM-dd');
    return f >= semanaInicio && f <= semanaFin && a.metodoPago === 'efectivo';
  });

  // 4. Construir mapa de ventas por día desde resumen de turnos
  type VentaDia = {
    efectivo: number; tarjeta: number; uber: number; didi: number; envios: number;
  };
  const ventasPorDia: Record<string, VentaDia> = {};

  for (const t of turnos) {
    const r = t.resumen;
    if (!r) continue;
    const k = t.fecha;
    if (!ventasPorDia[k]) ventasPorDia[k] = { efectivo: 0, tarjeta: 0, uber: 0, didi: 0, envios: 0 };
    ventasPorDia[k].efectivo += r.efectivo ?? 0;
    ventasPorDia[k].tarjeta  += r.tarjeta  ?? 0;
    ventasPorDia[k].uber     += r.uber     ?? 0;
    ventasPorDia[k].didi     += r.didi     ?? 0;
    ventasPorDia[k].envios   += r.totalEnvios ?? 0;
  }

  // 5. Egresos e ingresos manuales por día desde MovimientosCaja
  const egresosPorDia: Record<string, number> = {};
  const otrosIngresosPorDia: Record<string, number> = {};

  for (const m of movsCaja) {
    if (m.corregidoPor) continue; // excluir movimientos ya corregidos
    const k = format(m.fecha.toDate(), 'yyyy-MM-dd');
    if (m.tipo === 'egreso') {
      egresosPorDia[k] = (egresosPorDia[k] ?? 0) + m.monto;
    } else {
      // Ingresos manuales (no ventas — las ventas vienen del resumen del turno)
      const esVentaDirecta = ['Venta mostrador', 'Venta delivery', 'Anticipo pedido especial'].includes(m.concepto);
      if (!esVentaDirecta) {
        otrosIngresosPorDia[k] = (otrosIngresosPorDia[k] ?? 0) + m.monto;
      }
    }
  }

  // 6. Anticipos en efectivo por día
  const anticiposPorDia: Record<string, number> = {};
  for (const a of anticiposPeriodo) {
    const k = format(a.fechaCreacion.toDate(), 'yyyy-MM-dd');
    anticiposPorDia[k] = (anticiposPorDia[k] ?? 0) + a.montoAnticipo;
  }

  // 7. Construir serie diaria
  const dias: ResumenDiaFlujo[] = [];
  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const intervalo = eachDayOfInterval({
    start: parseISO(semanaInicio),
    end: parseISO(semanaFin),
  });

  for (let i = 0; i < intervalo.length; i++) {
    const dia = intervalo[i];
    const k = format(dia, 'yyyy-MM-dd');
    const vd = ventasPorDia[k] ?? { efectivo: 0, tarjeta: 0, uber: 0, didi: 0, envios: 0 };

    // Tarjeta neto: las ventas con tarjeta del día ANTERIOR llegan hoy (D+1)
    const ayer = i > 0 ? format(intervalo[i - 1], 'yyyy-MM-dd') : null;
    const tarjetaBrutoAyer = ayer ? (ventasPorDia[ayer]?.tarjeta ?? 0) : 0;
    const tarjetaNeto = Math.round(tarjetaBrutoAyer * (1 - COMISION_CLIP) * 100) / 100;

    const anticiposEfectivo = anticiposPorDia[k] ?? 0;
    const otrosIngresos     = otrosIngresosPorDia[k] ?? 0;
    const egresos           = egresosPorDia[k] ?? 0;

    const ingresoTotal = vd.efectivo + tarjetaNeto + vd.envios + anticiposEfectivo + otrosIngresos;
    const egresoTotal  = egresos;

    dias.push({
      fecha: k,
      diaSemana: DIAS_CORTOS[dia.getDay()],
      efectivoVentas:    vd.efectivo,
      tarjetaVentas:     vd.tarjeta,
      tarjetaNeto,
      envios:            vd.envios,
      anticiposEfectivo,
      otrosIngresos,
      egresos,
      ingresoTotal,
      egresoTotal,
      netoDia: ingresoTotal - egresoTotal,
    });
  }

  // 8. Totales del periodo
  const totalEfectivo       = dias.reduce((s, d) => s + d.efectivoVentas, 0);
  const totalTarjeta        = dias.reduce((s, d) => s + d.tarjetaVentas, 0);
  const totalTarjetaNeto    = dias.reduce((s, d) => s + d.tarjetaNeto, 0);
  const totalEnvios         = dias.reduce((s, d) => s + d.envios, 0);
  const totalEgresos        = dias.reduce((s, d) => s + d.egresos, 0);
  const totalAnticipos      = dias.reduce((s, d) => s + d.anticiposEfectivo, 0);
  const totalOtrosIngresos  = dias.reduce((s, d) => s + d.otrosIngresos, 0);
  const totalVentas         = totalEfectivo + totalTarjeta + totalEnvios;
  const ventasUber          = Object.values(ventasPorDia).reduce((s, v) => s + v.uber, 0);
  const ventasDidi          = Object.values(ventasPorDia).reduce((s, v) => s + v.didi, 0);

  const saldoInicial        = flujo.saldoInicial;
  const efectivoTeorico     = saldoInicial + totalEfectivo + totalAnticipos - totalEgresos;
  const saldoFinalEsperado  = saldoInicial + dias.reduce((s, d) => s + d.netoDia, 0);
  const gananciaEstimada    = saldoFinalEsperado - saldoInicial;

  return {
    flujo,
    dias,
    totalVentas,
    totalEfectivo,
    totalTarjeta,
    totalTarjetaNeto,
    totalEnvios,
    totalEgresos,
    totalAnticipos,
    totalOtrosIngresos,
    saldoInicial,
    efectivoTeorico,
    saldoFinalEsperado,
    gananciaEstimada,
    ventasUber,
    ventasDidi,
  };
}

/** Atajo: obtiene y calcula el flujo de la semana actual. */
export async function getResumenSemanaActual(): Promise<ResumenFlujoSemanal | null> {
  const flujo = await getFlujoSemanaActual();
  if (!flujo) return null;
  return calcularResumenFlujo(flujo);
}
