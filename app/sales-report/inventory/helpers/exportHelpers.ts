import type { EnhancedMovement } from './types';

const getImageDataUrl = async (path: string): Promise<string | null> => {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const exportStockMovementsToCsv = (rows: EnhancedMovement[]) => {
  const records = rows.map((row) => ({
    id: row.id,
    product: row.productName,
    sku: row.productSku,
    category: row.productCategory,
    warehouse: row.warehouseName,
    type: row.type,
    quantity: row.quantity,
    createdBy: row.createdBy ?? '',
    recordedDate: row.recordedDate,
    recordedTime: row.recordedTime,
    referenceId: row.referenceId ?? '',
    notes: row.notes ?? '',
  }));

  const headers = Object.keys(records[0] ?? {
    id: '',
    product: '',
    sku: '',
    category: '',
    warehouse: '',
    type: '',
    quantity: '',
    createdBy: '',
    recordedDate: '',
    recordedTime: '',
    referenceId: '',
    notes: '',
  });

  const escapeCsvValue = (value: unknown) => {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const csv = [
    headers.join(','),
    ...records.map((row) => headers.map((header) => escapeCsvValue((row as Record<string, unknown>)[header])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportStockMovementsToPdf = async (rows: EnhancedMovement[]) => {
  const printable = window.open('', '_blank', 'width=1200,height=800');
  if (!printable) return;

  const totalRecords = rows.length;
  const totalStockIn =
    rows
      .filter((movement) => movement.type === 'in')
      .reduce((sum, movement) => sum + movement.quantity, 0) +
    rows
      .filter((movement) => movement.type === 'adjustment' && movement.quantity > 0)
      .reduce((sum, movement) => sum + movement.quantity, 0);
  const totalStockOut =
    rows
      .filter((movement) => movement.type === 'out')
      .reduce((sum, movement) => sum + movement.quantity, 0) +
    rows
      .filter((movement) => movement.type === 'adjustment' && movement.quantity < 0)
      .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);

  const logoDataUrl = await getImageDataUrl('/logo.png');
  const logoHtml = logoDataUrl ? `<img src="${logoDataUrl}" alt="System Logo" />` : `<div class="logo-fallback">K</div>`;
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowsHtml = rows
    .map(
      (movement) => `
        <tr>
          <td>${movement.id}</td>
          <td>${movement.productName}</td>
          <td>${movement.productSku}</td>
          <td>${movement.warehouseName}</td>
          <td>${movement.type}</td>
          <td>${movement.quantity}</td>
          <td>${movement.createdBy ?? ''}</td>
          <td>${movement.recordedDate}</td>
          <td>${movement.recordedTime}</td>
        </tr>`
    )
    .join('');

  printable.document.write(`
    <html>
      <head>
        <title>Stock Movement Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 10px; }
          .brand img { width: 72px; height: 72px; object-fit: contain; }
          .logo-fallback {
            width: 72px;
            height: 72px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0b5858;
            color: #ffffff;
            font-weight: 700;
            font-size: 30px;
          }
          .brand-title { font-size: 20px; font-weight: 700; color: #0b5858; margin: 0; }
          .brand-sub { font-size: 12px; color: #4b5563; margin: 2px 0 0 0; }
          .generated { font-size: 12px; color: #6b7280; }
          .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 14px 0 16px 0; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #ffffff; }
          .summary-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
          .summary-value { font-size: 20px; font-weight: 700; margin-top: 3px; color: #0f172a; }
          .summary-in { color: #28950e; }
          .summary-out { color: #f10e3b; }
          .report-note { margin: 0 0 10px 0; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #0b5858; color: white; }
          .meta { margin-bottom: 10px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            ${logoHtml}
            <div>
              <h1 class="brand-title">Stock Movement History</h1>
              <p class="brand-sub">Inventory Management Report</p>
            </div>
          </div>
          <div class="generated">Generated: ${generatedAt}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-label">Records</div>
            <div class="summary-value">${totalRecords}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Stock In</div>
            <div class="summary-value summary-in">+${totalStockIn}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Stock Out</div>
            <div class="summary-value summary-out">-${totalStockOut}</div>
          </div>
        </div>

        <p class="report-note">This report contains the currently filtered stock movement records.</p>
        <div class="meta">Total records in table: ${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Qty</th>
              <th>By</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);

  printable.onload = () => {
    printable.focus();
    printable.print();
  };

  printable.document.close();

  setTimeout(() => {
    if (!printable.closed) {
      printable.focus();
      printable.print();
    }
  }, 500);
};
