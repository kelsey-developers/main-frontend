'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ fontFamily: 'Poppins' }}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Assign agents</h2>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{unitTitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned agents</label>
            {assigned.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No agents assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {assigned.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      @{agent.username}
                      {agent.fullname && <span className="text-gray-500 ml-1">({agent.fullname})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAgent(agent.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      aria-label="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search by username</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type username to search..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
            />
            {isSearching && (
              <p className="text-xs text-gray-500 mt-1">Searching...</p>
            )}
            {searchQuery && !isSearching && filteredSearchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {filteredSearchResults.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => addAgent(agent)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100 text-left"
                  >
                    <span className="text-sm font-medium">@{agent.username}</span>
                    <span className="text-xs text-gray-500">{agent.fullname}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && !isSearching && filteredSearchResults.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No agents found.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#0B5858] text-white font-medium hover:bg-[#094848] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
