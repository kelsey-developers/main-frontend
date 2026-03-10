'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMockAuth } from '@/contexts/MockAuthContext';
import {
  getAgentRegistrationConfig,
  saveAgentRegistrationConfig,
  getAgentsWithStatus,
  updateAgentStatus,
} from '@/services/agentRegistrationService';
import {
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
} from '@/services/referralTreeService';
import type {
  AgentRegistrationConfig,
  AgentWithStatus,
  ReferralMode,
  AgentStatus,
} from './types';
import type { PendingRegistration } from '@/types/referralTree';

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const sectionCardClass =
  'bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden';

function validateCommission(value: string): { valid: boolean; num?: number } {
  const n = parseFloat(value);
  if (Number.isNaN(n) || value.trim() === '') return { valid: false };
  if (n < 0 || n > 100) return { valid: false };
  return { valid: true, num: n };
}

export default function AgentRegistrationPage() {
  const router = useRouter();
  const { isAdmin, roleLoading } = useMockAuth();
  const [config, setConfig] = useState<AgentRegistrationConfig | null>(null);
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);
  const [commissionErrors, setCommissionErrors] = useState<Record<string, string>>({});
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [processingRegId, setProcessingRegId] = useState<string | null>(null);
  const [rejectRegTarget, setRejectRegTarget] = useState<PendingRegistration | null>(null);
  const [rejectRegReason, setRejectRegReason] = useState('');
  const [regFilter, setRegFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [overrideAgentId, setOverrideAgentId] = useState('');
  const [overrideL1, setOverrideL1] = useState('');
  const [overrideL2, setOverrideL2] = useState('');
  const [overrideL3, setOverrideL3] = useState('');
  const [overrideSaved, setOverrideSaved] = useState(false);

  // Form state (mirrors config for editing)
  const [fee, setFee] = useState<string>('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [referralMode, setReferralMode] = useState<ReferralMode>('basic');
  const [maxLevel, setMaxLevel] = useState(1);
  const [commLevel1, setCommLevel1] = useState('');
  const [commLevel2, setCommLevel2] = useState('');
  const [commLevel3, setCommLevel3] = useState('');

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
    try {
      setAgentsError(null);
      const list = await getAgentsWithStatus();
      setAgents(list);
    } catch (e) {
      setAgentsError(e instanceof Error ? e.message : 'Failed to load agents');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [, , pending] = await Promise.all([loadConfig(), loadAgents(), getPendingRegistrations()]);
      if (!cancelled) {
        setPendingRegistrations(pending);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConfig, loadAgents]);

  const validateCommissions = useCallback((): boolean => {
    const err: Record<string, string> = {};
    const v1 = validateCommission(commLevel1);
    if (!v1.valid) err.level1 = 'Enter a number between 0 and 100';
    if (referralMode === 'extended' && maxLevel >= 2) {
      const v2 = validateCommission(commLevel2);
      if (!v2.valid) err.level2 = 'Enter a number between 0 and 100';
    }
    if (referralMode === 'extended' && maxLevel >= 3) {
      const v3 = validateCommission(commLevel3);
      if (!v3.valid) err.level3 = 'Enter a number between 0 and 100';
    }
    setCommissionErrors(err);
    return Object.keys(err).length === 0;
  }, [commLevel1, commLevel2, commLevel3, referralMode, maxLevel]);

  const handleSave = async () => {
    if (!config) return;
    if (!validateCommissions()) return;
    const feeNum = parseFloat(fee);
    if (Number.isNaN(feeNum) || feeNum < 0) {
      setConfigError('Registration fee must be a non-negative number.');
      return;
    }
    setConfigError(null);
    setSaving(true);
    setSaveSuccess(false);
    try {
      const commissions = {
        level1: validateCommission(commLevel1).num ?? 0,
        level2: referralMode === 'extended' && maxLevel >= 2 ? validateCommission(commLevel2).num : undefined,
        level3: referralMode === 'extended' && maxLevel >= 3 ? validateCommission(commLevel3).num : undefined,
      };
      const next: AgentRegistrationConfig = {
        ...config,
        registrationFee: feeNum,
        registrationEnabled,
        referralMode,
        maxReferralLevel: referralMode === 'basic' ? 1 : maxLevel,
        commissions,
      };
      const saved = await saveAgentRegistrationConfig(next);
      setConfig(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to save config');
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
      setCommissionErrors((prev) => {
        const next = { ...prev };
        delete next.level2;
        delete next.level3;
        return next;
      });
    } else {
      setMaxLevel(2);
      setCommLevel2(commLevel2 || '5');
      setCommLevel3(maxLevel >= 3 ? (commLevel3 || '2') : '');
    }
  };

  const handleMaxLevelChange = (level: number) => {
    setMaxLevel(level);
    if (level < 3) {
      setCommLevel3('');
      setCommissionErrors((prev) => {
        const next = { ...prev };
        delete next.level3;
        return next;
      });
    } else {
      setCommLevel3(commLevel3 || '2');
    }
  };

  const handleToggleAgentStatus = async (agent: AgentWithStatus) => {
    const nextStatus: AgentStatus = agent.status === 'active' ? 'inactive' : 'active';
    setTogglingAgentId(agent.id);
    try {
      await updateAgentStatus(agent.id, nextStatus);
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, status: nextStatus } : a))
      );
    } catch {
      setAgentsError('Failed to update agent status');
    } finally {
      setTogglingAgentId(null);
    }
  };

  const filteredAgents = agents.filter((a) => {
    const matchSearch =
      (a.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && a.status === 'active') ||
      (statusFilter === 'inactive' && a.status === 'inactive');
    return matchSearch && matchStatus && a.role === 'agent';
  });

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#0B5858] border-r-transparent" />
            <p className="mt-4 text-gray-600" style={{ fontFamily: 'Poppins' }}>
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // if (!isAdmin) {
  //   return (
  //     <div className="min-h-screen bg-gray-50">
  //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
  //         <div className="flex flex-col items-center justify-center py-12">
  //           <div className="text-red-500">
  //             <svg className="w-20 h-20 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  //             </svg>
  //             <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>
  //               Access Denied
  //             </h3>
  //             <p className="text-gray-600 text-center" style={{ fontFamily: 'Poppins' }}>
  //               You need admin privileges to access Agent Registration &amp; Referral Tree.
  //             </p>
  //           </div>
  //           <div className="mt-6">
  //             <button
  //               type="button"
  //               onClick={() => router.push('/admin')}
  //               className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer"
  //               style={{ fontFamily: 'Poppins' }}
  //             >
  //               Back to Admin
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Back to admin"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-gray-900"
              style={{ fontFamily: 'Poppins', fontWeight: 700 }}
            >
              Kelsey&apos;s Homestay – Integrated Information Management System
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
              Agent Registration &amp; Referral Tree
            </p>
          </div>
        </div>

        {configError && (
          <div
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
            style={{ fontFamily: 'Poppins' }}
          >
            {configError}
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: Agent Registration */}
          <section className={sectionCardClass}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Agent Registration
              </h2>
              <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
                One-time registration fee and enable/disable new agent sign-ups
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className={labelClass} style={{ fontFamily: 'Poppins' }}>
                  Registration fee (per new agent)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: 'Poppins' }}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>
                  Allow new agent registration
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={registrationEnabled}
                  onClick={() => setRegistrationEnabled(!registrationEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:ring-offset-2 cursor-pointer ${
                    registrationEnabled ? '' : 'bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: registrationEnabled ? '#0B5858' : undefined,
                  }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>
                  {registrationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Referral Structure */}
          <section className={sectionCardClass}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Referral Structure
              </h2>
              <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
                Basic: Level 1 only. Extended: configurable multi-level (e.g. up to Level 3)
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <span className={labelClass} style={{ fontFamily: 'Poppins' }}>
                  Referral mode
                </span>
                <div className="flex flex-wrap gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="referralMode"
                      checked={referralMode === 'basic'}
                      onChange={() => handleReferralModeChange('basic')}
                      className="w-4 h-4 text-[#0B5858] focus:ring-[#0B5858]"
                    />
                    <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>
                      Basic (Level 1 only)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="referralMode"
                      checked={referralMode === 'extended'}
                      onChange={() => handleReferralModeChange('extended')}
                      className="w-4 h-4 text-[#0B5858] focus:ring-[#0B5858]"
                    />
                    <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>
                      Extended (multi-level)
                    </span>
                  </label>
                </div>
              </div>
              {referralMode === 'extended' && (
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Poppins' }}>
                    Max referral level
                  </label>
                  <select
                    value={maxLevel}
                    onChange={(e) => handleMaxLevelChange(Number(e.target.value))}
                    className={inputClass}
                    style={{ fontFamily: 'Poppins', maxWidth: '12rem' }}
                  >
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Commission Configuration */}
          <section className={sectionCardClass}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Commission Configuration
              </h2>
              <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
                Commission % per booking for each referral level (0–100)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="max-w-xs">
                <label className={labelClass} style={{ fontFamily: 'Poppins' }}>
                  Level 1 (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={commLevel1}
                  onChange={(e) => {
                    setCommLevel1(e.target.value);
                    setCommissionErrors((prev) => ({ ...prev, level1: '' }));
                  }}
                  className={`${inputClass} ${commissionErrors.level1 ? 'border-red-500' : ''}`}
                  style={{ fontFamily: 'Poppins' }}
                />
                {commissionErrors.level1 && (
                  <p className="mt-1 text-sm text-red-600" style={{ fontFamily: 'Poppins' }}>
                    {commissionErrors.level1}
                  </p>
                )}
              </div>
              {referralMode === 'extended' && maxLevel >= 2 && (
                <div className="max-w-xs">
                  <label className={labelClass} style={{ fontFamily: 'Poppins' }}>
                    Level 2 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commLevel2}
                    onChange={(e) => {
                      setCommLevel2(e.target.value);
                      setCommissionErrors((prev) => ({ ...prev, level2: '' }));
                    }}
                    className={`${inputClass} ${commissionErrors.level2 ? 'border-red-500' : ''}`}
                    style={{ fontFamily: 'Poppins' }}
                  />
                  {commissionErrors.level2 && (
                    <p className="mt-1 text-sm text-red-600" style={{ fontFamily: 'Poppins' }}>
                      {commissionErrors.level2}
                    </p>
                  )}
                </div>
              )}
              {referralMode === 'extended' && maxLevel >= 3 && (
                <div className="max-w-xs">
                  <label className={labelClass} style={{ fontFamily: 'Poppins' }}>
                    Level 3 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commLevel3}
                    onChange={(e) => {
                      setCommLevel3(e.target.value);
                      setCommissionErrors((prev) => ({ ...prev, level3: '' }));
                    }}
                    className={`${inputClass} ${commissionErrors.level3 ? 'border-red-500' : ''}`}
                    style={{ fontFamily: 'Poppins' }}
                  />
                  {commissionErrors.level3 && (
                    <p className="mt-1 text-sm text-red-600" style={{ fontFamily: 'Poppins' }}>
                      {commissionErrors.level3}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Pending Registrations */}
          <section className={sectionCardClass}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Pending Registrations
              </h2>
              <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
                Review and approve or reject new agent applicants.
              </p>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setRegFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      regFilter === f ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {f} {f !== 'all' && `(${pendingRegistrations.filter((r) => r.status === f).length})`}
                  </button>
                ))}
              </div>
              {pendingRegistrations.filter((r) => regFilter === 'all' || r.status === regFilter).length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm" style={{ fontFamily: 'Poppins' }}>
                  No {regFilter !== 'all' ? regFilter : ''} registrations.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingRegistrations
                    .filter((r) => regFilter === 'all' || r.status === regFilter)
                    .map((reg) => (
                      <div key={reg.id} className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>{reg.fullname}</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              reg.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              reg.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}>{reg.status}</span>
                            {reg.registrationFeeStatus === 'paid' && (
                              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Fee Paid ✓</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>{reg.email} · {reg.contactNumber}</p>
                          {reg.recruitedByName && (
                            <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Poppins' }}>Referred by: {reg.recruitedByName}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                            Applied: {new Date(reg.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {reg.notes && <p className="text-xs text-gray-500 mt-1 italic" style={{ fontFamily: 'Poppins' }}>{reg.notes}</p>}
                        </div>
                        {reg.status === 'pending' && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={async () => {
                                setProcessingRegId(reg.id);
                                await approveRegistration(reg.id);
                                setPendingRegistrations((prev) => prev.map((r) => r.id === reg.id ? { ...r, status: 'approved' as const } : r));
                                setProcessingRegId(null);
                              }}
                              disabled={processingRegId === reg.id}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B5858] hover:bg-[#0d7a7a] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              style={{ fontFamily: 'Poppins' }}
                            >
                              {processingRegId === reg.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectRegTarget(reg); setRejectRegReason(''); }}
                              disabled={processingRegId === reg.id}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              style={{ fontFamily: 'Poppins' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>

          {/* Section 5: Per-Agent Commission Override */}
          <section className={sectionCardClass}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Per-Agent Commission Override
              </h2>
              <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
                Set custom commission rates for a specific agent. Overrides global rates when set.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="max-w-xs">
                <label className={labelClass} style={{ fontFamily: 'Poppins' }}>Select Agent</label>
                <select
                  value={overrideAgentId}
                  onChange={(e) => setOverrideAgentId(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: 'Poppins' }}
                >
                  <option value="">— Select an agent —</option>
                  {agents.filter((a) => a.role === 'agent' && a.status === 'active').map((a) => (
                    <option key={a.id} value={a.id}>{a.fullname || a.email}</option>
                  ))}
                </select>
              </div>
              {overrideAgentId && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-w-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Poppins' }}>
                    Override Commission Rates
                  </p>
                  {[
                    { label: 'Level 1 (%)', value: overrideL1, set: setOverrideL1, placeholder: `Global: ${commLevel1}%` },
                    { label: 'Level 2 (%)', value: overrideL2, set: setOverrideL2, placeholder: `Global: ${commLevel2 || 'N/A'}` },
                    { label: 'Level 3 (%)', value: overrideL3, set: setOverrideL3, placeholder: `Global: ${commLevel3 || 'N/A'}` },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>{field.label}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={field.value}
                        onChange={(e) => field.set(e.target.value)}
                        placeholder={field.placeholder}
                        className={`${inputClass} text-xs`}
                        style={{ fontFamily: 'Poppins' }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setOverrideSaved(true);
                      setTimeout(() => setOverrideSaved(false), 2500);
                    }}
                    className="w-full py-2 text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#0d7a7a] rounded-xl transition-colors cursor-pointer mt-2"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {overrideSaved ? 'Override Saved! ✓' : 'Save Override'}
                  </button>
                  <p className="text-xs text-gray-400 text-center" style={{ fontFamily: 'Poppins' }}>
                    Leave blank to use global rate. Changes are logged to the audit trail.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Section 6: Agent Status Management */}
          <section className={sectionCardClass}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Agent Status Management
              </h2>
              <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
                Mark agents as active or inactive
              </p>
            </div>
            <div className="p-6">
              {agentsError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" style={{ fontFamily: 'Poppins' }}>
                  {agentsError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] bg-white"
                    style={{ fontFamily: 'Poppins' }}
                  />
                </div>
                <div className="w-full sm:w-40">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: '#0B5858' }}>
                    <tr>
                      <th className="px-6 py-4 text-white font-semibold text-sm" style={{ fontFamily: 'Poppins' }}>
                        Agent
                      </th>
                      <th className="px-6 py-4 text-white font-semibold text-sm" style={{ fontFamily: 'Poppins' }}>
                        Contact
                      </th>
                      <th className="px-6 py-4 text-white font-semibold text-sm" style={{ fontFamily: 'Poppins' }}>
                        Joined
                      </th>
                      <th className="px-6 py-4 text-white font-semibold text-sm" style={{ fontFamily: 'Poppins' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500" style={{ fontFamily: 'Poppins' }}>
                          No agents match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAgents.map((agent, index) => (
                        <tr
                          key={agent.id}
                          className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <td className="px-6 py-3">
                            <div className="font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>
                              {agent.fullname || '—'}
                            </div>
                            <div className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>
                              {agent.email || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-700 text-sm" style={{ fontFamily: 'Poppins' }}>
                            {agent.contact_number || '—'}
                          </td>
                          <td className="px-6 py-3 text-gray-700 text-sm" style={{ fontFamily: 'Poppins' }}>
                            {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleAgentStatus(agent)}
                              disabled={togglingAgentId === agent.id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 cursor-pointer disabled:opacity-50 ${
                                agent.status === 'active' ? '' : 'bg-gray-200'
                              }`}
                              style={{
                                backgroundColor: agent.status === 'active' ? '#0B5858' : undefined,
                              }}
                            >
                              {togglingAgentId === agent.id ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                </div>
                              ) : (
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    agent.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              )}
                            </button>
                            <span className="ml-2 text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>
                              {agent.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Reject Registration Modal */}
        {rejectRegTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectRegTarget(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" style={{ fontFamily: 'Poppins' }}>
              <h3 className="text-base font-bold text-gray-900 mb-1">Reject Registration</h3>
              <p className="text-sm text-gray-500 mb-4">Applicant: <strong>{rejectRegTarget.fullname}</strong></p>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for rejection</label>
              <textarea
                rows={3}
                value={rejectRegReason}
                onChange={(e) => setRejectRegReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRejectRegTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button
                  onClick={async () => {
                    if (!rejectRegReason.trim()) return;
                    setProcessingRegId(rejectRegTarget.id);
                    await rejectRegistration(rejectRegTarget.id, rejectRegReason);
                    setPendingRegistrations((prev) => prev.map((r) => r.id === rejectRegTarget.id ? { ...r, status: 'rejected' as const } : r));
                    setProcessingRegId(null);
                    setRejectRegTarget(null);
                  }}
                  disabled={!rejectRegReason.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Reject Applicant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="bg-gray-50/80 border-t border-gray-100 px-6 sm:px-8 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: 'Poppins', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#094848] rounded-xl transition-colors disabled:opacity-70 cursor-pointer"
              style={{ fontFamily: 'Poppins', fontWeight: 600 }}
            >
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
