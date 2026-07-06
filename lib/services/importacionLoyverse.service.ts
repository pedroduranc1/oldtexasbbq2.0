/**
 * importacionLoyverse.service.ts
 * Old Texas BBQ - CRM
 *
 * Importa los 10 tipos de CSV de Loyverse a Firestore.
 * Estrategia: prefetch de IDs existentes → batch writes. Sin getDoc por fila.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  FilaCajasLoyverse,
  FilaMovimientoLoyverse,
  FilaMetodoPagoLoyverse,
  FilaReciboLoyverse,
  FilaReciboArticuloLoyverse,
  FilaResumenVentasLoyverse,
  FilaVentasArticuloLoyverse,
  FilaVentasCategoriaLoyverse,
  FilaVentasEmpleadoLoyverse,
  FilaVentasModificadorLoyverse,
} from '@/lib/utils/parseLoyverseCSVs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResultadoImportacionLoyverse {
  turnos:           { importados: number; omitidos: number };
  movimientos:      { importados: number; omitidos: number };
  metodos:          { actualizados: number; sinTurno: number };
  recibos:          { importados: number; omitidos: number };
  recibosArticulo:  { importados: number; omitidos: number };
  resumenVentas:    { importados: number; omitidos: number };
  ventasArticulo:   { importados: number; omitidos: number };
  ventasCategoria:  { importados: number; omitidos: number };
  ventasEmpleado:   { importados: number; omitidos: number };
  ventasModificador:{ importados: number; omitidos: number };
  errores:          string[];
}

export interface DatosImportacionLoyverse {
  cajas?:            FilaCajasLoyverse[];
  movimientos?:      FilaMovimientoLoyverse[];
  metodos?:          FilaMetodoPagoLoyverse[];
  recibos?:          FilaReciboLoyverse[];
  recibosArticulo?:  FilaReciboArticuloLoyverse[];
  resumenVentas?:    FilaResumenVentasLoyverse[];
  ventasArticulo?:   FilaVentasArticuloLoyverse[];
  ventasCategoria?:  FilaVentasCategoriaLoyverse[];
  ventasEmpleado?:   FilaVentasEmpleadoLoyverse[];
  ventasModificador?:FilaVentasModificadorLoyverse[];
  turnoIdParaMetodos?: string;
  periodoLabel?: string;
}

export interface ProgresoImportacion {
  etapa: string;       // texto descriptivo de la etapa actual
  porcentaje: number;  // 0-100
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(s: string): Date {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const rawYear = parseInt(m[3], 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return new Date(
      `${year}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}T${String(m[4]).padStart(2, '0')}:${m[5]}:00`
    );
  }
  return new Date(s);
}

function detectarTipo(horaApertura: string): 'matutino' | 'vespertino' | 'nocturno' {
  const h = toDate(horaApertura).getHours();
  if (h >= 6 && h < 17) return 'matutino';
  if (h >= 17 && h < 23) return 'vespertino';
  return 'nocturno';
}

function turnoIdDesdeCierre(fila: FilaCajasLoyverse): string {
  return `turno_${fila.fecha}_${detectarTipo(fila.horaApertura)}`;
}

/** Commit un writeBatch y crea uno nuevo — Firestore limita 500 ops por batch. */
async function flushBatch(
  batch: ReturnType<typeof writeBatch>,
  pendiente: { count: number }
): Promise<ReturnType<typeof writeBatch>> {
  if (pendiente.count > 0) {
    await batch.commit();
    pendiente.count = 0;
  }
  return writeBatch(db);
}

// ─── 1. Importar turnos ───────────────────────────────────────────────────────

