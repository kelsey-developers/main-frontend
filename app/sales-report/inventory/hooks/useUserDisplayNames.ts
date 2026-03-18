'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

type UserRecord = {
  id?: number | string;
  fullname?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  user?: UserRecord;
  data?: { user?: UserRecord };
};

function extractDisplayName(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  const user = (obj.user as UserRecord) ?? (obj.data as { user?: UserRecord })?.user ?? obj;
  const u = user as UserRecord;
  const fullname =
    u?.fullname ??
    u?.name ??
    ([u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() ||
      [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim());
  return typeof fullname === 'string' ? fullname.trim() : '';
}

function shouldLookupUserId(value: string): boolean {
  const id = value.trim();
  if (!id) return false;
  if (/^[-—]+$/.test(id)) return false;
  if (/^user\s*id\s*:/i.test(id)) return false;
  if (/^(unknown|unknown user|unknown reporter|none|null|undefined)$/i.test(id)) return false;

  // Auth service users are integer IDs (and may also be UUID in some environments).
  if (/^\d+$/.test(id)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return true;

  return false;
}

/**
 * Fetches display names for the given user IDs via GET /api/users/:id.
 * Used to show "Reported by" / "Resolved by" names in damage reports;
 * backend stores user id, frontend resolves and displays name.
 */
export function useUserDisplayNames(userIds: (string | number | undefined | null)[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const uniqueIds = [
    ...new Set(
      userIds
        .map((id) => (id != null ? String(id).trim() : ''))
        .filter((id) => shouldLookupUserId(id))
    ),
  ];

  const fetchNames = async (ids: string[], onlyUnrequested: boolean): Promise<void> => {
    const idsToFetch = onlyUnrequested
      ? ids.filter((id) => !requestedRef.current.has(id))
      : ids;
    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => requestedRef.current.add(id));

    const next: Record<string, string> = {};
    await Promise.all(
      idsToFetch.map(async (id) => {
        try {
          const data = await apiClient.get<unknown>(`/api/users/${encodeURIComponent(id)}?_ts=${Date.now()}`);
          const fullname = extractDisplayName(data);
          if (fullname) next[id] = fullname;
        } catch {
          // leave unresolved
        }
      })
    );

    if (Object.keys(next).length > 0) {
      setNames((prev) => ({ ...prev, ...next }));
    }
  };

  useEffect(() => {
    void fetchNames(uniqueIds, true);
  }, [uniqueIds.join(',')]);

  useEffect(() => {
    if (uniqueIds.length === 0) return;

    const refresh = () => {
      void fetchNames(uniqueIds, false);
    };

    const timer = window.setInterval(refresh, 30000);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uniqueIds.join(',')]);

  return names;
}
