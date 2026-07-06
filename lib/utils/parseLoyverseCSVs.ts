/**
 * parseLoyverseCSVs.ts
 * Old Texas BBQ - CRM
 *
 * Parsers para los 10 tipos de CSV que exporta Loyverse.
 * Auto-detección de tipo por columnas de encabezado.
 */

// ─── Helpers compartidos ──────────────────────────────────────────────────────

/** Limpia artefactos de re-encoding Latin-1 → UTF-8 de Loyverse. */
export function fixEncoding(s: string): string {
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

/** Convierte "$1,234.56", "1,234.56" o "-456.78" en número. */
function parseMXN(s: string): number {
  const clean = s.replace(/[$,%\s]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/** Detecta separador del CSV (;, tab, coma). */
function detectSep(firstLine: string): string {
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes('\t')) return '\t';
  return ',';
}

/** Divide una línea CSV respetando campos entre comillas. */
export function parseLine(line: string, sep: string): string[] {
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

/** Normaliza un encabezado quitando comillas, espacios, diacríticos y lowercasing. */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Extrae "YYYY-MM-DD" de múltiples formatos de fecha de Loyverse. */
export function extraerFecha(s: string): string {
  if (!s || !s.trim()) return '';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const rawYear = parseInt(slash[3], 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const y = String(year);
    if (a > 12) return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    if (b > 12) return `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
}

// ─── Auto-detección de tipo de CSV ────────────────────────────────────────────

export type TipoCSVLoyverse =
  | 'cajas'
  | 'movimientos'
  | 'metodos_pago'
  | 'recibos'
  | 'recibos_articulo'
  | 'resumen_ventas'
  | 'ventas_articulo'
  | 'ventas_categoria'
  | 'ventas_empleado'
  | 'ventas_modificador'
  | 'desconocido';

/** Detecta el tipo de CSV Loyverse por sus columnas de encabezado. */
export function detectarTipoCSV(csvText: string): TipoCSVLoyverse {
  const fixed = fixEncoding(csvText);
  const firstLine = fixed.split(/\r?\n/)[0] || '';
  const sep = detectSep(firstLine);
  const headers = parseLine(firstLine, sep).map(normalizeHeader);
  const has = (kw: string) => headers.some((h) => h.includes(kw));

  // Recibos por artículo — tiene "articulo" Y "numero de recibo"
  if ((has('articulo') || has('ref')) && has('numero de recibo')) return 'recibos_articulo';

  // Recibos — tiene "numero de recibo" sin "articulo"
  if (has('numero de recibo')) return 'recibos';

  // Cajas — tiene "numero del cierre" o patrón de apertura/cierre
  if ((has('numero del cierre') || has('numero de cierre') || has('cierre de caja')) && has('apertura')) return 'cajas';

  // Movimientos (pagos/salidas) — tiene "comentario" + "cierre de caja"
  if (has('comentario') && (has('cierre de caja') || has('numero del cierre') || has('numero de cierre'))) return 'movimientos';
  if (has('comentario') && has('tipo') && has('empleado')) return 'movimientos';

  // Métodos de pago — tiene "tipo de pago" + "transacciones"
  if (has('tipo de pago') && (has('transacciones') || has('monto'))) return 'metodos_pago';

  // Ventas por modificador — tiene "modificador"
  if (has('modificador')) return 'ventas_modificador';

  // Ventas por empleado — tiene "empleado" + "ventas brutas" sin recibo
  if (has('empleado') && has('ventas brutas')) return 'ventas_empleado';

  // Ventas por categoría — tiene "categoria" + "ventas brutas" sin artículo/recibo
  if ((has('categoria') || has('categoría')) && has('ventas brutas')) return 'ventas_categoria';

  // Ventas por artículo — tiene "articulo" o "ref" + "ventas brutas"
  if ((has('articulo') || has('ref')) && has('ventas brutas')) return 'ventas_articulo';

  // Resumen de ventas — tiene "ventas brutas" + "margen" o "beneficio bruto"
  if (has('ventas brutas') && (has('margen') || has('beneficio bruto'))) return 'resumen_ventas';

  return 'desconocido';
}

export const ETIQUETAS_CSV: Record<TipoCSVLoyverse, { label: string; descripcion: string }> = {
  cajas:             { label: 'Resumen de turnos caja',    descripcion: 'Apertura, cierre, efectivo real y descuadre por turno' },
  movimientos:       { label: 'Pagos de entrada y salida', descripcion: 'Movimientos manuales de caja por turno' },
  metodos_pago:      { label: 'Ventas por tipo de pago',   descripcion: 'Totales por método (efectivo, tarjeta, Uber, DiDi)' },
  recibos:           { label: 'Recibos',                   descripcion: 'Detalle por pedido con método de pago y cajero' },
  recibos_articulo:  { label: 'Recibos por artículo',      descripcion: 'Línea a línea de productos por pedido' },
  resumen_ventas:    { label: 'Resumen de ventas',         descripcion: 'Ventas diarias agregadas con costo y margen' },
  ventas_articulo:   { label: 'Ventas por artículo',       descripcion: 'Ranking de productos vendidos' },
  ventas_categoria:  { label: 'Ventas por categoría',      descripcion: 'Ventas agrupadas por categoría de menú' },
  ventas_empleado:   { label: 'Ventas por empleado',       descripcion: 'Ventas y pedidos por cajero/empleado' },
  ventas_modificador:{ label: 'Ventas por modificador',    descripcion: 'Modificadores y complementos usados' },
  desconocido:       { label: 'CSV no reconocido',         descripcion: 'Formato no identificado' },
};

// ─── 1. CSV CAJAS ─────────────────────────────────────────────────────────────

export interface FilaCajasLoyverse {
  tienda: string;
  tpv: string;
  numeroCierre: string;
  horaApertura: string;
  abiertoPor: string;
  horaCierre: string;
  cerradoPor: string;
  fondoAnterior: number;
  cobrosEfectivo: number;
  reembolsosEfectivo: number;
  depositado: number;
  pagosSalidas: number;
  efectivoTeorico: number;
  efectivoReal: number;
  descuadre: number;
  fecha: string;
}

export function parseCajasLoyverse(csvText: string): FilaCajasLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    tienda:            col(['tienda']),
    tpv:               col(['tpv', 'terminal', 'punto de venta']),
    numeroCierre:      col(['numero del cierre', 'numero de cierre', 'cierre de caja', 'numero']),
    horaApertura:      col(['apertura del turno', 'hora de apertura', 'apertura']),
    abiertoPor:        col(['abierto']),
    horaCierre:        col(['cierre del turno', 'hora de cierre', 'cierre']),
    cerradoPor:        col(['cerrado']),
    fondoAnterior:     col(['fondo de caja anterior', 'fondo anterior', 'importe de apertura', 'fondo']),
    cobrosEfectivo:    col(['cobros en efectivo']),
    reembolsosEfectivo:col(['reembolsos en efectivo']),
    depositado:        col(['depositado']),
    pagosSalidas:      col(['pagos/salidas', 'pagos salidas', 'salidas']),
    efectivoTeorico:   col(['efectivo teorico', 'teorico']),
    efectivoReal:      col(['efectivo real', 'cantidad de efectivo', 'real']),
    descuadre:         col(['descuadre', 'diferencia']),
  };

  const rows: FilaCajasLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 3) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const horaApertura = get(idx.horaApertura);
    const fecha = extraerFecha(horaApertura);

    rows.push({
      tienda:             get(idx.tienda),
      tpv:                get(idx.tpv),
      numeroCierre:       get(idx.numeroCierre),
      horaApertura,
      abiertoPor:         get(idx.abiertoPor),
      horaCierre:         get(idx.horaCierre),
      cerradoPor:         get(idx.cerradoPor),
      fondoAnterior:      parseMXN(get(idx.fondoAnterior)),
      cobrosEfectivo:     parseMXN(get(idx.cobrosEfectivo)),
      reembolsosEfectivo: parseMXN(get(idx.reembolsosEfectivo)),
      depositado:         parseMXN(get(idx.depositado)),
      pagosSalidas:       parseMXN(get(idx.pagosSalidas)),
      efectivoTeorico:    parseMXN(get(idx.efectivoTeorico)),
      efectivoReal:       parseMXN(get(idx.efectivoReal)),
      descuadre:          parseMXN(get(idx.descuadre)),
      fecha,
    });
  }

  return rows;
}

// ─── 2. CSV MOVIMIENTOS (Pagos/Salidas) ───────────────────────────────────────

export interface FilaMovimientoLoyverse {
  fecha: string;
  fechaRaw: string;
  tienda: string;
  tpv: string;
  numeroCierre: string;
  tipo: string;
  empleado: string;
  comentario: string;
  cantidad: number;
}

export function parseMovimientosLoyverse(csvText: string): FilaMovimientoLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    fecha:        col(['fecha']),
    tienda:       col(['tienda']),
    tpv:          col(['tpv', 'terminal']),
    numeroCierre: col(['cierre de caja', 'numero del cierre', 'numero de cierre', 'numero']),
    tipo:         col(['tipo']),
    empleado:     col(['empleado']),
    comentario:   col(['comentario', 'descripcion', 'nota']),
    cantidad:     col(['cantidad', 'monto', 'importe']),
  };

  const rows: FilaMovimientoLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 3) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const fechaRaw = get(idx.fecha);
    rows.push({
      fecha:        extraerFecha(fechaRaw),
      fechaRaw,
      tienda:       get(idx.tienda),
      tpv:          get(idx.tpv),
      numeroCierre: get(idx.numeroCierre),
      tipo:         get(idx.tipo),
      empleado:     get(idx.empleado),
      comentario:   get(idx.comentario),
      cantidad:     parseMXN(get(idx.cantidad)),
    });
  }

  return rows;
}

// ─── 3. CSV MÉTODOS DE PAGO ───────────────────────────────────────────────────

export interface FilaMetodoPagoLoyverse {
  tipoPago: string;
  transaccionesPago: number;
  montoPagos: number;
  reembolsoTransacciones: number;
  importeReembolsos: number;
  montoNeto: number;
  campoResumen: 'efectivo' | 'tarjeta' | 'transferencia' | 'uber' | 'didi' | 'otro';
}

export function mapearMetodoPago(tipo: string): FilaMetodoPagoLoyverse['campoResumen'] {
  const t = tipo.toLowerCase();
  if (t.includes('cash') || t.includes('efectivo')) return 'efectivo';
  if (t.includes('card') || t.includes('tarjeta') || t.includes('debit') || t.includes('credit')) return 'tarjeta';
  if (t.includes('transfer') || t.includes('transferencia')) return 'transferencia';
  if (t.includes('uber')) return 'uber';
  if (t.includes('didi')) return 'didi';
  return 'otro';
}

export function parseMetodosPagoLoyverse(csvText: string): FilaMetodoPagoLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    tipoPago:              col(['tipo de pago', 'metodo de pago', 'payment type', 'tipo']),
    transaccionesPago:     col(['transacciones de pago', 'payment transactions', 'transacciones']),
    montoPagos:            col(['monto de pagos', 'payment amount', 'monto']),
    reembolsoTransacciones:col(['reembolso transacciones', 'refund transactions']),
    importeReembolsos:     col(['importe del reembolso', 'refund amount', 'reembolso']),
    montoNeto:             col(['monto neto', 'net amount', 'neto']),
  };

  const rows: FilaMetodoPagoLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 2) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const tipoPago = get(idx.tipoPago);
    if (!tipoPago) continue;

    rows.push({
      tipoPago,
      transaccionesPago:      parseMXN(get(idx.transaccionesPago)),
      montoPagos:             parseMXN(get(idx.montoPagos)),
      reembolsoTransacciones: parseMXN(get(idx.reembolsoTransacciones)),
      importeReembolsos:      parseMXN(get(idx.importeReembolsos)),
      montoNeto:              parseMXN(get(idx.montoNeto)),
      campoResumen:           mapearMetodoPago(tipoPago),
    });
  }

  return rows;
}

// ─── 4. CSV RECIBOS ───────────────────────────────────────────────────────────

export interface FilaReciboLoyverse {
  fecha: string;
  fechaRaw: string;
  numeroRecibo: string;
  tipoRecibo: string;
  ventasBrutas: number;
  descuentos: number;
  ventasNetas: number;
  impuestos: number;
  propinas: number;
  totalRecaudado: number;
  costoMercancia: number;
  beneficioBruto: number;
  tipoPago: string;
  descripcion: string;
  tipoPedido: string;
  tpv: string;
  tienda: string;
  cajero: string;
  cliente: string;
  estado: string;
  campoMetodo: FilaMetodoPagoLoyverse['campoResumen'];
}

export function parseRecibosLoyverse(csvText: string): FilaReciboLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    fecha:          col(['fecha']),
    numeroRecibo:   col(['numero de recibo', 'recibo']),
    tipoRecibo:     col(['tipo de recibo']),
    ventasBrutas:   col(['ventas brutas']),
    descuentos:     col(['descuentos']),
    ventasNetas:    col(['ventas netas']),
    impuestos:      col(['impuestos']),
    propinas:       col(['propinas']),
    totalRecaudado: col(['total recaudado']),
    costoMercancia: col(['costo de los bienes', 'costo']),
    beneficioBruto: col(['beneficio bruto']),
    tipoPago:       col(['tipo de pago']),
    descripcion:    col(['descripcion']),
    tipoPedido:     col(['tipo de pedido']),
    tpv:            col(['tpv', 'terminal']),
    tienda:         col(['tienda']),
    cajero:         col(['nombre del cajero', 'cajero']),
    cliente:        col(['nombre del cliente', 'cliente']),
    estado:         col(['estado']),
  };

  const rows: FilaReciboLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 3) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const fechaRaw = get(idx.fecha);
    const tipoPago = get(idx.tipoPago);

    rows.push({
      fecha:          extraerFecha(fechaRaw),
      fechaRaw,
      numeroRecibo:   get(idx.numeroRecibo),
      tipoRecibo:     get(idx.tipoRecibo),
      ventasBrutas:   parseMXN(get(idx.ventasBrutas)),
      descuentos:     parseMXN(get(idx.descuentos)),
      ventasNetas:    parseMXN(get(idx.ventasNetas)),
      impuestos:      parseMXN(get(idx.impuestos)),
      propinas:       parseMXN(get(idx.propinas)),
      totalRecaudado: parseMXN(get(idx.totalRecaudado)),
      costoMercancia: parseMXN(get(idx.costoMercancia)),
      beneficioBruto: parseMXN(get(idx.beneficioBruto)),
      tipoPago,
      descripcion:    get(idx.descripcion),
      tipoPedido:     get(idx.tipoPedido),
      tpv:            get(idx.tpv),
      tienda:         get(idx.tienda),
      cajero:         get(idx.cajero),
      cliente:        get(idx.cliente),
      estado:         get(idx.estado),
      campoMetodo:    mapearMetodoPago(tipoPago),
    });
  }

  return rows;
}

// ─── 5. CSV RECIBOS POR ARTÍCULO ──────────────────────────────────────────────

export interface FilaReciboArticuloLoyverse {
  fecha: string;
  fechaRaw: string;
  numeroRecibo: string;
  tipoRecibo: string;
  categoria: string;
  ref: string;
  articulo: string;
  variante: string;
  modificadores: string;
  cantidad: number;
  ventasBrutas: number;
  descuentos: number;
  ventasNetas: number;
  costo: number;
  beneficio: number;
  impuestos: number;
  tipoPedido: string;
  tpv: string;
  tienda: string;
  cajero: string;
  cliente: string;
  comentario: string;
  estado: string;
}

export function parseRecibosArticuloLoyverse(csvText: string): FilaReciboArticuloLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    fecha:         col(['fecha']),
    numeroRecibo:  col(['numero de recibo', 'recibo']),
    tipoRecibo:    col(['tipo de recibo']),
    categoria:     col(['categoria']),
    ref:           col(['ref']),
    articulo:      col(['articulo']),
    variante:      col(['variante']),
    modificadores: col(['modificadores']),
    cantidad:      col(['cantidad']),
    ventasBrutas:  col(['ventas brutas']),
    descuentos:    col(['descuentos']),
    ventasNetas:   col(['ventas netas']),
    costo:         col(['costo']),
    beneficio:     col(['beneficio']),
    impuestos:     col(['impuestos']),
    tipoPedido:    col(['tipo de pedido']),
    tpv:           col(['tpv', 'terminal']),
    tienda:        col(['tienda']),
    cajero:        col(['nombre del cajero', 'cajero']),
    cliente:       col(['nombre del cliente', 'cliente']),
    comentario:    col(['comentario']),
    estado:        col(['estado']),
  };

  const rows: FilaReciboArticuloLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 3) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const fechaRaw = get(idx.fecha);

    rows.push({
      fecha:         extraerFecha(fechaRaw),
      fechaRaw,
      numeroRecibo:  get(idx.numeroRecibo),
      tipoRecibo:    get(idx.tipoRecibo),
      categoria:     get(idx.categoria),
      ref:           get(idx.ref),
      articulo:      get(idx.articulo),
      variante:      get(idx.variante),
      modificadores: get(idx.modificadores),
      cantidad:      parseMXN(get(idx.cantidad)),
      ventasBrutas:  parseMXN(get(idx.ventasBrutas)),
      descuentos:    parseMXN(get(idx.descuentos)),
      ventasNetas:   parseMXN(get(idx.ventasNetas)),
      costo:         parseMXN(get(idx.costo)),
      beneficio:     parseMXN(get(idx.beneficio)),
      impuestos:     parseMXN(get(idx.impuestos)),
      tipoPedido:    get(idx.tipoPedido),
      tpv:           get(idx.tpv),
      tienda:        get(idx.tienda),
      cajero:        get(idx.cajero),
      cliente:       get(idx.cliente),
      comentario:    get(idx.comentario),
      estado:        get(idx.estado),
    });
  }

  return rows;
}

// ─── 6. CSV RESUMEN DE VENTAS ─────────────────────────────────────────────────

export interface FilaResumenVentasLoyverse {
  fecha: string;
  ventasBrutas: number;
  reembolsos: number;
  descuentos: number;
  ventasNetas: number;
  costoMercancia: number;
  beneficioBruto: number;
  margen: number;
  impuestos: number;
}

export function parseResumenVentasLoyverse(csvText: string): FilaResumenVentasLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    fecha:          col(['fecha']),
    ventasBrutas:   col(['ventas brutas']),
    reembolsos:     col(['reembolsos']),
    descuentos:     col(['descuentos']),
    ventasNetas:    col(['ventas netas']),
    costoMercancia: col(['costo de los bienes', 'costo']),
    beneficioBruto: col(['beneficio bruto']),
    margen:         col(['margen']),
    impuestos:      col(['impuestos']),
  };

  const rows: FilaResumenVentasLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 2) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const fechaRaw = get(idx.fecha);
    const fecha = extraerFecha(fechaRaw) || fechaRaw;
    if (!fecha) continue;

    rows.push({
      fecha,
      ventasBrutas:   parseMXN(get(idx.ventasBrutas)),
      reembolsos:     parseMXN(get(idx.reembolsos)),
      descuentos:     parseMXN(get(idx.descuentos)),
      ventasNetas:    parseMXN(get(idx.ventasNetas)),
      costoMercancia: parseMXN(get(idx.costoMercancia)),
      beneficioBruto: parseMXN(get(idx.beneficioBruto)),
      margen:         parseMXN(get(idx.margen)),
      impuestos:      parseMXN(get(idx.impuestos)),
    });
  }

  return rows;
}

// ─── 7. CSV VENTAS POR ARTÍCULO ───────────────────────────────────────────────

export interface FilaVentasArticuloLoyverse {
  ref: string;
  articulo: string;
  variante: string;
  categoria: string;
  cantidad: number;
  ventasBrutas: number;
  descuentos: number;
  ventasNetas: number;
  costoUnidad: number;
  costoTotal: number;
  beneficio: number;
  margen: number;
}

export function parseVentasArticuloLoyverse(csvText: string): FilaVentasArticuloLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    ref:          col(['ref']),
    articulo:     col(['articulo']),
    variante:     col(['variante']),
    categoria:    col(['categoria']),
    cantidad:     col(['cantidad']),
    ventasBrutas: col(['ventas brutas']),
    descuentos:   col(['descuentos']),
    ventasNetas:  col(['ventas netas']),
    costoUnidad:  col(['costo unitario', 'costo por unidad']),
    costoTotal:   col(['costo total', 'costo de los bienes', 'costo']),
    beneficio:    col(['beneficio']),
    margen:       col(['margen']),
  };

  const rows: FilaVentasArticuloLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 2) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const articulo = get(idx.articulo);
    if (!articulo) continue;

    rows.push({
      ref:          get(idx.ref),
      articulo,
      variante:     get(idx.variante),
      categoria:    get(idx.categoria),
      cantidad:     parseMXN(get(idx.cantidad)),
      ventasBrutas: parseMXN(get(idx.ventasBrutas)),
      descuentos:   parseMXN(get(idx.descuentos)),
      ventasNetas:  parseMXN(get(idx.ventasNetas)),
      costoUnidad:  parseMXN(get(idx.costoUnidad)),
      costoTotal:   parseMXN(get(idx.costoTotal)),
      beneficio:    parseMXN(get(idx.beneficio)),
      margen:       parseMXN(get(idx.margen)),
    });
  }

  return rows;
}

// ─── 8. CSV VENTAS POR CATEGORÍA ──────────────────────────────────────────────

export interface FilaVentasCategoriaLoyverse {
  categoria: string;
  cantidad: number;
  ventasBrutas: number;
  descuentos: number;
  ventasNetas: number;
  costoTotal: number;
  beneficio: number;
  margen: number;
}

export function parseVentasCategoriaLoyverse(csvText: string): FilaVentasCategoriaLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    categoria:    col(['categoria']),
    cantidad:     col(['cantidad']),
    ventasBrutas: col(['ventas brutas']),
    descuentos:   col(['descuentos']),
    ventasNetas:  col(['ventas netas']),
    costoTotal:   col(['costo']),
    beneficio:    col(['beneficio']),
    margen:       col(['margen']),
  };

  const rows: FilaVentasCategoriaLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 2) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const categoria = get(idx.categoria);
    if (!categoria) continue;

    rows.push({
      categoria,
      cantidad:     parseMXN(get(idx.cantidad)),
      ventasBrutas: parseMXN(get(idx.ventasBrutas)),
      descuentos:   parseMXN(get(idx.descuentos)),
      ventasNetas:  parseMXN(get(idx.ventasNetas)),
      costoTotal:   parseMXN(get(idx.costoTotal)),
      beneficio:    parseMXN(get(idx.beneficio)),
      margen:       parseMXN(get(idx.margen)),
    });
  }

  return rows;
}

// ─── 9. CSV VENTAS POR EMPLEADO ───────────────────────────────────────────────

export interface FilaVentasEmpleadoLoyverse {
  empleado: string;
  pedidos: number;
  ventasBrutas: number;
  reembolsos: number;
  descuentos: number;
  ventasNetas: number;
  costoTotal: number;
  beneficio: number;
}

export function parseVentasEmpleadoLoyverse(csvText: string): FilaVentasEmpleadoLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    empleado:     col(['empleado', 'nombre del cajero', 'cajero']),
    pedidos:      col(['pedidos', 'transacciones', 'ventas']),
    ventasBrutas: col(['ventas brutas']),
    reembolsos:   col(['reembolsos']),
    descuentos:   col(['descuentos']),
    ventasNetas:  col(['ventas netas']),
    costoTotal:   col(['costo']),
    beneficio:    col(['beneficio']),
  };

  const rows: FilaVentasEmpleadoLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 2) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const empleado = get(idx.empleado);
    if (!empleado) continue;

    rows.push({
      empleado,
      pedidos:      parseMXN(get(idx.pedidos)),
      ventasBrutas: parseMXN(get(idx.ventasBrutas)),
      reembolsos:   parseMXN(get(idx.reembolsos)),
      descuentos:   parseMXN(get(idx.descuentos)),
      ventasNetas:  parseMXN(get(idx.ventasNetas)),
      costoTotal:   parseMXN(get(idx.costoTotal)),
      beneficio:    parseMXN(get(idx.beneficio)),
    });
  }

  return rows;
}

// ─── 10. CSV VENTAS POR MODIFICADOR ──────────────────────────────────────────

export interface FilaVentasModificadorLoyverse {
  modificador: string;
  opcion: string;
  cantidad: number;
  ventasBrutas: number;
  descuentos: number;
  ventasNetas: number;
  costoTotal: number;
  beneficio: number;
}

export function parseVentasModificadorLoyverse(csvText: string): FilaVentasModificadorLoyverse[] {
  const fixed = fixEncoding(csvText);
  const lines = fixed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const headers = parseLine(lines[0], sep).map(normalizeHeader);

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const idx = {
    modificador:  col(['modificador']),
    opcion:       col(['opcion', 'variante']),
    cantidad:     col(['cantidad']),
    ventasBrutas: col(['ventas brutas']),
    descuentos:   col(['descuentos']),
    ventasNetas:  col(['ventas netas']),
    costoTotal:   col(['costo']),
    beneficio:    col(['beneficio']),
  };

  const rows: FilaVentasModificadorLoyverse[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    if (cols.length < 2) continue;

    const get = (index: number) =>
      index >= 0 && index < cols.length ? cols[index].replace(/^["']|["']$/g, '').trim() : '';

    const modificador = get(idx.modificador);
    if (!modificador) continue;

    rows.push({
      modificador,
      opcion:       get(idx.opcion),
      cantidad:     parseMXN(get(idx.cantidad)),
      ventasBrutas: parseMXN(get(idx.ventasBrutas)),
      descuentos:   parseMXN(get(idx.descuentos)),
      ventasNetas:  parseMXN(get(idx.ventasNetas)),
      costoTotal:   parseMXN(get(idx.costoTotal)),
      beneficio:    parseMXN(get(idx.beneficio)),
    });
  }

  return rows;
}
