'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { RevenueByTypeItem } from '../types';

interface RevenueByTypeChartProps {
  data: RevenueByTypeItem[];
}

const RevenueByTypeChart: React.FC<RevenueByTypeChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-bold text-gray-900"
          style={{ fontFamily: 'Poppins' }}
        >
          Revenue by Type
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
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Share']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontFamily: 'Poppins',
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span style={{ fontFamily: 'Poppins', fontSize: 12 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueByTypeChart;