async function importarTurnos(
  filas: FilaCajasLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  if (!filas.length) return;

  // Calcular todos los IDs candidatos
  const candidatos = filas
    .filter((f) => f.fecha)
    .map((f) => ({ fila: f, id: turnoIdDesdeCierre(f) }));

  // Prefetch: obtener IDs ya existentes en turnos (consulta por fecha en lotes de 30)
  const fechas = [...new Set(candidatos.map((c) => c.fila.fecha))];
  const existentes = new Set<string>();

  for (let i = 0; i < fechas.length; i += 30) {
    const lote = fechas.slice(i, i + 30);
    try {
      const snap = await getDocs(
        query(collection(db, 'turnos'), where('fecha', 'in', lote))
      );
      snap.docs.forEach((d) => existentes.add(d.id));
    } catch (_) { /* continuar */ }
  }

  let batch = writeBatch(db);
  const pendiente = { count: 0 };
  const MAX = 240; // conservador: cada turno + cierre = 2 ops

  for (const { fila, id } of candidatos) {
    if (existentes.has(id)) {
      resultado.turnos.omitidos++;
      continue;
    }

    const horaInicioDate = fila.horaApertura ? toDate(fila.horaApertura) : new Date(fila.fecha);
    const horaFinDate = fila.horaCierre ? toDate(fila.horaCierre) : horaInicioDate;
    const tipo = detectarTipo(fila.horaApertura);
    const ventasNetas = fila.cobrosEfectivo - fila.reembolsosEfectivo + fila.pagosSalidas;

    batch.set(doc(db, 'turnos', id), {
      tipo,
      fecha: fila.fecha,
      cajeroId: importadoPor,
      cajeroNombre: fila.abiertoPor || 'Importado',
      encargadoNombre: fila.cerradoPor || null,
      horaInicio: Timestamp.fromDate(horaInicioDate),
      horaFin: Timestamp.fromDate(horaFinDate),
      estado: 'cerrado',
      fondoInicial: fila.fondoAnterior,
      tienda: fila.tienda || null,
      tpv: fila.tpv || null,
      numeroCierreLoyverse: fila.numeroCierre || null,
      resumen: {
        totalPedidos: 0,
        totalVentas: ventasNetas,
        efectivo: fila.cobrosEfectivo,
        tarjeta: 0,
        transferencia: 0,
        uber: 0,
        didi: 0,
        totalEnvios: 0,
        totalDescuentos: 0,
        totalComisionesRepartidores: 0,
      },
      corte: {
        efectivoEsperado: fila.efectivoTeorico,
        efectivoReal: fila.efectivoReal,
        diferencia: fila.descuadre,
        observaciones: `Importado desde Loyverse. Cierre #${fila.numeroCierre}. Cerrado por: ${fila.cerradoPor || 'N/A'}`,
        cerradoPor: importadoPor,
        cerradoPorNombre: fila.cerradoPor || 'Importado',
        horaCierre: Timestamp.fromDate(horaFinDate),
      },
      importadoDesdeCsv: true,
      importadoPor,
      fechaCreacion: Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
    });

    // CierresCaja: usamos ID derivado para idempotencia
    const cierreId = `cierre_${id}`;
    batch.set(doc(db, 'CierresCaja', cierreId), {
      turno_id: id,
      monto_esperado: fila.efectivoTeorico,
      monto_real: fila.efectivoReal,
      diferencia: fila.descuadre,
      notas: `Importado desde Loyverse. Cierre #${fila.numeroCierre}`,
      fecha: Timestamp.fromDate(horaFinDate),
      usuario_id: importadoPor,
      usuario_nombre: fila.cerradoPor || 'Importado',
      importadoDesdeCsv: true,
    });

    pendiente.count += 2;
    resultado.turnos.importados++;

    if (pendiente.count >= MAX) {
      batch = await flushBatch(batch, pendiente);
    }
  }

  if (pendiente.count > 0) await batch.commit();
}

// ─── 2. Importar movimientos ──────────────────────────────────────────────────

