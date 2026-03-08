import type { DamagePenalty } from '../types';
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
 * Export filtered damage-penalty incidents to CSV.
 * Includes every field from DamagePenalty (unitAddress, reasonOfDamage, reportedBy, proofUrls, items, etc.).
 */
export function exportDamagePenaltyToCsv(incidents: DamagePenalty[]): void {
  const headers = [
    'bookingId',
    'unit',
    'unitAddress',
    'unitType',
    'location',
    'reportedAt',
    'description',
    'reasonOfDamage',
    'reportedBy',
    'proofUrls',
    'items',
    'cost',
    'chargedToGuest',
    'absorbed',
    'totalLoss',
    'status',
  ];
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const m of incidents) {
    const proofStr = (m.proofUrls || []).join('; ');
    const itemsStr =
      m.items?.map((i) => `${i.item}:${i.type}`).join('; ') ?? '';
    const cells = [
      escapeCsvCell(m.bookingId),
      escapeCsvCell(m.unit),
      escapeCsvCell(m.unitAddress),
      escapeCsvCell(m.unitType),
      escapeCsvCell(m.location),
      escapeCsvCell(m.reportedAt),
      escapeCsvCell(m.description),
      escapeCsvCell(m.reasonOfDamage),
      escapeCsvCell(m.reportedBy),
      escapeCsvCell(proofStr),
      escapeCsvCell(itemsStr),
      escapeCsvCell(m.cost),
      escapeCsvCell(m.chargedToGuest),
      escapeCsvCell(m.absorbed),
      escapeCsvCell(m.totalLoss),
      escapeCsvCell(m.status),
    ];
    lines.push(cells.join(','));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `damage-penalty-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export filtered damage-penalty incidents to PDF.
 * Includes all key fields from the record.
 * Uses synchronous flow so the download is tied to the user click (avoids browser "Insecure download" block).
 */
export function exportDamagePenaltyToPdf(incidents: DamagePenalty[]): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Damage & penalty impact export', 14, 15);
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleString()} | Records: ${incidents.length}`, 14, 22);

  const columns = [
    'Booking ID',
    'Unit',
    'Unit address',
    'Reported at',
    'Description',
    'Reason',
    'Reported by',
    'Items',
    'Cost',
    'Charged',
    'Absorbed',
    'Total loss',
    'Status',
  ];
  const tableRows = incidents.map((m) => {
    const itemsStr = m.items?.map((i) => `${i.item} (${i.type})`).join('; ') ?? '';
    return [
      m.bookingId,
      m.unit,
      (m.unitAddress || '').slice(0, 30),
      m.reportedAt,
      (m.description || '').slice(0, 25),
      (m.reasonOfDamage || '').slice(0, 25),
      (m.reportedBy || '').slice(0, 20),
      itemsStr.slice(0, 30),
      String(m.cost),
      String(m.chargedToGuest),
      String(m.absorbed),
      String(m.totalLoss),
      m.status,
    ];
  });

  autoTable(doc, {
    head: [columns],
    body: tableRows,
    startY: 28,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [11, 88, 88] },
  });

  doc.save(`damage-penalty-${new Date().toISOString().slice(0, 10)}.pdf`);
}
