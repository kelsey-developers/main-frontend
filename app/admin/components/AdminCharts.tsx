'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartData } from '../types';
  
interface AdminChartsProps {
  userGrowth: ChartData[];
  bookingGrowth: ChartData[];
}

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  fontSize: '12px',
};

const AdminCharts: React.FC<AdminChartsProps> = ({ userGrowth, bookingGrowth }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <div className="min-w-0 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Daily User Growth
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span style={{ fontFamily: 'Poppins' }}>Users</span>
          </div>
        </div>
        {isMounted ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] w-full" />
        )}
      </div>

      <div className="min-w-0 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Daily Bookings
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span style={{ fontFamily: 'Poppins' }}>Bookings</span>
          </div>
        </div>
        {isMounted ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={bookingGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#FACC15"
                strokeWidth={2}
                dot={{ fill: '#FACC15', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] w-full" />
        )}
      </div>
    </div>
  );
};

export default AdminCharts;
