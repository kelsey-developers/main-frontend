'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getAgentRegistrationConfig,
  saveAgentRegistrationConfig,
  getAgentsWithStatus,
} from '@/services/agentRegistrationService';
import type {
  AgentRegistrationConfig,
  AgentWithStatus,
  ReferralMode,
} from '@/app/admin/agent-registration/types';

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const sectionCardClass = 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden';

function validateCommission(value: string): { valid: boolean; num?: number } {
  const n = parseFloat(value);
  if (Number.isNaN(n) || value.trim() === '') return { valid: false };
  if (n < 0 || n > 100) return { valid: false };
  return { valid: true, num: n };
}

function SettingsDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 140 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 140),
    });
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Close dropdown when user scrolls (e.g. modal content) so menu doesn’t stay floating */
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const close = () => setIsOpen(false);
    const scrollables: HTMLElement[] = [];
    let el: HTMLElement | null = triggerRef.current.parentElement;
    while (el) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') scrollables.push(el);
      el = el.parentElement;
    }
    scrollables.forEach((s) => s.addEventListener('scroll', close, { passive: true }));
    window.addEventListener('scroll', close, { passive: true });
    return () => {
      scrollables.forEach((s) => s.removeEventListener('scroll', close));
      window.removeEventListener('scroll', close);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value) || options[0];
  const menu = isOpen && (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up"
      style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setTimeout(() => setIsOpen(false), 150); }}
          className={`w-full text-left px-4 py-2.5 text-sm font-medium ${
            value === opt.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {typeof document !== 'undefined' && createPortal(menu, document.body)}
    </div>
  );
}

export default function AgentSettingsModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<AgentRegistrationConfig | null>(null);
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [commissionErrors, setCommissionErrors] = useState<Record<string, string>>({});
  const [fee, setFee] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [referralMode, setReferralMode] = useState<ReferralMode>('basic');
  const [maxLevel, setMaxLevel] = useState(1);
  const [commLevel1, setCommLevel1] = useState('');
  const [commLevel2, setCommLevel2] = useState('');
  const [commLevel3, setCommLevel3] = useState('');
  const [overrideAgentId, setOverrideAgentId] = useState('');
  const [overrideL1, setOverrideL1] = useState('');
  const [overrideL2, setOverrideL2] = useState('');
  const [overrideL3, setOverrideL3] = useState('');
  const [overrideSaved, setOverrideSaved] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setConfigError(null);
      const data = await getAgentRegistrationConfig();
      setConfig(data);
      setFee(String(data.registrationFee));
      setRegistrationEnabled(data.registrationEnabled);
      setReferralMode(data.referralMode);
      setMaxLevel(data.maxReferralLevel);
      setCommLevel1(String(data.commissions.level1 ?? 0));
      setCommLevel2(String(data.commissions.level2 ?? ''));
      setCommLevel3(String(data.commissions.level3 ?? ''));
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to load config');
    }
  }, []);

  const loadAgents = useCallback(async () => {
    const list = await getAgentsWithStatus();
    setAgents(list);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadAgents()]);
      setLoading(false);
    })();
  }, [loadConfig, loadAgents]);

  const validateCommissions = useCallback((): boolean => {
    const err: Record<string, string> = {};
    if (!validateCommission(commLevel1).valid) err.level1 = 'Enter 0–100';
    if (referralMode === 'extended' && maxLevel >= 2 && !validateCommission(commLevel2).valid) err.level2 = 'Enter 0–100';
    if (referralMode === 'extended' && maxLevel >= 3 && !validateCommission(commLevel3).valid) err.level3 = 'Enter 0–100';
    setCommissionErrors(err);
    return Object.keys(err).length === 0;
  }, [commLevel1, commLevel2, commLevel3, referralMode, maxLevel]);

  const handleSave = async () => {
    if (!config || !validateCommissions()) return;
    const feeNum = parseFloat(fee);
    if (Number.isNaN(feeNum) || feeNum < 0) {
      setConfigError('Registration fee must be ≥ 0.');
      return;
    }
    setConfigError(null);
    setSaving(true);
    setSaveSuccess(false);
    try {
      const next: AgentRegistrationConfig = {
        ...config,
        registrationFee: feeNum,
        registrationEnabled,
        referralMode,
        maxReferralLevel: referralMode === 'basic' ? 1 : maxLevel,
        commissions: {
          level1: validateCommission(commLevel1).num ?? 0,
          level2: referralMode === 'extended' && maxLevel >= 2 ? validateCommission(commLevel2).num : undefined,
          level3: referralMode === 'extended' && maxLevel >= 3 ? validateCommission(commLevel3).num : undefined,
        },
      };
      const saved = await saveAgentRegistrationConfig(next);
      setConfig(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReferralModeChange = (mode: ReferralMode) => {
    setReferralMode(mode);
    if (mode === 'basic') {
      setMaxLevel(1);
      setCommLevel2('');
      setCommLevel3('');
    } else {
      setMaxLevel(2);
      setCommLevel2(commLevel2 || '5');
      setCommLevel3(maxLevel >= 3 ? (commLevel3 || '2') : '');
    }
  };

  const handleMaxLevelChange = (level: number) => {
    setMaxLevel(level);
    if (level < 3) setCommLevel3('');
    else setCommLevel3(commLevel3 || '2');
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl border border-gray-100 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Agent settings</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {configError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{configError}</div>
          )}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
            </div>
          ) : (
            <>
              {/* Registration Fee */}
              <section className={sectionCardClass}>
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="font-bold text-gray-900">Registration fee</h3>
                  <p className="text-xs text-gray-500 mt-0.5">One-time fee and enable/disable new sign-ups</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={labelClass}>Registration fee (per new agent)</label>
                    <input type="number" min={0} step={1} value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} placeholder="e.g. 500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Allow new agent registration</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={registrationEnabled}
                      onClick={() => setRegistrationEnabled(!registrationEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer ${registrationEnabled ? '' : 'bg-gray-200'}`}
                      style={{ backgroundColor: registrationEnabled ? '#0B5858' : undefined }}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-500">{registrationEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </section>
              {/* Per-Agent Override — just below registration fee; overflow-visible so dropdown menu is not clipped */}
              <section className={`${sectionCardClass} overflow-visible`}>
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="font-bold text-gray-900">Per-agent commission override</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Custom rates for a specific agent</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="max-w-xs">
                    <label className={labelClass}>Select agent</label>
                    <SettingsDropdown
                      value={overrideAgentId}
                      onChange={setOverrideAgentId}
                      options={[{ value: '', label: '— Select an agent —' }, ...agents.filter((a) => a.role === 'agent' && a.status === 'active').map((a) => ({ value: a.id, label: a.fullname || a.email }))]}
                    />
                  </div>
                  {overrideAgentId && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-w-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Override rates</p>
                      {[
                        { label: 'Level 3 — highest (%)', value: overrideL3, set: setOverrideL3, placeholder: `Global: ${commLevel3 || 'N/A'}` },
                        { label: 'Level 2 (%)', value: overrideL2, set: setOverrideL2, placeholder: `Global: ${commLevel2 || 'N/A'}` },
                        { label: 'Level 1 — lowest (%)', value: overrideL1, set: setOverrideL1, placeholder: `Global: ${commLevel1}%` },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                          <input type="number" min={0} max={100} step={0.5} value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} className={`${inputClass} text-xs`} />
                        </div>
                      ))}
                      <button type="button" onClick={() => { setOverrideSaved(true); setTimeout(() => setOverrideSaved(false), 2500); }} className="w-full py-2 text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#094848] rounded-xl transition-colors">
                        {overrideSaved ? 'Override saved ✓' : 'Save override'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
              {/* Referral Structure */}
              <section className={`${sectionCardClass} overflow-visible`}>
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="font-bold text-gray-900">Referral structure</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Level 1 = lowest, Level 3 = highest</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <span className={labelClass}>Referral mode</span>
                    <div className="flex flex-wrap gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="referralMode" checked={referralMode === 'basic'} onChange={() => handleReferralModeChange('basic')} className="w-4 h-4 accent-[#0B5858]" />
                        <span className="text-sm font-medium text-gray-700">Basic (Level 1 only)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="referralMode" checked={referralMode === 'extended'} onChange={() => handleReferralModeChange('extended')} className="w-4 h-4 accent-[#0B5858]" />
                        <span className="text-sm font-medium text-gray-700">Extended (multi-level)</span>
                      </label>
                    </div>
                  </div>
                  {referralMode === 'extended' && (
                    <div className="max-w-[12rem]">
                      <label className={labelClass}>Max referral level</label>
                      <SettingsDropdown value={String(maxLevel)} onChange={(v) => handleMaxLevelChange(Number(v))} options={[{ value: '2', label: 'Level 2' }, { value: '3', label: 'Level 3 (highest)' }]} />
                    </div>
                  )}
                </div>
              </section>
              {/* Commission Configuration */}
              <section className={sectionCardClass}>
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="font-bold text-gray-900">Commission configuration</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Commission % per tier (0–100)</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={labelClass}>Level 1 — lowest (%)</label>
                    <input type="number" min={0} max={100} step={0.5} value={commLevel1} onChange={(e) => { setCommLevel1(e.target.value); setCommissionErrors((p) => ({ ...p, level1: '' })); }} className={`${inputClass} ${commissionErrors.level1 ? 'border-red-500' : ''}`} />
                    {commissionErrors.level1 && <p className="mt-1 text-sm text-red-600">{commissionErrors.level1}</p>}
                  </div>
                  {referralMode === 'extended' && maxLevel >= 2 && (
                    <div>
                      <label className={labelClass}>Level 2 (%)</label>
                      <input type="number" min={0} max={100} step={0.5} value={commLevel2} onChange={(e) => { setCommLevel2(e.target.value); setCommissionErrors((p) => ({ ...p, level2: '' })); }} className={`${inputClass} ${commissionErrors.level2 ? 'border-red-500' : ''}`} />
                      {commissionErrors.level2 && <p className="mt-1 text-sm text-red-600">{commissionErrors.level2}</p>}
                    </div>
                  )}
                  {referralMode === 'extended' && maxLevel >= 3 && (
                    <div>
                      <label className={labelClass}>Level 3 — highest (%)</label>
                      <input type="number" min={0} max={100} step={0.5} value={commLevel3} onChange={(e) => { setCommLevel3(e.target.value); setCommissionErrors((p) => ({ ...p, level3: '' })); }} className={`${inputClass} ${commissionErrors.level3 ? 'border-red-500' : ''}`} />
                      {commissionErrors.level3 && <p className="mt-1 text-sm text-red-600">{commissionErrors.level3}</p>}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors">
              Close
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#094848] rounded-xl transition-colors disabled:opacity-70">
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save configuration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
