'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getReferralTree, getReferralStats } from '@/services/referralTreeService';
import type { ReferralNode, ReferralStats } from '@/types/referralTree';
import ReferralTreeNode from './components/ReferralTreeNode';

const AGENT_ID = 'agent-001';
const DOMAIN = 'kelseyshomestay.com';
const QR_SIZE = 160;

function generateQRSVG(url: string, size: number): string {
  const modules = 25;
  const cellSize = size / modules;
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) & 0xffffffff;
  let rects = '';
  const drawFinder = (ox: number, oy: number) => {
    for (let fr = 0; fr < 7; fr++)
      for (let fc = 0; fc < 7; fc++) {
        const isBorder = fr === 0 || fr === 6 || fc === 0 || fc === 6;
        const isInner = fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4;
        if (isBorder || isInner)
          rects += `<rect x="${(ox + fc) * cellSize}" y="${(oy + fr) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0B5858"/>`;
      }
  };
  drawFinder(0, 0); drawFinder(modules - 7, 0); drawFinder(0, modules - 7);
  let seed = hash;
  for (let r = 0; r < modules; r++)
    for (let c = 0; c < modules; c++) {
      const inFinder = (r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8);
      if (inFinder) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0)
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0B5858"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

export default function AgentNetworkPage() {
  const [tree, setTree] = useState<ReferralNode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const recruitLink = `https://${DOMAIN}/register-agent?recruitedBy=${AGENT_ID}`;
  const qrSvg = useMemo(() => generateQRSVG(recruitLink, QR_SIZE), [recruitLink]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getReferralTree(AGENT_ID),
      getReferralStats(AGENT_ID),
    ]).then(([t, s]) => {
      if (!isMounted) return;
      setTree(t);
      setStats(s);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [recruitLink]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(recruitLink); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const blob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      canvas.width = QR_SIZE * 2;
      canvas.height = QR_SIZE * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = 'recruit-qr.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Network</h1>
        <p className="text-sm text-gray-500 mt-1">Your referral tree and downstream commission earnings.</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { label: 'Total Sub-Agents', value: stats.totalSubAgents, sub: 'All levels' },
            { label: 'Active',           value: stats.activeSubAgents, sub: 'Currently active' },
            { label: 'Network Bookings', value: stats.networkBookings, sub: 'Through your network' },
            { label: 'Network Earnings', value: `₱${stats.totalNetworkCommissions.toLocaleString()}`, sub: 'Total commissions' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Commission Rates */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">Commission Structure</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { level: 'Level 1', rate: '10%', desc: 'Direct referrals', color: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30' },
            { level: 'Level 2', rate: '5%',  desc: 'Their referrals',  color: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20' },
            { level: 'Level 3', rate: '2%',  desc: 'Third degree',     color: 'bg-gray-50 text-gray-700 border border-gray-200' },
          ].map((l) => (
            <div key={l.level} className="rounded-2xl border border-gray-100 p-5 text-center hover:shadow-sm transition-shadow bg-white">
              <span className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold mb-4 ${l.color}`}>
                {l.level}
              </span>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{l.rate}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recruit Card */}
      <div className="bg-gradient-to-br from-[#0B5858] to-[#073A3A] rounded-3xl p-8 sm:p-10 shadow-lg shadow-[#0B5858]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FACC15]/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start justify-between">
          <div className="flex-1 max-w-xl">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-3">Grow Your Network</h2>
            <p className="text-sm font-medium text-white/80 leading-relaxed mb-8">
              Share your unique recruitment link below to onboard new sub-agents. You will earn <strong className="text-[#FACC15]">10% downstream commissions</strong> on all their successful bookings as they become your Level 1 partners.
            </p>
            
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">
                Your Recruitment Link
              </p>
              <div 
                onClick={handleCopy}
                className={`group flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-inner p-2 cursor-pointer transition-all duration-300 hover:bg-white/15 hover:border-white/30 ${copied ? 'ring-2 ring-[#FACC15]/50' : ''}`}
              >
                <div className="flex items-center gap-3 px-3 py-2 overflow-hidden">
                  <svg className="w-5 h-5 text-[#FACC15] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm font-medium text-white truncate">{recruitLink}</span>
                </div>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 shrink-0 ${
                    copied
                      ? 'bg-[#FACC15] text-[#0B5858] shadow-md'
                      : 'bg-white/20 text-white group-hover:bg-white/30'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    'Copy'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {qrSvg && (
            <div className="shrink-0 flex flex-col items-center">
              <div className="bg-white p-3.5 rounded-2xl shadow-xl shadow-black/20"
                dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <canvas ref={canvasRef} className="hidden" />
              <button
                type="button"
                onClick={handleDownloadQR}
                className="mt-4 flex items-center gap-2 text-[11px] font-bold text-white/60 hover:text-white transition-colors cursor-pointer uppercase tracking-widest"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Referral Tree */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-gray-50/30">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Referral Tree</h2>
            <p className="text-xs font-medium text-gray-500 mt-1">Tap the arrow to expand or collapse sub-agents.</p>
          </div>
        </div>
        <div className="p-6">
          {tree ? (
            <ReferralTreeNode node={tree} isRoot />
          ) : (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-bold text-gray-400">No referral tree data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
