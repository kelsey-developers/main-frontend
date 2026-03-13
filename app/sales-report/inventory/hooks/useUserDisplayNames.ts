'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

type UserRecord = {
  id?: number | string;
  fullname?: string;
  firstName?: string;
  lastName?: string;
  user?: UserRecord;
};

/**
 * Fetches display names for the given user IDs via GET /api/users/:id.
 * Used to show "Reported by" / "Resolved by" names in damage reports;
 * backend stores user id, frontend resolves and displays name.
 */
export function useUserDisplayNames(userIds: (string | number | undefined | null)[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const uniqueIds = [...new Set(userIds.map((id) => (id != null ? String(id) : '')).filter(Boolean))];

  useEffect(() => {
    const idsToFetch = uniqueIds.filter((id) => !requestedRef.current.has(id));
    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => requestedRef.current.add(id));

    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const data = await apiClient.get<UserRecord>(`/api/users/${encodeURIComponent(id)}`);
            const user = (data as UserRecord)?.user ?? data;
            const fullname =
              user?.fullname ??
              [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
            if (fullname) next[id] = fullname;
          } catch {
            // leave unresolved
          }
        })
      );
      setNames((prev) => ({ ...prev, ...next }));
    })();
  }, [uniqueIds.join(',')]);

  return names;
}
