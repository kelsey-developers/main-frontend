import type { BookingLinkedRow } from '../types';
import { getBookingTotal, getBasePrice } from './format';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function escapeCsvCell(value: string | number | undefined | null): string {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Export filtered booking-linked rows to CSV.
 * Includes every field from BookingLinkedRow (including those not shown in the table).
 */
export function exportBookingLinkedToCsv(rows: BookingLinkedRow[]): void {
  const headers = [
    'id',
    'bookingId',
    'unit',
    'imageUrl',
    'unitType',
    'location',
    'rate',
    'agent',
    'guest',
    'checkIn',
    'checkOut',
    'checkInTime',
    'checkOutTime',
    'guestType',
    'basePrice',
    'discounts',
    'extraHeads',
    'extraHours',
    'addOns',
    'addOnsWithPrice',
    'addOnsAmount',
    'total',
  ];
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    const total = getBookingTotal(
      row.rate,
      row.checkIn,
      row.checkOut,
      row.discounts,
      row.extraHeads,
      row.extraHours,
      row.addOnsAmount
    );
    const addOnsStr = (row.addOns || []).join('; ');
    const addOnsWithPriceStr =
      row.addOnsWithPrice?.map((x) => `${x.name}:${x.amount}`).join('; ') ?? '';
    const cells = [
      escapeCsvCell(row.id),
      escapeCsvCell(row.bookingId),
      escapeCsvCell(row.unit),
      escapeCsvCell(row.imageUrl),
      escapeCsvCell(row.unitType),
      escapeCsvCell(row.location),
      escapeCsvCell(row.rate),
      escapeCsvCell(row.agent),
      escapeCsvCell(row.guest),
      escapeCsvCell(row.checkIn),
      escapeCsvCell(row.checkOut),
      escapeCsvCell(row.checkInTime),
      escapeCsvCell(row.checkOutTime),
      escapeCsvCell(row.guestType),
      escapeCsvCell(row.basePrice),
      escapeCsvCell(row.discounts),
      escapeCsvCell(row.extraHeads),
      escapeCsvCell(row.extraHours),
      escapeCsvCell(addOnsStr),
      escapeCsvCell(addOnsWithPriceStr),
      escapeCsvCell(row.addOnsAmount),
      escapeCsvCell(total),
    ];
    lines.push(cells.join(','));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `booking-linked-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export filtered booking-linked rows to PDF.
 * Includes all key fields from the record.
 * Uses synchronous flow so the download is tied to the user click (avoids browser "Insecure download" block).
 */
export function exportBookingLinkedToPdf(rows: BookingLinkedRow[]): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Booking-linked data export', 14, 15);
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleString()} | Records: ${rows.length}`, 14, 22);

  const columns = [
    'Booking',
    'Unit',
    'Agent',
    'Guest',
    'Check-in',
    'Check-out',
    'Guest type',
    'Rate',
    'Base price',
    'Discounts',
    'Extra heads',
    'Extra hours',
    'Add-ons amt',
    'Total',
  ];
  const tableRows = rows.map((row) => {
    const total = getBookingTotal(
      row.rate,
      row.checkIn,
      row.checkOut,
      row.discounts,
      row.extraHeads,
      row.extraHours,
      row.addOnsAmount
    );
    const basePrice = getBasePrice(row.rate, row.checkIn, row.checkOut);
    return [
      row.bookingId,
      row.unit,
      row.agent,
      row.guest,
      row.checkIn,
      row.checkOut,
      row.guestType,
      String(row.rate),
      basePrice.toFixed(2),
      String(row.discounts),
      String(row.extraHeads),
      String(row.extraHours),
      String(row.addOnsAmount),
      total.toFixed(2),
    ];
  });

  autoTable(doc, {
    head: [columns],
    body: tableRows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 88, 88] },
  });

  doc.save(`booking-linked-${new Date().toISOString().slice(0, 10)}.pdf`);
}
