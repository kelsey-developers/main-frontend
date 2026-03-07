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
import type {
  AgentRegistrationConfig,
  AgentWithStatus,
  ReferralMode,
  AgentStatus,
} from './types';

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
      await Promise.all([loadConfig(), loadAgents()]);
      if (!cancelled) setLoading(false);
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-500">
              <svg className="w-20 h-20 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>
                Access Denied
              </h3>
              <p className="text-gray-600 text-center" style={{ fontFamily: 'Poppins' }}>
                You need admin privileges to access Agent Registration &amp; Referral Tree.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer"
                style={{ fontFamily: 'Poppins' }}
              >
                Back to Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Section 4: Agent Status Management */}
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
