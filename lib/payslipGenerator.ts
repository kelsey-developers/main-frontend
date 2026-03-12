/**
 * Payslip Generator — generates and downloads a printable payslip as an HTML page.
 * Uses the browser's print-to-PDF dialog. No third-party PDF library needed.
 */

interface Employee {
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: string;
  current_rate: number;
}

interface DailyPayrollRecord {
  id: string;
  employee: Employee;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  daysWorked: number;
  dailyRate: number;
  basePay: number;
  overtimeHours: number;
  overtimePay: number;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  reference_number: string;
  paymentDate?: string;
  breakdown?: {
    basePay: number;
    overtime: number;
    sss: number;
    philhealth: number;
    pagibig: number;
    incomeTax: number;
  };
}

interface MonthlyPayrollRecord {
  id: string;
  employee: Employee;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  monthlyRate: number;
  overtimeHours: number;
  overtimePay: number;
  bonusAmount: number;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  reference_number: string;
  paymentDate?: string;
  breakdown?: {
    monthlySalary: number;
    overtime: number;
    bonus: number;
    sss: number;
    philhealth: number;
    pagibig: number;
    incomeTax: number;
  };
}

function peso(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: '#16a34a',
    approved: '#2563eb',
    processed: '#7c3aed',
    pending: '#d97706',
    declined: '#dc2626',
  };
  return `<span style="background:${colors[status] ?? '#6b7280'};color:#fff;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${status}</span>`;
}

