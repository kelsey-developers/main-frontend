'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { getCleaningReport, getCleanerPerformance } from '@/services/cleaningService';
import { JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningReport, CleanerPerformance } from '@/types/cleaning';

const PERIODS = ['2026-03', '2026-02'];

const CHART_COLORS = ['#0B5858', '#FACC15', '#6366F1', '#EF4444', '#10B981', '#F97316', '#8B5CF6'];

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} className={`w-3 h-3 ${n <= Math.round(rating) ? 'text-[#FACC15]' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] font-bold text-gray-500">{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
    </div>
  );
}

type SortKey = 'cleanerName' | 'totalJobs' | 'completedJobs' | 'averageDuration' | 'averageRating';

export default function CleaningReportsPage() {
  const [period, setPeriod] = useState('2026-03');
  const [report, setReport] = useState<CleaningReport | null>(null);
  const [performance, setPerformance] = useState<CleanerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('completedJobs');
  const [sortAsc, setSortAsc] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCleaningReport(period),
      getCleanerPerformance(),
    ]).then(([r, p]) => {
      setReport(r);
      setPerformance(p);
      setLoading(false);
    });
  }, [period]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedPerformance = [...performance].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const exportPDF = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      // @ts-ignore
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const [displayYear, displayMonth] = period.split('-');
      const periodLabel = new Date(Number(displayYear), Number(displayMonth) - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

      // Header
      doc.setFillColor(11, 88, 88);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Kelsey's Homestay", 14, 13);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cleaning Report — ${periodLabel}`, 14, 22);
      doc.setTextColor(0, 0, 0);

      // Summary
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text([
        `Total Jobs: ${report.totalJobs}`,
        `Completed: ${report.completedJobs}`,
        `Cancelled: ${report.cancelledJobs}`,
        `Avg Duration: ${fmtDuration(report.averageDuration)}`,
        `Top Cleaner: ${report.topCleaner}`,
        `Completion Rate: ${Math.round((report.completedJobs / report.totalJobs) * 100)}%`,
      ], 14, 50);

      // Cleaner Performance Table
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Cleaner Performance', 14, 95);

      autoTable(doc, {
        startY: 100,
        head: [['Cleaner', 'Total Jobs', 'Completed', 'Avg Duration', 'Avg Rating', 'Last Job']],
        body: sortedPerformance.map((p) => [
          p.cleanerName,
          p.totalJobs,
          p.completedJobs,
          fmtDuration(p.averageDuration),
          p.averageRating > 0 ? p.averageRating.toFixed(1) : 'N/A',
          new Date(p.lastJobDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [11, 88, 88], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 250] },
      });

      // Jobs by Property
      // @ts-ignore
      const afterPerf = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 180;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Jobs by Property', 14, afterPerf + 15);

      autoTable(doc, {
        startY: afterPerf + 20,
        head: [['Property', 'Job Count']],
        body: report.jobsByProperty.map((p) => [p.propertyName, p.count]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [11, 88, 88], textColor: 255, fontStyle: 'bold' },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleDateString('en-PH')} · Page ${i} of ${pageCount}`, 14, 290);
      }

      doc.save(`cleaning-report-${period}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = () => {
    if (!performance) return;
    const rows = [
      ['Cleaner', 'Total Jobs', 'Completed', 'Avg Duration (min)', 'Avg Rating', 'Last Job'],
      ...sortedPerformance.map((p) => [
        p.cleanerName,
        p.totalJobs,
        p.completedJobs,
        p.averageDuration,
        p.averageRating > 0 ? p.averageRating.toFixed(1) : 'N/A',
        p.lastJobDate,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cleaning-performance-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#0B5858] ml-1">{sortAsc ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  if (!report) return null;

  const completionRate = report.totalJobs > 0 ? Math.round((report.completedJobs / report.totalJobs) * 100) : 0;

  // Pie chart data with labels from JOB_TYPE_CONFIG
  const pieData = report.jobsByType.map(({ type, count }) => ({
    name: JOB_TYPE_CONFIG[type].label,
    value: count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header - breadcrumb + title, design system */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/cleaning" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors mb-1" style={{ fontFamily: 'Poppins' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Cleaning Management
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Cleaning Reports</h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Period picker */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] text-gray-700 cursor-pointer bg-white"
          >
            {PERIODS.map((p) => {
              const [y, m] = p.split('-');
              const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
              return <option key={p} value={p}>{label}</option>;
            })}
          </select>
          {/* Export CSV */}
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer bg-white shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          {/* Export PDF */}
          <button
            type="button"
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Jobs</p>
          <p className="text-3xl font-bold text-gray-900">{report.totalJobs}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Completed</p>
          <p className="text-3xl font-bold text-emerald-600">{report.completedJobs}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Completion Rate</p>
          <p className="text-3xl font-bold text-[#0B5858]">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cancelled</p>
          <p className="text-3xl font-bold text-red-500">{report.cancelledJobs}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Avg Duration</p>
          <p className="text-3xl font-bold text-gray-900">{fmtDuration(report.averageDuration)}</p>
          <p className="text-xs text-gray-400 mt-1">Top: {report.topCleaner}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Bar chart: daily jobs */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Daily Job Count</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={report.dailyJobCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00');
                  return `${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: unknown) => [v as number, 'Jobs']}
                labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" fill="#0B5858" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart: jobs by type */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Jobs by Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconSize={8}
                iconType="circle"
                formatter={(value) => <span style={{ fontSize: 9, color: '#6b7280' }}>{value}</span>}
              />
              <Tooltip
                formatter={(v: unknown) => [v as number, 'Jobs']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart: completed trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Completed Jobs Trend</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={report.dailyJobCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(v) => `${new Date(v + 'T00:00:00').getDate()}`}
            />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip
              formatter={(v: unknown) => [v as number, 'Jobs']}
              labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Line type="monotone" dataKey="count" stroke="#0B5858" strokeWidth={2} dot={{ r: 3, fill: '#0B5858' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Jobs by property */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Jobs by Property</p>
        <div className="space-y-3">
          {report.jobsByProperty.map(({ propertyName, count }) => {
            const pct = report.totalJobs > 0 ? Math.round((count / report.totalJobs) * 100) : 0;
            return (
              <div key={propertyName} className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-700 w-36 shrink-0">{propertyName}</p>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0B5858] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cleaner performance table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cleaner Performance</p>
          <p className="text-xs text-gray-400">Click column headers to sort</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {[
                { key: 'cleanerName', label: 'Cleaner' },
                { key: 'totalJobs', label: 'Total Jobs' },
                { key: 'completedJobs', label: 'Completed' },
                { key: 'averageDuration', label: 'Avg Duration' },
                { key: 'averageRating', label: 'Rating' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as SortKey)}
                  className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600 select-none"
                >
                  {label}<SortIcon k={key as SortKey} />
                </th>
              ))}
              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Job</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedPerformance.map((p, i) => (
              <tr key={p.cleanerId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0B5858] to-[#073A3A] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">
                        {p.cleanerName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.cleanerName}</p>
                      {i === 0 && (
                        <p className="text-[10px] text-[#0B5858] font-bold flex items-center gap-1" style={{ fontFamily: 'Poppins' }}>
                          <svg className="w-3 h-3 text-[#FACC15]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Top Performer
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-700">{p.totalJobs}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600">{p.completedJobs}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${p.totalJobs > 0 ? Math.round((p.completedJobs / p.totalJobs) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{p.totalJobs > 0 ? Math.round((p.completedJobs / p.totalJobs) * 100) : 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{fmtDuration(p.averageDuration)}</td>
                <td className="px-4 py-3">
                  <StarRating rating={p.averageRating} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(p.lastJobDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