async function importarMovimientos(
  filas: FilaMovimientoLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  if (!filas.length) return;

  // Prefetch turnos indexados por numeroCierre para enlazar sin queries por fila
  const numerosCierre = [...new Set(filas.map((f) => f.numeroCierre).filter(Boolean))];
  const turnosPorCierre: Record<string, string> = {};

  for (let i = 0; i < numerosCierre.length; i += 30) {
    const lote = numerosCierre.slice(i, i + 30);
    try {
      const snap = await getDocs(
        query(collection(db, 'turnos'), where('numeroCierreLoyverse', 'in', lote))
      );
      snap.docs.forEach((d) => {
        const nc = d.data().numeroCierreLoyverse;
        if (nc) turnosPorCierre[nc] = d.id;
      });
    } catch (_) { /* continuar */ }
  }

  // Prefetch movimientos existentes por hash fecha+comentario+monto
  const fechas = [...new Set(filas.map((f) => f.fecha).filter(Boolean))];
  const clavesDuplicado = new Set<string>();

  for (let i = 0; i < fechas.length; i += 30) {
    const lote = fechas.slice(i, i + 30);
    try {
      const snap = await getDocs(
        query(collection(db, 'MovimientosCaja'), where('fecha', 'in', lote))
      );
      snap.docs.forEach((d) => {
        const data = d.data();
        clavesDuplicado.add(`${data.fecha}|${data.comentario}|${data.monto}`);
      });
    } catch (_) { /* continuar */ }
  }

  let batch = writeBatch(db);
  const pendiente = { count: 0 };
  const MAX = 450;

  for (const fila of filas) {
    if (!fila.fecha) {
      resultado.errores.push(`Movimiento sin fecha: ${fila.comentario}`);
      continue;
    }

    const clave = `${fila.fecha}|${fila.comentario}|${Math.abs(fila.cantidad)}`;
    if (clavesDuplicado.has(clave)) {
      resultado.movimientos.omitidos++;
      continue;
    }
    clavesDuplicado.add(clave); // evitar dupes dentro del mismo CSV

    const esSalida = fila.tipo?.toLowerCase().includes('salida') || fila.cantidad < 0;
    const turnoId = fila.numeroCierre ? (turnosPorCierre[fila.numeroCierre] ?? null) : null;

    const movId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    batch.set(doc(db, 'MovimientosCaja', movId), {
      turnoId,
      tipo: esSalida ? 'egreso' : 'ingreso',
      tipoLoyverse: fila.tipo || '',
      concepto: fila.comentario || fila.tipo || 'Movimiento importado',
      comentario: fila.comentario || '',
      monto: Math.abs(fila.cantidad),
      fecha: fila.fecha,
      fechaRaw: fila.fechaRaw,
      empleado: fila.empleado || '',
      tienda: fila.tienda || '',
      tpv: fila.tpv || '',
      numeroCierreLoyverse: fila.numeroCierre || '',
      usuario_id: importadoPor,
      importadoDesdeCsv: true,
      importadoPor,
      creadoEn: Timestamp.now(),
    });

    pendiente.count++;
    resultado.movimientos.importados++;

    if (pendiente.count >= MAX) {
      batch = await flushBatch(batch, pendiente);
    }
  }

  if (pendiente.count > 0) await batch.commit();
}

// ─── 3. Actualizar resumen por método de pago (CSV global) ───────────────────

async function actualizarMetodosPago(
  filas: FilaMetodoPagoLoyverse[],
  turnoId: string,
  resultado: ResultadoImportacionLoyverse
) {
  const snap = await getDocs(query(collection(db, 'turnos'), where('__name__', '==', turnoId)));
  if (snap.empty) {
    resultado.metodos.sinTurno++;
    return;
  }

  const resumenUpdate: Record<string, number> = {};
  for (const fila of filas) {
    if (fila.campoResumen === 'otro') continue;
    const p = `resumen.${fila.campoResumen}`;
    resumenUpdate[p] = (resumenUpdate[p] ?? 0) + fila.montoNeto;
  }

  if (Object.keys(resumenUpdate).length > 0) {
    await updateDoc(doc(db, 'turnos', turnoId), resumenUpdate);
    resultado.metodos.actualizados++;
  }
}

// ─── 4. Importar recibos ──────────────────────────────────────────────────────

