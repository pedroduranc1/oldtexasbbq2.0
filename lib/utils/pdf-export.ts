/**
 * Utilidades para exportar cortes de caja a PDF
 * Old Texas BBQ - CRM
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Turno } from '@/lib/types/firestore';

export async function exportarCortePDF(turno: Turno) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colores
  const primaryColor: [number, number, number] = [237, 28, 36]; // Rojo Old Texas
  const darkGray: [number, number, number] = [60, 60, 60];
  const lightGray: [number, number, number] = [240, 240, 240];

  // Encabezado
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo/Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('OLD TEXAS BBQ', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Corte de Caja', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(10);
  const fechaFormateada = format(new Date(turno.fecha), "dd 'de' MMMM, yyyy", {
    locale: es,
  });
  doc.text(fechaFormateada, pageWidth / 2, 33, { align: 'center' });

  // Información del Turno
  let yPos = 50;
  doc.setTextColor(...darkGray);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL TURNO', 14, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const cerradoPorNombre = turno.corte?.cerradoPorNombre;
  const turnoCruzado =
    !!cerradoPorNombre &&
    cerradoPorNombre.trim().toLowerCase() !== turno.cajeroNombre?.trim().toLowerCase();

  const infoTurno: [string, string, boolean?][] = [
    ['Tipo de Turno:', turno.tipo === 'matutino' ? 'Matutino 🌅' : 'Vespertino 🌆'],
    ['Abierto por:', turno.cajeroNombre],
    ['Cerrado por:', cerradoPorNombre ?? 'Sin registrar', turnoCruzado],
  ];

  if (turno.encargadoNombre) {
    infoTurno.push(['Encargado:', turno.encargadoNombre]);
  }

  const formatearHora = (timestamp: any) => {
    if (!timestamp) return '-';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(fecha, 'HH:mm:ss', { locale: es });
  };

  infoTurno.push([
    'Horario:',
    `${formatearHora(turno.horaInicio)} - ${formatearHora(turno.horaFin)}`,
  ]);

  const amberColor: [number, number, number] = [217, 119, 6];

  infoTurno.forEach(([label, value, resaltar]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text(label, 14, yPos);
    doc.setFont('helvetica', 'normal');
    if (resaltar) {
      doc.setTextColor(...amberColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${value}  ⚠ Turno cruzado`, 50, yPos);
      doc.setTextColor(...darkGray);
    } else {
      doc.text(value, 50, yPos);
    }
    yPos += 6;
  });

  // Resumen de Ventas
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RESUMEN DE VENTAS', 14, yPos);
  yPos += 2;

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(monto);
  };

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Cantidad']],
    body: [
      ['Total de Pedidos', turno.resumen.totalPedidos.toString()],
      ['Total de Ventas', formatearMoneda(turno.resumen.totalVentas)],
      ['Total de Envíos', formatearMoneda(turno.resumen.totalEnvios)],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore - autoTable agrega esta propiedad
  yPos = doc.lastAutoTable.finalY + 10;

  // Desglose por Método de Pago
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DESGLOSE POR MÉTODO DE PAGO', 14, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    head: [['Método de Pago', 'Monto']],
    body: [
      ['Efectivo', formatearMoneda(turno.resumen.efectivo)],
      ['Tarjeta', formatearMoneda(turno.resumen.tarjeta)],
      ['Transferencia', formatearMoneda(turno.resumen.transferencia)],
      ['Uber Eats', formatearMoneda(turno.resumen.uber)],
      ['Didi Food', formatearMoneda(turno.resumen.didi)],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // Corte de Caja
  if (turno.corte) {
    // Verificar si necesitamos una nueva página
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CORTE DE CAJA', 14, yPos);
    yPos += 2;

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Monto']],
      body: [
        ['Fondo Inicial', formatearMoneda(turno.fondoInicial)],
        ['Efectivo Esperado', formatearMoneda(turno.corte.efectivoEsperado)],
        ['Efectivo Real', formatearMoneda(turno.corte.efectivoReal)],
        [
          'Diferencia',
          formatearMoneda(turno.corte.diferencia) +
            (turno.corte.diferencia === 0
              ? ' ✓'
              : turno.corte.diferencia > 0
              ? ' (Sobrante)'
              : ' (Faltante)'),
        ],
      ],
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: (rowIndex: number): [number, number, number] => {
          // Resaltar la diferencia
          if (rowIndex === 3) {
            return turno.corte!.diferencia === 0
              ? [220, 252, 231] // Verde claro
              : turno.corte!.diferencia > 0
              ? [254, 249, 195] // Amarillo claro
              : [254, 226, 226]; // Rojo claro
          }
          return rowIndex % 2 === 0 ? [255, 255, 255] : lightGray;
        },
      } as any,
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 5;

    // Observaciones
    if (turno.corte.observaciones) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', 14, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const splitObservaciones = doc.splitTextToSize(
        turno.corte.observaciones,
        pageWidth - 28
      );
      doc.text(splitObservaciones, 14, yPos);
      yPos += splitObservaciones.length * 5;
    }

    // Cerrado por
    yPos += 3;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Cerrado por: ${turno.corte.cerradoPorNombre ?? 'Sin registrar'} a las ${formatearHora(
        turno.corte.horaCierre
      )}`,
      14,
      yPos
    );
  }

  // Otros gastos y comisiones
  if (turno.resumen.totalDescuentos > 0 || turno.resumen.totalComisionesRepartidores > 0) {
    yPos += 10;

    // Verificar si necesitamos una nueva página
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('OTROS CONCEPTOS', 14, yPos);
    yPos += 2;

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Monto']],
      body: [
        ['Total Descuentos', formatearMoneda(turno.resumen.totalDescuentos)],
        [
          'Comisiones Repartidores',
          formatearMoneda(turno.resumen.totalComisionesRepartidores),
        ],
      ],
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Guardar el PDF
  const nombreArchivo = `corte_${turno.fecha}_${turno.tipo}.pdf`;
  doc.save(nombreArchivo);
}
