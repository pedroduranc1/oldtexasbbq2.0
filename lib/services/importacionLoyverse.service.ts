/**
 * importacionLoyverse.service.ts
 * Old Texas BBQ - CRM
 *
 * Importa los 10 tipos de CSV de Loyverse a Firestore de forma idempotente.
 *
 * Colecciones destino:
 *   turnos           ← FilaCajasLoyverse
 *   CierresCaja      ← FilaCajasLoyverse
 *   MovimientosCaja  ← FilaMovimientoLoyverse
 *   turnos.resumen   ← FilaMetodoPagoLoyverse / FilaReciboLoyverse
 *   Recibos          ← FilaReciboLoyverse
 *   RecibosArticulo  ← FilaReciboArticuloLoyverse
 *   ResumenVentas    ← FilaResumenVentasLoyverse
 *   VentasArticulo   ← FilaVentasArticuloLoyverse
 *   VentasCategoria  ← FilaVentasCategoriaLoyverse
 *   VentasEmpleado   ← FilaVentasEmpleadoLoyverse
 *   VentasModificador← FilaVentasModificadorLoyverse
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
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
  periodoLabel?: string;  // ej. "2024-01" para identificar el período
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
  const tipo = detectarTipo(fila.horaApertura);
  return `turno_${fila.fecha}_${tipo}`;
}

// ─── 1. Importar turnos (CAJAS CSV) ──────────────────────────────────────────

async function importarTurnos(
  filas: FilaCajasLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  for (const fila of filas) {
    try {
      if (!fila.fecha) {
        resultado.errores.push(`Turno sin fecha válida: cierre ${fila.numeroCierre}`);
        continue;
      }

      const turnoId = turnoIdDesdeCierre(fila);
      const turnoRef = doc(db, 'turnos', turnoId);
      const existing = await getDoc(turnoRef);
      if (existing.exists()) {
        resultado.turnos.omitidos++;
        continue;
      }

      const horaInicioDate = fila.horaApertura ? toDate(fila.horaApertura) : new Date(fila.fecha);
      const horaFinDate = fila.horaCierre ? toDate(fila.horaCierre) : horaInicioDate;
      const tipo = detectarTipo(fila.horaApertura);
      const ventasNetas = fila.cobrosEfectivo - fila.reembolsosEfectivo + fila.pagosSalidas;

      await setDoc(turnoRef, {
        tipo,
        fecha: fila.fecha,
        cajeroId: importadoPor,
        cajeroNombre: fila.abiertoPor || 'Importado',
        encargadoNombre: fila.cerradoPor || undefined,
        horaInicio: Timestamp.fromDate(horaInicioDate),
        horaFin: Timestamp.fromDate(horaFinDate),
        estado: 'cerrado',
        fondoInicial: fila.fondoAnterior,
        tienda: fila.tienda || undefined,
        tpv: fila.tpv || undefined,
        numeroCierreLoyverse: fila.numeroCierre || undefined,
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

      await addDoc(collection(db, 'CierresCaja'), {
        turno_id: turnoId,
        monto_esperado: fila.efectivoTeorico,
        monto_real: fila.efectivoReal,
        diferencia: fila.descuadre,
        notas: `Importado desde Loyverse. Cierre #${fila.numeroCierre}`,
        fecha: Timestamp.fromDate(horaFinDate),
        usuario_id: importadoPor,
        usuario_nombre: fila.cerradoPor || 'Importado',
        importadoDesdeCsv: true,
      });

      resultado.turnos.importados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.errores.push(`Error en cierre ${fila.numeroCierre}: ${msg}`);
    }
  }
}

// ─── 2. Importar movimientos ──────────────────────────────────────────────────

async function importarMovimientos(
  filas: FilaMovimientoLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  for (const fila of filas) {
    try {
      if (!fila.fecha) {
        resultado.errores.push(`Movimiento sin fecha válida: ${fila.comentario}`);
        continue;
      }

      let turnoId: string | undefined;
      if (fila.numeroCierre) {
        const q = query(
          collection(db, 'turnos'),
          where('numeroCierreLoyverse', '==', fila.numeroCierre)
        );
        const snap = await getDocs(q);
        if (!snap.empty) turnoId = snap.docs[0].id;
      }

      const q2 = query(
        collection(db, 'MovimientosCaja'),
        where('fecha', '==', fila.fecha),
        where('comentario', '==', fila.comentario),
        where('monto', '==', Math.abs(fila.cantidad))
      );
      const dupSnap = await getDocs(q2);
      if (!dupSnap.empty) {
        resultado.movimientos.omitidos++;
        continue;
      }

      const esSalida = fila.tipo?.toLowerCase().includes('salida') || fila.cantidad < 0;

      await addDoc(collection(db, 'MovimientosCaja'), {
        turnoId: turnoId || null,
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
        importadoDesdeCsv: true,
        importadoPor,
        creadoEn: Timestamp.now(),
      });

      resultado.movimientos.importados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.errores.push(`Error en movimiento "${fila.comentario}": ${msg}`);
    }
  }
}

// ─── 3. Actualizar resumen por método de pago (CSV global) ───────────────────

async function actualizarMetodosPago(
  filas: FilaMetodoPagoLoyverse[],
  turnoId: string,
  resultado: ResultadoImportacionLoyverse
) {
  const turnoRef = doc(db, 'turnos', turnoId);
  const turnoSnap = await getDoc(turnoRef);
  if (!turnoSnap.exists()) {
    resultado.metodos.sinTurno++;
    return;
  }

  const resumenUpdate: Record<string, number> = {};
  for (const fila of filas) {
    if (fila.campoResumen === 'otro') continue;
    const campoPath = `resumen.${fila.campoResumen}`;
    resumenUpdate[campoPath] = (resumenUpdate[campoPath] ?? 0) + fila.montoNeto;
  }

  if (Object.keys(resumenUpdate).length > 0) {
    await updateDoc(turnoRef, resumenUpdate);
    resultado.metodos.actualizados++;
  }
}

// ─── 4. Importar recibos (detalle por pedido) ─────────────────────────────────

async function importarRecibos(
  filas: FilaReciboLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  // Agrupar recibos por fecha para actualizar turno.resumen con desglose de métodos real
  const resumenPorFecha: Record<string, Record<string, number>> = {};

  for (const fila of filas) {
    try {
      if (!fila.fecha || !fila.numeroRecibo) {
        resultado.errores.push(`Recibo sin fecha o número: ${fila.descripcion}`);
        continue;
      }

      // Idempotencia por número de recibo
      const reciboRef = doc(db, 'Recibos', fila.numeroRecibo);
      const existing = await getDoc(reciboRef);
      if (existing.exists()) {
        resultado.recibos.omitidos++;
        continue;
      }

      await setDoc(reciboRef, {
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

      resultado.recibos.importados++;

      // Acumular para actualizar el resumen del turno
      if (fila.campoMetodo !== 'otro' && fila.tipoRecibo !== 'Refund') {
        if (!resumenPorFecha[fila.fecha]) resumenPorFecha[fila.fecha] = {};
        const campo = fila.campoMetodo;
        resumenPorFecha[fila.fecha][campo] = (resumenPorFecha[fila.fecha][campo] ?? 0) + fila.ventasNetas;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.errores.push(`Error en recibo ${fila.numeroRecibo}: ${msg}`);
    }
  }

  // Actualizar turnos con el desglose real de métodos de pago
  for (const [fecha, metodos] of Object.entries(resumenPorFecha)) {
    try {
      // Buscar turno(s) de esa fecha
      const qTurnos = query(collection(db, 'turnos'), where('fecha', '==', fecha));
      const turnosSnap = await getDocs(qTurnos);
      for (const turnoDoc of turnosSnap.docs) {
        const update: Record<string, number> = {};
        for (const [campo, monto] of Object.entries(metodos)) {
          update[`resumen.${campo}`] = monto;
        }
        const totalVentas = Object.values(metodos).reduce((s, v) => s + v, 0);
        update['resumen.totalVentas'] = totalVentas;
        await updateDoc(turnoDoc.ref, update);
        resultado.metodos.actualizados++;
      }
    } catch (_err) {
      // No bloquear si el turno no existe aún
    }
  }
}

// ─── 5. Importar recibos por artículo ────────────────────────────────────────

async function importarRecibosArticulo(
  filas: FilaReciboArticuloLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  const LOTE = 400;
  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);
    const batch = writeBatch(db);
    let count = 0;

    for (const fila of lote) {
      if (!fila.numeroRecibo || !fila.articulo) continue;
      // ID: recibo + índice dentro del recibo (no hay índice explícito, usamos artículo+variante)
      const docId = `${fila.numeroRecibo}_${fila.articulo}_${fila.variante}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
      const ref = doc(db, 'RecibosArticulo', docId);
      batch.set(ref, {
        ...fila,
        importadoDesdeCsv: true,
        importadoPor,
        creadoEn: Timestamp.now(),
      }, { merge: false });
      count++;
    }

    if (count > 0) {
      try {
        await batch.commit();
        resultado.recibosArticulo.importados += count;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        resultado.errores.push(`Error en lote recibos artículo: ${msg}`);
      }
    }
  }
}

// ─── 6. Importar resumen de ventas ────────────────────────────────────────────

async function importarResumenVentas(
  filas: FilaResumenVentasLoyverse[],
  importadoPor: string,
  resultado: ResultadoImportacionLoyverse
) {
  for (const fila of filas) {
    try {
      if (!fila.fecha) continue;
      const ref = doc(db, 'ResumenVentas', fila.fecha);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        resultado.resumenVentas.omitidos++;
        continue;
      }
      await setDoc(ref, {
        ...fila,
        importadoDesdeCsv: true,
        importadoPor,
        creadoEn: Timestamp.now(),
      });
      resultado.resumenVentas.importados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.errores.push(`Error en resumen ventas ${fila.fecha}: ${msg}`);
    }
  }
}

// ─── 7-10. Importar CSVs de ventas agregadas (artículo, categoría, empleado, modificador) ──

async function importarColeccionConPeriodo<T extends Record<string, unknown>>(
  filas: T[],
  coleccion: string,
  periodoLabel: string,
  claveId: keyof T,
  importadoPor: string,
  contadores: { importados: number; omitidos: number },
  errores: string[]
) {
  const LOTE = 400;
  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);
    const batch = writeBatch(db);
    let count = 0;

    for (const fila of lote) {
      const clave = String(fila[claveId] ?? '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
      if (!clave) continue;
      const docId = `${periodoLabel}_${clave}`;
      const ref = doc(db, coleccion, docId);
      batch.set(ref, {
        ...fila,
        periodo: periodoLabel,
        importadoDesdeCsv: true,
        importadoPor,
        creadoEn: Timestamp.now(),
      }, { merge: true });
      count++;
    }

    if (count > 0) {
      try {
        await batch.commit();
        contadores.importados += count;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errores.push(`Error en lote ${coleccion}: ${msg}`);
      }
    }
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function importarLoyverse(
  datos: DatosImportacionLoyverse,
  importadoPor: string
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

  // Orden: turnos primero para que recibos puedan enlazarlos
  if (datos.cajas?.length) {
    await importarTurnos(datos.cajas, importadoPor, resultado);
  }

  if (datos.movimientos?.length) {
    await importarMovimientos(datos.movimientos, importadoPor, resultado);
  }

  if (datos.metodos?.length && datos.turnoIdParaMetodos) {
    await actualizarMetodosPago(datos.metodos, datos.turnoIdParaMetodos, resultado);
  }

  if (datos.recibos?.length) {
    await importarRecibos(datos.recibos, importadoPor, resultado);
  }

  if (datos.recibosArticulo?.length) {
    await importarRecibosArticulo(datos.recibosArticulo, importadoPor, resultado);
  }

  if (datos.resumenVentas?.length) {
    await importarResumenVentas(datos.resumenVentas, importadoPor, resultado);
  }

  if (datos.ventasArticulo?.length) {
    await importarColeccionConPeriodo(
      datos.ventasArticulo as unknown as Record<string, unknown>[],
      'VentasArticulo', periodo, 'articulo', importadoPor,
      resultado.ventasArticulo, resultado.errores
    );
  }

  if (datos.ventasCategoria?.length) {
    await importarColeccionConPeriodo(
      datos.ventasCategoria as unknown as Record<string, unknown>[],
      'VentasCategoria', periodo, 'categoria', importadoPor,
      resultado.ventasCategoria, resultado.errores
    );
  }

  if (datos.ventasEmpleado?.length) {
    await importarColeccionConPeriodo(
      datos.ventasEmpleado as unknown as Record<string, unknown>[],
      'VentasEmpleado', periodo, 'empleado', importadoPor,
      resultado.ventasEmpleado, resultado.errores
    );
  }

  if (datos.ventasModificador?.length) {
    await importarColeccionConPeriodo(
      datos.ventasModificador as unknown as Record<string, unknown>[],
      'VentasModificador', periodo, 'modificador', importadoPor,
      resultado.ventasModificador, resultado.errores
    );
  }

  return resultado;
}