async function importarRecibos(
  filas: FilaReciboLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  if (!filas.length) return;

  // Prefetch IDs existentes en lotes
  const ids = filas.map((f) => f.numeroRecibo).filter(Boolean);
  const existentes = new Set<string>();

  for (let i = 0; i < ids.length; i += 30) {
    const lote = ids.slice(i, i + 30);
    try {
      const snap = await getDocs(
        query(collection(db, 'Recibos'), where('__name__', 'in', lote))
      );
      snap.docs.forEach((d) => existentes.add(d.id));
    } catch (_) { /* continuar */ }
  }

  // Acumular resumen por fecha para actualizar turnos después
  const resumenPorFecha: Record<string, Record<string, number>> = {};
  const pedidosPorFecha: Record<string, number> = {};

  let batch = writeBatch(db);
  const pendiente = { count: 0 };
  const MAX = 450;

  for (const fila of filas) {
    if (!fila.fecha || !fila.numeroRecibo) continue;

    if (existentes.has(fila.numeroRecibo)) {
      resultado.recibos.omitidos++;
      continue;
    }

    batch.set(doc(db, 'Recibos', fila.numeroRecibo), {
      fecha: fila.fecha,
      fechaRaw: fila.fechaRaw,
      numeroRecibo: fila.numeroRecibo,
      tipoRecibo: fila.tipoRecibo,
      ventasBrutas: fila.ventasBrutas,
      descuentos: fila.descuentos,
      ventasNetas: fila.ventasNetas,
      impuestos: fila.impuestos,
      propinas: fila.propinas,
      totalRecaudado: fila.totalRecaudado,
      costoMercancia: fila.costoMercancia,
      beneficioBruto: fila.beneficioBruto,
      tipoPago: fila.tipoPago,
      campoMetodo: fila.campoMetodo,
      descripcion: fila.descripcion,
      tipoPedido: fila.tipoPedido,
      tpv: fila.tpv,
      tienda: fila.tienda,
      cajero: fila.cajero,
      cliente: fila.cliente,
      estado: fila.estado,
      importadoDesdeCsv: true,
      importadoPor,
      creadoEn: Timestamp.now(),
    });

    pendiente.count++;
    resultado.recibos.importados++;

    // Acumular para actualizar turnos
    if (fila.campoMetodo !== 'otro' && fila.tipoRecibo !== 'Refund') {
      if (!resumenPorFecha[fila.fecha]) resumenPorFecha[fila.fecha] = {};
      const c = fila.campoMetodo;
      resumenPorFecha[fila.fecha][c] = (resumenPorFecha[fila.fecha][c] ?? 0) + fila.ventasNetas;
      pedidosPorFecha[fila.fecha] = (pedidosPorFecha[fila.fecha] ?? 0) + 1;
    }

    if (pendiente.count >= MAX) {
      batch = await flushBatch(batch, pendiente);
    }
  }

  if (pendiente.count > 0) await batch.commit();

  // Actualizar resumen de turnos con desglose real de métodos de pago
  const fechasConDatos = Object.keys(resumenPorFecha);
  if (!fechasConDatos.length) return;

  for (let i = 0; i < fechasConDatos.length; i += 30) {
    const lote = fechasConDatos.slice(i, i + 30);
    try {
      const snap = await getDocs(
        query(collection(db, 'turnos'), where('fecha', 'in', lote))
      );
      for (const turnoDoc of snap.docs) {
        const fecha = turnoDoc.data().fecha as string;
        const metodos = resumenPorFecha[fecha];
        if (!metodos) continue;

        const update: Record<string, number> = {};
        for (const [campo, monto] of Object.entries(metodos)) {
          update[`resumen.${campo}`] = monto;
        }
        update['resumen.totalVentas'] = Object.values(metodos).reduce((s, v) => s + v, 0);
        update['resumen.totalPedidos'] = pedidosPorFecha[fecha] ?? 0;
        await updateDoc(turnoDoc.ref, update);
        resultado.metodos.actualizados++;
      }
    } catch (_) { /* no bloquear */ }
  }
}

// ─── 5. Importar recibos por artículo ────────────────────────────────────────

