'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { listAgents, type AgentForAssign } from '@/lib/api/agents';
import { updateUnit } from '@/lib/api/units';
import type { AssignedAgent } from '@/types/listing';

interface AssignAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitTitle: string;
  assignedAgents: AssignedAgent[];
  onSaved: (agents: AssignedAgent[]) => void;
}

export default function AssignAgentsModal({
  isOpen,
  onClose,
  unitId,
  unitTitle,
  assignedAgents,
  onSaved,
}: AssignAgentsModalProps) {
  const [assigned, setAssigned] = useState<AssignedAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AgentForAssign[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAssigned(assignedAgents);
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, assignedAgents]);

  const searchAgents = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const agents = await listAgents(query.trim());
      setSearchResults(agents);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchAgents(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchAgents]);

  const addAgent = (agent: AgentForAssign) => {
    if (assigned.some((a) => a.id === agent.id)) return;
    setAssigned((prev) => [...prev, { id: agent.id, username: agent.username, fullname: agent.fullname }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeAgent = (agentId: string) => {
    setAssigned((prev) => prev.filter((a) => a.id !== agentId));
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await updateUnit(unitId, { assigned_agent_ids: assigned.map((a) => a.id) });
      onSaved(assigned);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredSearchResults = searchResults.filter((a) => !assigned.some((x) => x.id === a.id));

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ fontFamily: 'Poppins' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-lg font-bold text-gray-900">Assign Agents</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{unitTitle}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Agents</label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0B5858] border-t-transparent" />
                </div>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery && !isSearching && filteredSearchResults.length > 0 && (
              <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden shadow-lg bg-white">
                <div className="max-h-48 overflow-y-auto">
                  {filteredSearchResults.map((agent, idx) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => addAgent(agent)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0B5858]/5 text-left transition-colors cursor-pointer ${idx !== 0 ? 'border-t border-gray-50' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0B5858]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#0B5858]">
                          {agent.fullname?.charAt(0) || agent.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{agent.fullname || agent.username}</p>
                        <p className="text-xs text-gray-500">@{agent.username}</p>
                      </div>
                      <svg className="w-4 h-4 text-[#0B5858] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchQuery && !isSearching && filteredSearchResults.length === 0 && (
              <p className="text-xs text-gray-500 mt-2 px-1">No agents found matching &quot;{searchQuery}&quot;</p>
            )}
          </div>

          {/* Assigned Agents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Assigned Agents</label>
              {assigned.length > 0 && (
                <span className="text-xs font-medium text-[#0B5858] bg-[#0B5858]/10 px-2 py-0.5 rounded-full">
                  {assigned.length} assigned
                </span>
              )}
            </div>
            
            {assigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm text-gray-500 text-center">No agents assigned yet</p>
                <p className="text-xs text-gray-400 text-center mt-1">Search above to add agents</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assigned.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-gray-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0B5858] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {agent.fullname?.charAt(0) || agent.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{agent.fullname || agent.username}</p>
                      <p className="text-xs text-gray-500">@{agent.username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAgent(agent.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      aria-label="Remove agent"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#094848] hover:shadow-lg hover:shadow-[#0B5858]/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
