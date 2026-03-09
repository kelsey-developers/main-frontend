'use client';

import React, { useState } from 'react';
import type { ReferralNode } from '@/types/referralTree';

interface Props {
  node: ReferralNode;
  isRoot?: boolean;
}

const LEVEL_COLORS: Record<number, { ring: string; bg: string; badge: string }> = {
  0: { ring: 'ring-gray-200', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600' },
  1: { ring: 'ring-[#0B5858]/20', bg: 'bg-[#0B5858]/5', badge: 'bg-[#0B5858]/10 text-[#0B5858]' },
  2: { ring: 'ring-[#FACC15]/40', bg: 'bg-[#FACC15]/10', badge: 'bg-[#FACC15]/20 text-[#0B5858]' },
  3: { ring: 'ring-gray-200', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600' },
};

function fmt(n: number) {
  return `₱${n.toLocaleString()}`;
}

export default function ReferralTreeNode({ node, isRoot = false }: Props) {
  const [expanded, setExpanded] = useState(isRoot || node.level === 0 || node.level === 1);
  const colors = LEVEL_COLORS[node.level] || LEVEL_COLORS[3];
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      {/* Node card */}
      <div className={`relative z-10 flex-1 rounded-2xl border ${node.status === 'active' ? 'border-gray-200 hover:border-[#0B5858]/30 hover:shadow-md' : 'border-gray-100 opacity-60'} bg-white shadow-sm overflow-hidden transition-all duration-300`}>
        <div className="flex items-center gap-4 p-5">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full ring-4 ${colors.ring} ${colors.bg} flex items-center justify-center shrink-0`}>
            <span className={`text-base font-bold ${node.level === 0 || node.level === 1 ? 'text-[#0B5858]' : 'text-gray-600'}`}>
              {node.agentName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <p className="text-base font-bold text-gray-900 truncate tracking-tight">{node.agentName}</p>
              {node.level > 0 && (
                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}>
                  Level {node.level}
                </span>
              )}
              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                node.status === 'active'
                  ? 'bg-[#0B5858]/10 text-[#0B5858]'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {node.status}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-medium text-gray-500">{node.email}</p>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-[11px] font-bold bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md text-gray-500 tracking-wider">
                {node.referralCode}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-8 text-right shrink-0 pr-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Commissions</p>
              <p className="text-sm font-bold text-[#0B5858]">{fmt(node.totalCommissionsEarned)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bookings</p>
              <p className="text-sm font-bold text-gray-700">{node.totalBookings}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Joined</p>
              <p className="text-sm font-medium text-gray-500">
                {new Date(node.joinedAt).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Expand toggle */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={`ml-2 p-2 rounded-xl transition-all duration-300 shrink-0 ${expanded ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 border border-gray-100'}`}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${expanded ? 'rotate-180' : 'rotate-0'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile stats row */}
        <div className="sm:hidden flex items-center justify-between px-5 py-3.5 text-[11px] font-medium border-t border-gray-50 bg-gray-50/50">
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-widest text-[9px] text-gray-400 font-bold">Earned</span>
            <span className="text-[#0B5858] font-bold text-xs">{fmt(node.totalCommissionsEarned)}</span>
          </div>
          <div className="flex flex-col gap-0.5 items-center">
            <span className="uppercase tracking-widest text-[9px] text-gray-400 font-bold">Bookings</span>
            <span className="text-gray-700 font-bold text-xs">{node.totalBookings}</span>
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            <span className="uppercase tracking-widest text-[9px] text-gray-400 font-bold">Joined</span>
            <span className="text-gray-600 font-medium text-xs">{new Date(node.joinedAt).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-4 flex flex-col pl-6 sm:pl-14">
          {node.children.map((child, idx) => {
            const isLast = idx === node.children.length - 1;
            return (
              <div key={child.agentId} className={`relative ${isLast ? '' : 'pb-4'}`}>
                {/* Vertical line */}
                <div 
                  className="absolute w-0.5 bg-gray-200 rounded-full"
                  style={{
                    top: idx === 0 ? '-16px' : '0',
                    bottom: isLast ? 'calc(100% - 44px)' : '0',
                    left: '-16px'
                  }}
                />
                {/* Horizontal line */}
                <div 
                  className="absolute h-0.5 bg-gray-200 rounded-full"
                  style={{
                    top: '44px',
                    left: '-16px',
                    width: '16px'
                  }}
                />
                <ReferralTreeNode node={child} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