async function importarRecibosArticulo(
  filas: FilaReciboArticuloLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  if (!filas.length) return;

  let batch = writeBatch(db);
  const pendiente = { count: 0 };
  const MAX = 450;

  for (const fila of filas) {
    if (!fila.numeroRecibo || !fila.articulo) continue;
    const docId = `${fila.numeroRecibo}_${fila.articulo}_${fila.variante}`
      .replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);

    batch.set(doc(db, 'RecibosArticulo', docId), {
      ...fila,
      importadoDesdeCsv: true,
      importadoPor,
      creadoEn: Timestamp.now(),
    });

    pendiente.count++;
    resultado.recibosArticulo.importados++;

    if (pendiente.count >= MAX) {
      batch = await flushBatch(batch, pendiente);
    }
  }

  if (pendiente.count > 0) await batch.commit();
}

// ─── 6. Importar resumen de ventas ────────────────────────────────────────────

async function importarResumenVentas(
  filas: FilaResumenVentasLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  if (!filas.length) return;

  const ids = filas.map((f) => f.fecha).filter(Boolean);
  const existentes = new Set<string>();

  for (let i = 0; i < ids.length; i += 30) {
    const lote = ids.slice(i, i + 30);
    try {
      const snap = await getDocs(
        query(collection(db, 'ResumenVentas'), where('__name__', 'in', lote))
      );
      snap.docs.forEach((d) => existentes.add(d.id));
    } catch (_) { /* continuar */ }
  }

  let batch = writeBatch(db);
  const pendiente = { count: 0 };
  const MAX = 450;

  for (const fila of filas) {
    if (!fila.fecha) continue;
    if (existentes.has(fila.fecha)) {
      resultado.resumenVentas.omitidos++;
      continue;
    }

    batch.set(doc(db, 'ResumenVentas', fila.fecha), {
      ...fila,
      importadoDesdeCsv: true,
      importadoPor,
      creadoEn: Timestamp.now(),
    });

    pendiente.count++;
    resultado.resumenVentas.importados++;

    if (pendiente.count >= MAX) {
      batch = await flushBatch(batch, pendiente);
    }
  }

  if (pendiente.count > 0) await batch.commit();
}

// ─── 7-10. Ventas agregadas (artículo, categoría, empleado, modificador) ─────

