/**
 * importacionCaja.service.ts
 * Old Texas BBQ - CRM
 *
 * Importa filas del CSV de Loyverse a la colección `turnos` + `CierresCaja`.
 * Cada fila del CSV representa un turno cerrado con su cierre ya calculado.
 *
 * Estrategia: si ya existe un turno con el mismo ID derivado (turno_FECHA_TIPO)
 * se omite el registro para evitar duplicados (operación idempotente).
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { FilaCajaCSV } from '@/lib/utils/parseCajaCSV';

export interface ResultadoImportacion {
  importados: number;
  omitidos: number;
  errores: string[];
}

/** Convierte "D/M/YY HH:MM", "DD/MM/YYYY HH:MM" o "YYYY-MM-DD HH:MM" a Date */
function toDate(s: string): Date {
  // D/M/YY HH:MM o DD/MM/YYYY HH:MM (día/mes/año con año 2 o 4 dígitos)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const rawYear = parseInt(m[3], 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const month = String(m[2]).padStart(2, '0');
    const day = String(m[1]).padStart(2, '0');
    const hour = String(m[4]).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T${hour}:${m[5]}:00`);
  }
  // ISO-like
  return new Date(s);
}

/** Detecta tipo de turno a partir de la hora de apertura */
function detectarTipo(horaApertura: string): 'matutino' | 'vespertino' | 'nocturno' {
  const d = toDate(horaApertura);
  const h = d.getHours();
  if (h >= 6 && h < 17) return 'matutino';
  if (h >= 17 && h < 23) return 'vespertino';
  return 'nocturno';
}

/**
 * Importa un array de filas parseadas del CSV.
 * @param filas        Resultado de parseCajaCSV()
 * @param importadoPor ID del usuario que realiza la importación
 */
export async function importarFilasCSV(
  filas: FilaCajaCSV[],
  importadoPor: string
): Promise<ResultadoImportacion> {
  if (!db) throw new Error('Firestore no disponible');

  const resultado: ResultadoImportacion = { importados: 0, omitidos: 0, errores: [] };

  for (const fila of filas) {
    try {
      if (!fila.fecha) {
        resultado.errores.push(
          `Fila sin fecha válida: turno ${fila.numeroTurno} (horaApertura cruda: "${fila.horaApertura}")`
        );
        continue;
      }

      const tipo = detectarTipo(fila.horaApertura);
      const turnoId = `turno_${fila.fecha}_${tipo}`;

      // Verificar si ya existe
      const turnoRef = doc(db, 'turnos', turnoId);
      const existing = await getDoc(turnoRef);
      if (existing.exists()) {
        resultado.omitidos++;
        continue;
      }

      const horaInicioDate = toDate(fila.horaApertura);
      const horaFinDate = fila.horaCierre ? toDate(fila.horaCierre) : horaInicioDate;

      // Usar la diferencia tal como viene del CSV de Loyverse (valor autoritativo)
      const diferenciaCsv = fila.diferencia;
      const montoEsperado = fila.fondoInicial + fila.ventasNetas;
      const montoReal = fila.pagosEfectivo;

      // Crear documento de turno (cerrado) — incluye campo `corte` para que
      // CorteCaja pueda leer turno.corte.diferencia directamente
      await setDoc(turnoRef, {
        tipo,
        fecha: fila.fecha,
        cajeroId: importadoPor,
        cajeroNombre: fila.abiertoPor || 'Importado',
        encargadoNombre: fila.cerradoPor || undefined,
        horaInicio: Timestamp.fromDate(horaInicioDate),
        horaFin: Timestamp.fromDate(horaFinDate),
        estado: 'cerrado',
        fondoInicial: fila.fondoInicial,
        resumen: {
          totalPedidos: 0,
          totalVentas: fila.ventasNetas,
          efectivo: fila.pagosEfectivo,
          tarjeta: 0,
          transferencia: 0,
          uber: 0,
          didi: 0,
          totalEnvios: 0,
          totalDescuentos: 0,
          totalComisionesRepartidores: 0,
        },
        // Campo corte — lo mismo que generaría cierreCaja.service al cerrar manualmente
        corte: {
          efectivoEsperado: montoEsperado,
          efectivoReal: montoReal,
          diferencia: diferenciaCsv,
          observaciones: `Importado desde CSV. Cerrado por: ${fila.cerradoPor || 'N/A'}`,
          cerradoPor: importadoPor,
          cerradoPorNombre: fila.cerradoPor || 'Importado (sin registrar)',
          horaCierre: Timestamp.fromDate(horaFinDate),
        },
        importadoDesdeCsv: true,
        importadoPor,
        fechaCreacion: Timestamp.now(),
        fechaActualizacion: Timestamp.now(),
      });

      // Crear documento en CierresCaja también (para hooks useCierreTurno)
      await addDoc(collection(db, 'CierresCaja'), {
        turno_id: turnoId,
        monto_esperado: montoEsperado,
        monto_real: montoReal,
        diferencia: diferenciaCsv,
        notas: `Importado desde CSV. Cerrado por: ${fila.cerradoPor || 'N/A'}`,
        fecha: Timestamp.fromDate(horaFinDate),
        usuario_id: importadoPor,
        usuario_nombre: fila.cerradoPor || 'Importado (sin registrar)',
        importadoDesdeCsv: true,
      });

      resultado.importados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.errores.push(`Error en turno ${fila.numeroTurno}: ${msg}`);
    }
  }

  return resultado;
}
