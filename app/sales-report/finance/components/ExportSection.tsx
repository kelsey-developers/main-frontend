'use client';

import React, { useState } from 'react';

const ExportSection: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'excel' | 'csv') => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 800));
    setExporting(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6">
        <p className="text-gray-600 mb-4" style={{ fontFamily: 'Poppins' }}>Export revenue and booking data for reconciliation.</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="bg-[#0B5858] text-white px-5 py-2.5 rounded-lg hover:bg-[#0a4a4a] transition-colors flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60 text-sm font-medium"
            style={{ fontFamily: 'Poppins' }}
          >
            {exporting ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="bg-gray-700 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60 text-sm font-medium"
            style={{ fontFamily: 'Poppins' }}
          >
            Export to CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportSection;
