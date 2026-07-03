/**
 * parseCajaCSV
 * Old Texas BBQ - CRM
 *
 * Parsea el CSV de turnos exportado desde Loyverse.
 * Maneja el problema de encoding Latin-1 → UTF-8 que produce artefactos
 * como "NÃºmero" → "Número".
 *
 * Columnas esperadas (Loyverse "Resumen de turno"):
 *   Número de turno, Hora de apertura, Hora de cierre,
 *   Importe de apertura, Ventas netas, Pagos en efectivo,
 *   Diferencia, Abierto por, Cerrado por
 */

export interface FilaCajaCSV {
  numeroTurno: string;
  horaApertura: string;
  horaCierre: string;
  fondoInicial: number;
  ventasNetas: number;
  pagosEfectivo: number;
  diferencia: number;
  abiertoPor: string;
  cerradoPor: string;
  // Fecha derivada del campo horaApertura (YYYY-MM-DD)
  fecha: string;
}

/** Limpia artefactos de encoding Latin-1 leído como UTF-8. */
function fixEncoding(s: string): string {
  return s
    .replace(/NÃºmero/g, 'Número')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .trim();
}

/** Convierte "$1,234.56" o "1234.56" en número. */
function parseMXN(s: string): number {
  const clean = s.replace(/[$,\s]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Extrae "YYYY-MM-DD" de cualquier formato de fecha que Loyverse pueda exportar.
 *
 * Formatos soportados:
 *   - "25/06/2026 08:30"       DD/MM/YYYY (Europa/Latinoamérica, 2 dígitos)
 *   - "5/6/2026 8:30"          D/M/YYYY  (1 dígito posible)
 *   - "06/25/2026 08:30 AM"    MM/DD/YYYY (formato americano con AM/PM)
 *   - "2026-06-25 08:30"       YYYY-MM-DD (ISO-like)
 *   - "2026-06-25T08:30:00"    ISO 8601
 */
function extraerFecha(s: string): string {
  if (!s || !s.trim()) return '';

  // ISO 8601 / YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // D/M/YY, DD/MM/YY, D/M/YYYY, DD/MM/YYYY, MM/DD/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    // Año de 2 dígitos → 2000+
    const rawYear = parseInt(slash[3], 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const yearStr = String(year);
    // Si el primer número > 12, es DD/MM (día primero) — caso de Loyverse México
    if (a > 12) {
      return `${yearStr}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    // Si el segundo número > 12, es MM/DD (mes primero, americano)
    if (b > 12) {
      return `${yearStr}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    }
    // Ambiguo: asumir DD/MM (más común en México)
    return `${yearStr}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  }

  // Intentar con Date.parse como último recurso
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return '';
}

/**
 * Parsea el contenido de un archivo CSV de Loyverse.
 *
 * @param csvText  Texto completo del archivo (ya leído como string)
 * @returns        Array de filas parseadas
 */
export function parseCajaCSV(csvText: string): FilaCajaCSV[] {
  // Diagnóstico solo en desarrollo — evita exponer datos (montos, nombres de
  // cajeros) en la consola del navegador cuando se importa en producción.
  const DEBUG = typeof window !== 'undefined' && process.env.NODE_ENV !== 'production';

  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return [];

  // Detectar separador: punto y coma, tabulador o coma
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

  // Normalizar encabezados — quitar comillas, espacios, normalizar tildes
  const rawHeaders = parseLine(firstLine, sep);
  const headers = rawHeaders.map((h) =>
    h.trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos para comparación
  );

  // Log de diagnóstico — solo en desarrollo
  if (DEBUG) {
    console.log('[parseCajaCSV] Separador detectado:', JSON.stringify(sep));
    console.log('[parseCajaCSV] Encabezados:', headers);
    console.log('[parseCajaCSV] Primera fila de datos:', lines[1]);
  }

  // Mapear índices de columnas de forma flexible (sin tildes para la comparación)
  const idx = {
    numero: headers.findIndex((h) =>
      h.includes('numero') || h.includes('turno') || h === '#'
    ),
    apertura: headers.findIndex((h) =>
      h.includes('apertura') || h.includes('inicio') || h.includes('abierto') && h.includes('hora')
    ),
    cierre: headers.findIndex((h) =>
      h.includes('cierre') || h.includes('cerrado') && h.includes('hora')
    ),
    fondo: headers.findIndex((h) =>
      h.includes('importe') || h.includes('fondo') || h.includes('apertura') && h.includes('monto')
    ),
    ventas: headers.findIndex((h) =>
      (h.includes('venta') && h.includes('neta')) || h === 'ventas netas' || h.includes('total ventas')
    ),
    efectivo: headers.findIndex((h) =>
      (h.includes('efectivo') && (h.includes('cobro') || h.includes('pago') || h.includes('total'))) ||
      h === 'cobros en efectivo' || h === 'pagos en efectivo'
    ),
    diferencia: headers.findIndex((h) =>
      h.includes('diferencia') || h.includes('descuadre')
    ),
    abiertoPor: headers.findIndex((h) =>
      h.includes('abierto por') || (h.includes('abierto') && !h.includes('hora')) || h.includes('cajero apertura')
    ),
    cerradoPor: headers.findIndex((h) =>
      h.includes('cerrado por') || (h.includes('cerrado') && !h.includes('hora')) || h.includes('cajero cierre')
    ),
  };

  if (DEBUG) {
    console.log('[parseCajaCSV] Índices de columnas:', idx);
  }

  // Si no encontramos la columna de apertura, intentar por posición (col 1 o 2)
  if (idx.apertura === -1) {
    // Buscar cualquier columna que contenga una fecha en la primera fila de datos
    const dataCols = parseLine(lines[1], sep).map((v) => v.replace(/^["']|["']$/g, '').trim());
    idx.apertura = dataCols.findIndex((v) => extraerFecha(v) !== '');
    if (DEBUG) {
      console.log('[parseCajaCSV] Columna apertura auto-detectada por datos:', idx.apertura, dataCols);
    }
  }

  const rows: FilaCajaCSV[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 3) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length
        ? cols[index].replace(/^["']|["']$/g, '').trim()
        : '';

    const horaApertura = get(idx.apertura);
    const fecha = extraerFecha(horaApertura);

    rows.push({
      numeroTurno: get(idx.numero),
      horaApertura,
      horaCierre: get(idx.cierre),
      fondoInicial: parseMXN(get(idx.fondo)),
      ventasNetas: parseMXN(get(idx.ventas)),
      pagosEfectivo: parseMXN(get(idx.efectivo)),
      diferencia: parseMXN(get(idx.diferencia)),
      abiertoPor: get(idx.abiertoPor),
      cerradoPor: get(idx.cerradoPor),
      fecha,
    });
  }

  return rows;
}

/** Divide una línea CSV respetando campos entre comillas. */
function parseLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