async function importarColeccionConPeriodo<T extends Record<string, unknown>>(
  filas: T[],
  coleccion: string,
  periodoLabel: string,
  claveId: keyof T,
  importadoPor: string,
  contadores: { importados: number; omitidos: number },
  errores: string[]
) {
  if (!filas.length) return;

  let batch = writeBatch(db);
  const pendiente = { count: 0 };
  const MAX = 450;

  for (const fila of filas) {
    const clave = String(fila[claveId] ?? '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    if (!clave) continue;

    batch.set(doc(db, coleccion, `${periodoLabel}_${clave}`), {
      ...fila,
      periodo: periodoLabel,
      importadoDesdeCsv: true,
      importadoPor,
      creadoEn: Timestamp.now(),
    }, { merge: true });

    pendiente.count++;
    contadores.importados++;

    if (pendiente.count >= MAX) {
      try {
        await batch.commit();
      } catch (err) {
        errores.push(`Error lote ${coleccion}: ${err instanceof Error ? err.message : String(err)}`);
      }
      pendiente.count = 0;
      batch = writeBatch(db);
    }
  }

  if (pendiente.count > 0) {
    try {
      await batch.commit();
    } catch (err) {
      errores.push(`Error lote ${coleccion}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function importarLoyverse(
  datos: DatosImportacionLoyverse,
  importadoPor: string,
  onProgreso?: (p: ProgresoImportacion) => void
): Promise<ResultadoImportacionLoyverse> {
  if (!db) throw new Error('Firestore no disponible');

  const resultado: ResultadoImportacionLoyverse = {
    turnos:           { importados: 0, omitidos: 0 },
    movimientos:      { importados: 0, omitidos: 0 },
    metodos:          { actualizados: 0, sinTurno: 0 },
    recibos:          { importados: 0, omitidos: 0 },
    recibosArticulo:  { importados: 0, omitidos: 0 },
    resumenVentas:    { importados: 0, omitidos: 0 },
    ventasArticulo:   { importados: 0, omitidos: 0 },
    ventasCategoria:  { importados: 0, omitidos: 0 },
    ventasEmpleado:   { importados: 0, omitidos: 0 },
    ventasModificador:{ importados: 0, omitidos: 0 },
    errores:          [],
  };

  const periodo = datos.periodoLabel ?? new Date().toISOString().slice(0, 7);
  const rep = onProgreso ?? (() => {});

  // Calcular etapas activas para repartir el porcentaje
  const etapas: Array<{ etapa: string; fn: () => Promise<void> }> = [];

  if (datos.cajas?.length)
    etapas.push({ etapa: `Importando turnos (${datos.cajas.length} registros)…`, fn: () => importarTurnos(datos.cajas!, importadoPor, resultado) });
  if (datos.movimientos?.length)
    etapas.push({ etapa: `Importando movimientos (${datos.movimientos.length} registros)…`, fn: () => importarMovimientos(datos.movimientos!, importadoPor, resultado) });
  if (datos.metodos?.length && datos.turnoIdParaMetodos)
    etapas.push({ etapa: 'Actualizando métodos de pago…', fn: () => actualizarMetodosPago(datos.metodos!, datos.turnoIdParaMetodos!, resultado) });
  if (datos.recibos?.length)
    etapas.push({ etapa: `Importando recibos (${datos.recibos.length} registros)…`, fn: () => importarRecibos(datos.recibos!, importadoPor, resultado) });
  if (datos.recibosArticulo?.length)
    etapas.push({ etapa: `Importando artículos de recibos (${datos.recibosArticulo.length} registros)…`, fn: () => importarRecibosArticulo(datos.recibosArticulo!, importadoPor, resultado) });
  if (datos.resumenVentas?.length)
    etapas.push({ etapa: `Importando resumen de ventas (${datos.resumenVentas.length} registros)…`, fn: () => importarResumenVentas(datos.resumenVentas!, importadoPor, resultado) });
  if (datos.ventasArticulo?.length)
    etapas.push({ etapa: `Importando ventas por artículo (${datos.ventasArticulo.length} registros)…`, fn: () => importarColeccionConPeriodo(datos.ventasArticulo! as unknown as Record<string, unknown>[], 'VentasArticulo', periodo, 'articulo', importadoPor, resultado.ventasArticulo, resultado.errores) });
  if (datos.ventasCategoria?.length)
    etapas.push({ etapa: `Importando ventas por categoría (${datos.ventasCategoria.length} registros)…`, fn: () => importarColeccionConPeriodo(datos.ventasCategoria! as unknown as Record<string, unknown>[], 'VentasCategoria', periodo, 'categoria', importadoPor, resultado.ventasCategoria, resultado.errores) });
  if (datos.ventasEmpleado?.length)
    etapas.push({ etapa: `Importando ventas por empleado (${datos.ventasEmpleado.length} registros)…`, fn: () => importarColeccionConPeriodo(datos.ventasEmpleado! as unknown as Record<string, unknown>[], 'VentasEmpleado', periodo, 'empleado', importadoPor, resultado.ventasEmpleado, resultado.errores) });
  if (datos.ventasModificador?.length)
    etapas.push({ etapa: `Importando ventas por modificador (${datos.ventasModificador.length} registros)…`, fn: () => importarColeccionConPeriodo(datos.ventasModificador! as unknown as Record<string, unknown>[], 'VentasModificador', periodo, 'modificador', importadoPor, resultado.ventasModificador, resultado.errores) });

  const total = etapas.length;

  for (let i = 0; i < total; i++) {
    rep({ etapa: etapas[i].etapa, porcentaje: Math.round((i / total) * 100) });
    await etapas[i].fn();
  }

  rep({ etapa: 'Completado', porcentaje: 100 });
  return resultado;
}
