'use client';

import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SalesTrendPoint } from '../types';
import { formatPHPForChart } from '../lib/format';

interface SalesTrendChartProps {
  data: SalesTrendPoint[];
}

const formatYAxis = (value: number) => formatPHPForChart(value);

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  fontSize: '12px',
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SalesTrendPoint; value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const salesValue = Number(point.value ?? 0);
  const commissionReduction = Number(point.commissionReduction ?? 0);

  return (
    <div style={tooltipStyle} className="px-3 py-2.5">
      <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-xs text-gray-600">Sales: <span className="font-semibold text-gray-900">{formatPHPForChart(salesValue)}</span></p>
      <p className="text-xs text-gray-600">Commission: <span className="font-semibold text-[#b45309]">-{formatPHPForChart(commissionReduction)}</span></p>
    </div>
  );
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-w-0 bg-white rounded-xl shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
          Bookings over time
        </h3>
      </div>

      {isMounted ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0B5858" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#0B5858" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine
              minTickGap={16}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine
              tickFormatter={formatYAxis}
              width={42}
            />
            <Tooltip
              content={<CustomTooltip />}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0B5858"
              strokeWidth={2}
              fill="url(#salesTrendFill)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: '#0B5858', stroke: '#0B5858' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] w-full" />
      )}
    </div>
  );
};

export default SalesTrendChart;
