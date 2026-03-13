'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

// ─── CARD tokens ──────────────────────────────────────────────────────────────
const CARD = {
  base:     'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  padding:  'p-6',
  header:   'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  label:    'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
  subtitle: 'text-xs font-medium text-gray-500',
} as const;

const STORAGE_KEY         = 'kelsey_dtr_qr_token';
const STORAGE_CREATED_KEY = 'kelsey_dtr_qr_created';

function generateToken() {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  const ts   = Date.now().toString(36).toUpperCase();
  return `DTR-${rand}-${ts}`;
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
  confirmColor: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all ${confirmColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DTRQRPage() {
  const router = useRouter();

  const [token, setToken]         = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scanUrl, setScanUrl]     = useState('');
  const [copied, setCopied]       = useState(false);
  const [modal, setModal]         = useState<'regenerate' | 'delete' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted]     = useState(false);

  // Load or create token on mount
  useEffect(() => {
    setMounted(true);
    let stored  = localStorage.getItem(STORAGE_KEY);
    let created = localStorage.getItem(STORAGE_CREATED_KEY);
    if (!stored) {
      stored  = generateToken();
      created = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, stored);
      localStorage.setItem(STORAGE_CREATED_KEY, created);
    }
    setToken(stored);
    setCreatedAt(created ?? '');
  }, []);

  // Generate QR whenever token changes
  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    const url = `${window.location.origin}/dtr/scan/${token}`;
    setScanUrl(url);
    setIsGenerating(true);
    QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#0B5858', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then(data => { setQrDataUrl(data); setIsGenerating(false); });
  }, [token]);

  const handleRegenerate = () => {
    const newToken   = generateToken();
    const newCreated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, newToken);
    localStorage.setItem(STORAGE_CREATED_KEY, newCreated);
    setToken(newToken);
    setCreatedAt(newCreated);
    setModal(null);
  };

  const handleDelete = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_CREATED_KEY);
    setToken(''); setCreatedAt(''); setQrDataUrl(''); setScanUrl('');
    setModal(null);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `kelsey-dtr-qr-${token}.png`;
    a.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win || !qrDataUrl) return;
    win.document.write(`<!DOCTYPE html><html><head><title>DTR QR Code</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;padding:40px;}
      .card{border:3px solid #0B5858;border-radius:24px;padding:40px;text-align:center;max-width:480px;width:100%;}
      .logo{font-size:22px;font-weight:800;color:#0B5858;margin-bottom:6px;}
      .sub{font-size:13px;color:#555;margin-bottom:28px;}
      img{width:280px;height:280px;border-radius:12px;}
      .token{margin-top:16px;font-size:11px;color:#999;font-family:monospace;}
      .instructions{margin-top:24px;font-size:13px;color:#333;line-height:1.8;}
      .instructions b{color:#0B5858;}
      .footer{margin-top:20px;font-size:11px;color:#999;}
      @media print{body{padding:20px;}}</style></head>
      <body><div class="card">
        <div class="logo">🏡 Kelsey's Homestay</div>
        <div class="sub">Daily Time Record – Employee Check-In</div>
        <img src="${qrDataUrl}" alt="DTR QR Code" />
        <div class="token">QR ID: ${token}</div>
        <div class="instructions"><b>How to use:</b><br/>1. Scan with your phone camera<br/>2. Select your name<br/>3. Time In / Time Out is recorded automatically</div>
        <div class="footer">Generated ${new Date(createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(scanUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const createdFormatted = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  if (!mounted) return null;

  // ── Empty state (deleted) ──────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push('/dtr')}
            className="p-2 rounded-2xl border border-gray-200 hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QR Code Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Generate and share the shared DTR check-in QR code</p>
          </div>
        </div>
        <div className={`${CARD.base} ${CARD.padding} flex flex-col items-center gap-5 py-16`}>
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 4h4v4H4V4zm0 12h4v4H4v-4zm12-12h4v4h-4V4z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-700">No QR code exists</p>
            <p className="text-sm text-gray-400 mt-1">Generate a new one to get started</p>
          </div>
          <button type="button" onClick={handleRegenerate}
            className="px-6 py-3 bg-[#0B5858] text-white rounded-2xl font-bold text-sm hover:bg-[#094444] transition-all shadow-lg shadow-[#0B5858]/20">
            Generate QR Code
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <>
      {modal === 'regenerate' && (
        <ConfirmModal
          title="Regenerate QR Code?"
          message="This creates a new QR code and permanently invalidates the current one. Any printed copies will stop working. Make sure to reprint after regenerating."
          confirmLabel="Yes, Regenerate"
          confirmColor="bg-amber-500 hover:bg-amber-600"
          onConfirm={handleRegenerate}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title="Delete QR Code?"
          message="This permanently deletes the current QR code. Employees will not be able to scan in until you generate a new one."
          confirmLabel="Yes, Delete"
          confirmColor="bg-red-500 hover:bg-red-600"
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push('/dtr')}
            className="p-2 rounded-2xl border border-gray-200 hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QR Code Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Generate and share the shared DTR check-in QR code</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* QR Display */}
          <div className="lg:col-span-2">
            <div className={CARD.base}>
              <div className={CARD.header}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">Shared DTR QR Code</h2>
                    <p className={`${CARD.subtitle} mt-1`}>All employees scan this one QR code to time in or out</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
              <div className={CARD.padding}>
                <div className="flex flex-col items-center gap-5">

                  {/* QR Code */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#0B5858]/5 rounded-3xl blur-xl" />
                    <div className="relative bg-white rounded-3xl border-2 border-[#0B5858]/20 p-6 shadow-xl">
                      {isGenerating ? (
                        <div className="w-64 h-64 rounded-2xl bg-gray-50 flex items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
                        </div>
                      ) : qrDataUrl ? (
                        <img src={qrDataUrl} alt="DTR QR Code" className="w-64 h-64 rounded-2xl" />
                      ) : null}
                      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#0B5858] rounded-tl-lg" />
                      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#0B5858] rounded-tr-lg" />
                      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#0B5858] rounded-bl-lg" />
                      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#0B5858] rounded-br-lg" />
                    </div>
                  </div>

                  {/* Identity strip — confirms same QR */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    <div className="bg-[#0B5858]/5 rounded-2xl border border-[#0B5858]/10 px-4 py-3">
                      <p className={`${CARD.label} mb-1`}>QR ID (verify this matches your print)</p>
                      <p className="text-sm font-mono font-bold text-[#0B5858] break-all">{token}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3">
                      <p className={`${CARD.label} mb-1`}>Generated on</p>
                      <p className="text-sm font-semibold text-gray-700">{createdFormatted}</p>
                    </div>
                  </div>

                  {/* Scan URL */}
                  <div className="w-full bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-xs text-gray-500 font-mono truncate flex-1">{scanUrl}</span>
                    <button type="button" onClick={handleCopyLink}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                        copied ? 'bg-green-100 text-green-700' : 'bg-[#0B5858]/10 text-[#0B5858] hover:bg-[#0B5858]/20'
                      }`}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Save / Print */}
                  <div className="flex gap-3 w-full">
                    <button type="button" onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#0B5858] text-white rounded-2xl font-bold text-sm hover:bg-[#094444] transition-all shadow-lg shadow-[#0B5858]/20 active:scale-[0.98]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Save as Image
                    </button>
                    <button type="button" onClick={handlePrint}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-[#0B5858] text-[#0B5858] rounded-2xl font-bold text-sm hover:bg-[#0B5858]/5 transition-all active:scale-[0.98]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print QR Code
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="w-full border border-dashed border-gray-200 rounded-2xl p-4">
                    <p className={`${CARD.label} mb-3`}>Danger Zone</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setModal('regenerate')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl font-bold text-xs hover:bg-amber-100 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate QR
                      </button>
                      <button type="button" onClick={() => setModal('delete')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-xs hover:bg-red-100 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete QR
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-5">
            <div className={CARD.base}>
              <div className={CARD.header}>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">How It Works</h2>
              </div>
              <div className={CARD.padding}>
                <ol className="space-y-4">
                  {[
                    { step: '1', title: 'Print or display',  desc: 'Print the QR code and post it at the workplace entrance.' },
                    { step: '2', title: 'Employee scans',    desc: 'Employee opens their phone camera and scans the QR code.' },
                    { step: '3', title: 'Select name',       desc: 'A mobile page opens — employee taps their name from the list.' },
                    { step: '4', title: 'Auto recorded',     desc: 'Time In or Time Out is recorded instantly and updates in real time here.' },
                  ].map(({ step, title, desc }) => (
                    <li key={step} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#0B5858] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Good to know</p>
              <ul className="space-y-2 text-xs text-amber-700">
                <li>• Compare the <b>QR ID</b> on screen with your printed copy to confirm it's the same</li>
                <li>• Regenerating creates a new ID — old printed QRs will stop working</li>
                <li>• Works on any smartphone camera app</li>
                <li>• Employees need internet access to scan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}