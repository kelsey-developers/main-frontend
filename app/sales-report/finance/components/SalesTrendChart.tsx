'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SalesTrendPoint } from '../types';

interface SalesTrendChartProps {
  data: SalesTrendPoint[];
}

const formatYAxis = (value: number) => `$${value}K`;
const formatTooltip = (value: number) => [`$${value}K`, 'Sales'];

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-bold text-gray-900"
          style={{ fontFamily: 'Poppins' }}
        >
          Sales Trend
        </h3>
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="More options"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>
      <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1">
        <div className="min-w-[320px] w-full h-[280px]" style={{ width: 'max(320px, 100%)' }}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  fontSize={12}
                  tick={{ fontFamily: 'Poppins' }}
                />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={formatYAxis}
                  tick={{ fontFamily: 'Poppins' }}
                />
                <Tooltip
                  formatter={(value: any) => (value != null ? formatTooltip(value) : ['', 'Sales'])}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontFamily: 'Poppins',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesTrendChart;
