'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { RevenueByProperty, RevenueByChannel, RevenueByAgent, RevenueByTypeItem } from '../types';
import { formatPHP } from '../lib/format';

interface RevenueByTypeChartProps {
  byProperty: RevenueByProperty[];
  byChannel: RevenueByChannel[];
  byAgent: RevenueByAgent[];
  byType: RevenueByTypeItem[];
}

const CHANNEL_COLORS = ['#0B5858', '#3b82f6', '#f59e0b'];
const tooltipStyle = { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontFamily: 'Poppins' };

const RevenueByTypeChart: React.FC<RevenueByTypeChartProps> = ({ byProperty, byChannel, byAgent, byType }) => {
  const [activeTab, setActiveTab] = useState<'property' | 'channel' | 'agent' | 'type'>('property');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>Revenue breakdown</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['property', 'channel', 'agent', 'type'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeTab === tab ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              style={{ fontFamily: 'Poppins' }}
            >
              {tab === 'property' && 'By property'}
              {tab === 'channel' && 'By channel'}
              {tab === 'agent' && 'By agent'}
              {tab === 'type' && 'Revenue by type'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6 overflow-x-auto overflow-y-hidden -mx-1 px-1">
        <div className="min-w-[320px] w-full h-[320px]" style={{ width: 'max(320px, 100%)' }}>
        {!isMounted ? (
          <div className="h-full w-full" />
        ) : activeTab === 'property' ? (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={byProperty} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="propertyName" stroke="#666" fontSize={11} tick={{ fontFamily: 'Poppins' }} angle={-15} textAnchor="end" />
              <YAxis stroke="#666" fontSize={12} tick={{ fontFamily: 'Poppins' }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => [value != null ? formatPHP(value) : '', 'Revenue']} contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" fill="#0B5858" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : activeTab === 'channel' ? (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <PieChart>
              <Pie
                data={byChannel}
                dataKey="revenue"
                nameKey="channel"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={(props) => {
                  const entry = props as unknown as RevenueByChannel;
                  return `${entry.channel} ${entry.percentage}%`;
                }}
              >
                {byChannel.map((_, i) => <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: any) => [value != null ? formatPHP(value) : '', 'Revenue']} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : activeTab === 'agent' ? (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={byAgent} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#666" fontSize={12} tick={{ fontFamily: 'Poppins' }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="agentName" stroke="#666" fontSize={12} tick={{ fontFamily: 'Poppins' }} width={80} />
              <Tooltip formatter={(value: any) => [value != null ? formatPHP(value) : '', 'Revenue']} contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <PieChart>
              <Pie
                data={byType}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {byType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [value != null ? `${value}%` : '', 'Share']}
                contentStyle={tooltipStyle}
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
        )}
        </div>
      </div>
    </div>
  );
};

export default RevenueByTypeChart;
