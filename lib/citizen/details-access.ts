'use client';

import { supabase } from '@/lib/supabase/client';

// Memory only: refresh, sign-out, account switch, or expiry requires a new unlock.
let grant: { userId: string; token: string; expiresAt: number } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
export const DETAILS_LOCK_EVENT = 'govguide-details-locked';
export function hasDetailsAccess(userId: string) {
  return !!grant && grant.userId === userId && grant.expiresAt > Date.now();
}
export function clearDetailsAccess() {
  grant = null;
  clearTimeout(timer);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DETAILS_LOCK_EVENT));
}
export function acceptDetailsAccess(userId: string, token: string, expiresAt: string) {
  const expiry = Date.parse(expiresAt);
  if (!/^[a-f0-9]{64}$/.test(token) || !Number.isFinite(expiry) || expiry <= Date.now())
    throw new Error('Invalid unlock response.');
  clearTimeout(timer);
  grant = { userId, token, expiresAt: expiry };
  timer = setTimeout(clearDetailsAccess, expiry - Date.now());
}
export async function detailsFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  if (session && hasDetailsAccess(session.user.id)) headers.set('x-details-unlock', grant!.token);
  const response = await fetch(url, { ...init, headers, cache: 'no-store' });
  if (response.status === 401 || response.status === 423) clearDetailsAccess();
  return response;
}
export async function lockDetailsAccess() {
  // Capture the credentials before clearing the local grant.
  const current = grant;
  clearDetailsAccess();
  if (!current) return;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== current.userId) return;
  await fetch('/api/citizen/details/pin', {
    method: 'DELETE',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'x-details-unlock': current.token,
    },
  });
}
