/**
 * Generador de PDF para Reportes Financieros — Old Texas BBQ CRM
 *
 * Exporta el resumen de métricas (ventas, egresos, ganancia neta)
 * a un PDF profesional usando jsPDF + jspdf-autotable.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ResumenMetricas } from './dashboardMetricas.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RED: [number, number, number]       = [237, 28, 36];
const DARK: [number, number, number]      = [40, 40, 40];
const GRAY: [number, number, number]      = [110, 110, 110];
const LIGHT: [number, number, number]     = [245, 245, 245];
const WHITE: [number, number, number]     = [255, 255, 255];
const GREEN_T: [number, number, number]   = [22, 163, 74];
const RED_T: [number, number, number]     = [220, 38, 38];

function pesos(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function seccionTitulo(doc: jsPDF, texto: string, y: number, pageWidth: number): number {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(14, y, pageWidth - 28, 8, 1, 1, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(texto.toUpperCase(), 18, y + 5.5);
  return y + 13;
}

// ─── Exportar reporte de métricas ─────────────────────────────────────────────

export function exportarReporteMetricasPDF(
  metricas: ResumenMetricas,
  titulo = 'Reporte Financiero'
): void {
  const doc       = new jsPDF();
  const pw        = doc.internal.pageSize.getWidth();
  const labelFin  = format(metricas.periodo.fin,    "dd 'de' MMMM 'de' yyyy", { locale: es });
  const labelIni  = format(metricas.periodo.inicio, "dd 'de' MMMM 'de' yyyy", { locale: es });

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFillColor(...RED);
  doc.rect(0, 0, pw, 42, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('OLD TEXAS BBQ', pw / 2, 14, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(titulo, pw / 2, 23, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`${labelIni} — ${labelFin}`, pw / 2, 32, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, pw / 2, 39, { align: 'center' });

  let y = 52;

  // ── KPIs principales ────────────────────────────────────────────────────────
  y = seccionTitulo(doc, 'Resumen General', y, pw);

  const kpis = [
    ['Ventas totales',       pesos(metricas.totalVentas),      GREEN_T],
    ['Total egresos',        pesos(metricas.totalEgresos),      RED_T],
    ['Ganancia neta',        pesos(metricas.gananciaNeta),      metricas.gananciaNeta >= 0 ? GREEN_T : RED_T],
    ['Pedidos completados',  String(metricas.totalPedidos),     DARK],
    ['Ticket promedio',      pesos(metricas.ticketPromedio),    DARK],
    ['Pedidos cancelados',   String(metricas.pedidosCancelados), DARK],
    ['Costo de inventario',  pesos(metricas.costoInventario),   DARK],
  ] as [string, string, [number, number, number]][];

  const colW = (pw - 28) / 2;
  const colX = [14, 14 + colW + 4];
  let kpiY = y;

  kpis.forEach(([label, val, color], i) => {
    const x = colX[i % 2];
    if (i % 2 === 0 && i > 0) kpiY += 16;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, kpiY, colW, 13, 1, 1, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 3, kpiY + 4.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(val, x + colW - 3, kpiY + 10, { align: 'right' });
  });

  y = kpiY + 18;

  // ── Ventas por método de pago ────────────────────────────────────────────────
  const metodos = Object.entries(metricas.ventasPorMetodoPago)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (metodos.length > 0) {
    y = seccionTitulo(doc, 'Ventas por Método de Pago', y, pw);

    autoTable(doc, {
      startY: y,
      head: [['Método', 'Monto', '% del total']],
      body: metodos.map(([metodo, monto]) => [
        metodo.charAt(0).toUpperCase() + metodo.slice(1),
        pesos(monto),
        `${metricas.totalVentas > 0 ? ((monto / metricas.totalVentas) * 100).toFixed(1) : 0}%`,
      ]),
      styles:     { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'right' },
        2: { halign: 'right', cellWidth: 35 },
      },
      margin: { left: 14, right: 14 },
      theme: 'striped',
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Movimientos por día ──────────────────────────────────────────────────────
  if (metricas.porDia.length > 0 && metricas.porDia.length <= 31) {
    y = seccionTitulo(doc, 'Detalle por Día', y, pw);

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Pedidos', 'Ventas', 'Egresos', 'Ganancia']],
      body: metricas.porDia
        .filter((d) => d.ventas > 0 || d.egresos > 0)
        .map((d) => [
          format(new Date(d.fecha), "EEE dd/MM", { locale: es }),
          d.pedidos,
          pesos(d.ventas),
          pesos(d.egresos),
          pesos(d.ganancia),
        ]),
      styles:     { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      theme: 'striped',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = metricas.porDia[data.row.index]?.ganancia ?? 0;
          data.cell.styles.textColor = val < 0 ? RED_T : GREEN_T;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Pie de página ────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      `Old Texas BBQ — Documento confidencial · Página ${i} de ${pageCount}`,
      pw / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  const nombreArchivo = `reporte-${format(metricas.periodo.inicio, 'yyyy-MM-dd')}_${format(metricas.periodo.fin, 'yyyy-MM-dd')}.pdf`;
  doc.save(nombreArchivo);
}