function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 680px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0B5858; padding-bottom: 16px; margin-bottom: 20px; }
    .company h1 { font-size: 20px; font-weight: 700; color: #0B5858; }
    .company p { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .label-badge { font-size: 11px; font-weight: 700; color: #0B5858; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; display: block; margin-bottom: 2px; }
    .field span { font-size: 13px; font-weight: 600; color: #111; }
    table { width: 100%; border-collapse: collapse; }
    table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    table td { padding: 7px 8px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    table td.amount { text-align: right; font-weight: 600; }
    table tr.deduction td { color: #dc2626; }
    table tr.total td { font-weight: 700; font-size: 14px; border-top: 2px solid #0B5858; }
    .net-pay { background: #0B5858; color: #fff; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .net-pay .label { font-size: 12px; font-weight: 600; opacity: 0.85; }
    .net-pay .amount { font-size: 24px; font-weight: 800; }
    .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 16px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function openAndPrint(html: string) {
  const win = window.open('', '_blank', 'width=750,height=900');
  if (!win) { alert('Pop-up blocked. Please allow pop-ups and try again.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

export function downloadDailyPayslipPDF(record: DailyPayrollRecord) {
  const emp = record.employee;
  const bd = record.breakdown;

  const earningsRows = `
    <tr><td>Base Pay (${record.daysWorked} days × ${peso(record.dailyRate)})</td><td class="amount">${peso(bd?.basePay ?? record.basePay)}</td></tr>
    ${record.overtimeHours > 0 ? `<tr><td>Overtime (${record.overtimeHours} hrs)</td><td class="amount">${peso(bd?.overtime ?? record.overtimePay)}</td></tr>` : ''}
  `;

  const deductionRows = bd
    ? `
    <tr class="deduction"><td>SSS</td><td class="amount">- ${peso(bd.sss)}</td></tr>
    <tr class="deduction"><td>PhilHealth</td><td class="amount">- ${peso(bd.philhealth)}</td></tr>
    <tr class="deduction"><td>Pag-IBIG</td><td class="amount">- ${peso(bd.pagibig)}</td></tr>
    <tr class="deduction"><td>Income Tax</td><td class="amount">- ${peso(bd.incomeTax)}</td></tr>
    `
    : `<tr class="deduction"><td>Total Deductions</td><td class="amount">- ${peso(record.totalDeductions)}</td></tr>`;

  const body = `
<div class="header">
  <div class="company">
    <h1>Kelsey's Homestay</h1>
    <p>Payslip — Daily Employee</p>
  </div>
  <div style="text-align:right">
    <div class="label-badge">Pay Slip</div>
    <div style="font-size:11px;color:#6b7280">${formatDate(record.payPeriodStart)} – ${formatDate(record.payPeriodEnd)}</div>
    <div style="margin-top:4px">${statusBadge(record.status)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Employee Information</div>
  <div class="grid2">
    <div class="field"><label>Full Name</label><span>${emp.full_name}</span></div>
    <div class="field"><label>Position</label><span>${emp.position}</span></div>
    <div class="field"><label>Employment Type</label><span>Daily</span></div>
    <div class="field"><label>Daily Rate</label><span>${peso(record.dailyRate)}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Earnings &amp; Deductions</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${earningsRows}
      <tr><td style="color:#6b7280;font-size:11px">Gross Income</td><td class="amount" style="color:#6b7280;font-size:11px">${peso(record.grossIncome)}</td></tr>
      ${deductionRows}
    </tbody>
  </table>
</div>

<div class="net-pay">
  <div>
    <div class="label">Net Pay</div>
    <div style="font-size:10px;opacity:0.7;margin-top:2px">Ref: ${record.reference_number}</div>
  </div>
  <div class="amount">${peso(record.netPay)}</div>
</div>

<div class="footer">
  <span>Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}</span>
  ${record.paymentDate ? `<span>Payment Date: ${formatDate(record.paymentDate)}</span>` : '<span>This is a system-generated document.</span>'}
</div>
`;

  openAndPrint(baseHtml(`Payslip – ${emp.full_name}`, body));
}

export function downloadMonthlyPayslipPDF(record: MonthlyPayrollRecord) {
  const emp = record.employee;
  const bd = record.breakdown;

  const earningsRows = `
    <tr><td>Monthly Salary</td><td class="amount">${peso(bd?.monthlySalary ?? record.monthlyRate)}</td></tr>
    ${record.overtimeHours > 0 ? `<tr><td>Overtime (${record.overtimeHours} hrs)</td><td class="amount">${peso(bd?.overtime ?? record.overtimePay)}</td></tr>` : ''}
    ${record.bonusAmount > 0 ? `<tr><td>Bonus / Allowance</td><td class="amount">${peso(bd?.bonus ?? record.bonusAmount)}</td></tr>` : ''}
  `;

  const deductionRows = bd
    ? `
    <tr class="deduction"><td>SSS</td><td class="amount">- ${peso(bd.sss)}</td></tr>
    <tr class="deduction"><td>PhilHealth</td><td class="amount">- ${peso(bd.philhealth)}</td></tr>
    <tr class="deduction"><td>Pag-IBIG</td><td class="amount">- ${peso(bd.pagibig)}</td></tr>
    <tr class="deduction"><td>Income Tax</td><td class="amount">- ${peso(bd.incomeTax)}</td></tr>
    `
    : `<tr class="deduction"><td>Total Deductions</td><td class="amount">- ${peso(record.totalDeductions)}</td></tr>`;

  const body = `
<div class="header">
  <div class="company">
    <h1>Kelsey's Homestay</h1>
    <p>Payslip — Monthly Employee</p>
  </div>
  <div style="text-align:right">
    <div class="label-badge">Pay Slip</div>
    <div style="font-size:11px;color:#6b7280">${formatDate(record.payPeriodStart)} – ${formatDate(record.payPeriodEnd)}</div>
    <div style="margin-top:4px">${statusBadge(record.status)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Employee Information</div>
  <div class="grid2">
    <div class="field"><label>Full Name</label><span>${emp.full_name}</span></div>
    <div class="field"><label>Position</label><span>${emp.position}</span></div>
    <div class="field"><label>Employment Type</label><span>Monthly</span></div>
    <div class="field"><label>Monthly Rate</label><span>${peso(record.monthlyRate)}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Earnings &amp; Deductions</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${earningsRows}
      <tr><td style="color:#6b7280;font-size:11px">Gross Income</td><td class="amount" style="color:#6b7280;font-size:11px">${peso(record.grossIncome)}</td></tr>
      ${deductionRows}
    </tbody>
  </table>
</div>

<div class="net-pay">
  <div>
    <div class="label">Net Pay</div>
    <div style="font-size:10px;opacity:0.7;margin-top:2px">Ref: ${record.reference_number}</div>
  </div>
  <div class="amount">${peso(record.netPay)}</div>
</div>

<div class="footer">
  <span>Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}</span>
  ${record.paymentDate ? `<span>Payment Date: ${formatDate(record.paymentDate)}</span>` : '<span>This is a system-generated document.</span>'}
</div>
`;

  openAndPrint(baseHtml(`Payslip – ${emp.full_name}`, body));
}
