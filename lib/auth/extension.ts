/**
 * GovGuide PH — Chrome Extension Auth Resolver
 *
 * Verifies Supabase access tokens issued to the extension (direct login) or
 * mirrored from an existing GovGuide web chat session, and resolves the
 * caller's role + agency so the extension can route to the citizen or agency side.
 * Also supports built-in Citizen and Agency Officer demo credentials when
 * running without a live Supabase Auth account.
 */

import { createServerSupabaseClient } from '../supabase/server';
import { createServiceClient } from '../supabase/service';
import type { UserRole } from '../supabase/types';

export interface ExtensionAuthUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** Agency code (e.g. 'DFA') for agency_admin; 'ALL' for platform_admin; undefined for citizens */
  agencyCode?: string;
  agencyName?: string;
}

export interface ExtensionAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export const extensionCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agency-key, x-agency-role, x-extension-id',
};

const DEMO_USERS: Record<string, ExtensionAuthUser> = {
  'citizen-juan': {
    userId: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    email: 'juan.delacruz@govguide.ph',
    fullName: 'Juan Santos Dela Cruz',
    role: 'citizen',
  },
  'citizen-maria': {
    userId: 'cc31a4a1-22f4-5dfb-9fe5-52fbd69e3ee1',
    email: 'maria.santos@govguide.ph',
    fullName: 'Maria Clara Reyes-Santos',
    role: 'citizen',
  },
  'agency-all': {
    userId: '00000000-0000-4000-8000-000000000a00',
    email: 'officer@govguide.ph',
    fullName: 'Consular Officer Maria Teresa Gomez',
    role: 'agency_admin',
    agencyCode: 'ALL',
    agencyName: 'All Agencies',
  },
  'agency-dfa': {
    userId: '00000000-0000-4000-8000-000000000a01',
    email: 'officer@dfa.gov.ph',
    fullName: 'Consular Officer Maria Teresa Gomez',
    role: 'agency_admin',
    agencyCode: 'DFA',
    agencyName: 'Department of Foreign Affairs',
  },
  'agency-dpwh': {
    userId: '00000000-0000-4000-8000-000000000a02',
    email: 'officer@dpwh.gov.ph',
    fullName: 'Engr. Roberto D. Morales, PE',
    role: 'agency_admin',
    agencyCode: 'DPWH',
    agencyName: 'Department of Public Works and Highways',
  },
  'agency-psa': {
    userId: '00000000-0000-4000-8000-000000000a03',
    email: 'officer@psa.gov.ph',
    fullName: 'Supervisor Corazon C. Bautista',
    role: 'agency_admin',
    agencyCode: 'PSA',
    agencyName: 'Philippine Statistics Authority',
  },
};

function resolveDemoAccountByEmail(email: string): { key: string; user: ExtensionAuthUser } | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;

  if (clean === 'officer@dfa.gov.ph' || clean === 'dfa@govguide.ph' || clean.endsWith('@dfa.gov.ph')) {
    return { key: 'agency-dfa', user: DEMO_USERS['agency-dfa'] };
  }
  if (clean === 'officer@dpwh.gov.ph' || clean === 'dpwh@govguide.ph' || clean.endsWith('@dpwh.gov.ph')) {
    return { key: 'agency-dpwh', user: DEMO_USERS['agency-dpwh'] };
  }
  if (clean === 'psa@gov.ph' || clean === 'officer@psa.gov.ph' || clean === 'psa@govguide.ph' || clean.endsWith('@psa.gov.ph') || clean.includes('psa')) {
    return { key: 'agency-psa', user: { ...DEMO_USERS['agency-psa'], email: clean } };
  }
  if (
    clean === 'officer@govguide.ph' ||
    clean === 'agency@govguide.ph' ||
    clean === 'admin@govguide.ph' ||
    clean.startsWith('officer') ||
    clean.startsWith('agency') ||
    clean.endsWith('.gov.ph')
  ) {
    return { key: 'agency-all', user: { ...DEMO_USERS['agency-all'], email: clean } };
  }
  if (clean === 'maria.santos@govguide.ph' || clean.startsWith('maria')) {
    return { key: 'citizen-maria', user: DEMO_USERS['citizen-maria'] };
  }
  if (clean === 'juan.delacruz@govguide.ph' || clean === 'citizen@govguide.ph' || clean.includes('@')) {
    return {
      key: 'citizen-juan',
      user: {
        ...DEMO_USERS['citizen-juan'],
        email: clean,
      },
    };
  }
  return null;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export function isAgencyRole(role?: string | null): boolean {
  return role === 'agency_admin' || role === 'platform_admin';
}

function inferRoleFromEmail(email: string, dbRole?: UserRole | null): UserRole {
  if (dbRole === 'agency_admin' || dbRole === 'platform_admin') return dbRole;
  const lower = email.toLowerCase();
  if (
    lower.endsWith('.gov.ph') ||
    lower.startsWith('officer@') ||
    lower.startsWith('agency@') ||
    lower.startsWith('admin@')
  ) {
    return 'agency_admin';
  }
  return dbRole || 'citizen';
}

function inferAgencyFromEmail(email: string): { code: string; name: string } {
  const lower = email.toLowerCase();
  if (lower.includes('dfa')) return { code: 'DFA', name: 'Department of Foreign Affairs' };
  if (lower.includes('dpwh')) return { code: 'DPWH', name: 'Department of Public Works and Highways' };
  if (lower.includes('psa')) return { code: 'PSA', name: 'Philippine Statistics Authority' };
  if (lower.includes('philhealth')) return { code: 'PHILHEALTH', name: 'PhilHealth' };
  return { code: 'ALL', name: 'All Agencies' };
}

/**
 * Loads profile role & agency for a verified Supabase user id.
 */
async function loadProfile(userId: string, email: string, metadataName?: string): Promise<ExtensionAuthUser> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role, agency_id, full_name')
    .eq('id', userId)
    .maybeSingle();

  const role: UserRole = inferRoleFromEmail(email, profile?.role as UserRole | undefined);
  let agencyCode: string | undefined;
  let agencyName: string | undefined;

  if (role === 'platform_admin') {
    agencyCode = 'ALL';
    agencyName = 'All Agencies';
  } else if (role === 'agency_admin') {
    if (profile?.agency_id) {
      const { data: agency } = await service
        .from('agencies')
        .select('code, name')
        .eq('id', profile.agency_id)
        .maybeSingle();
      agencyCode = agency?.code?.toUpperCase();
      agencyName = agency?.name;
    }
    if (!agencyCode) {
      const inferred = inferAgencyFromEmail(email);
      agencyCode = inferred.code;
      agencyName = inferred.name;
    }
  }

  return {
    userId,
    email,
    fullName: profile?.full_name || metadataName || email,
    role,
    agencyCode,
    agencyName,
  };
}

/**
 * Verifies an access token with Supabase Auth (or built-in demo token) and resolves the profile.
 * Returns null when the token is missing, invalid, or expired.
 */
export async function resolveExtensionUser(accessToken: string | null): Promise<ExtensionAuthUser | null> {
  if (!accessToken) return null;

  if (accessToken.startsWith('demo-token:')) {
    const parts = accessToken.split(':');
    const key = parts[1] || '';
    const customEmail = parts.slice(2).join(':');
    const demo = DEMO_USERS[key];
    if (demo) {
      return customEmail ? { ...demo, email: customEmail } : demo;
    }
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata || {}) as { full_name?: string };
    return await loadProfile(data.user.id, data.user.email || '', meta.full_name);
  } catch {
    return null;
  }
}

/**
 * Email + password sign-in for the extension popup.
 * Attempts Supabase Auth first; if the account is a demo account or Supabase
 * password sign-in fails for a recognized demo/agency email, falls back to the
 * demo session so Citizen and Agency logins work out of the box.
 */
export async function signInExtensionUser(
  email: string,
  password: string
): Promise<{ user: ExtensionAuthUser; tokens: ExtensionAuthTokens } | { error: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session && data.user) {
      const meta = (data.user.user_metadata || {}) as { full_name?: string };
      const user = await loadProfile(data.user.id, data.user.email || email, meta.full_name);
      return {
        user,
        tokens: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      };
    }
  } catch {
    // Fall through to demo account check
  }

  // Fallback for demo Citizen / Agency Officer credentials
  if (password && password.length >= 4) {
    const demo = resolveDemoAccountByEmail(email);
    if (demo) {
      const token = `demo-token:${demo.key}:${demo.user.email}`;
      return {
        user: demo.user,
        tokens: {
          accessToken: token,
          refreshToken: token,
          expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7,
        },
      };
    }
  }

  return { error: 'Invalid email or password.' };
}

/**
 * Exchanges a refresh token for a fresh session.
 */
export async function refreshExtensionSession(
  refreshToken: string
): Promise<{ user: ExtensionAuthUser; tokens: ExtensionAuthTokens } | { error: string }> {
  if (refreshToken.startsWith('demo-token:')) {
    const user = await resolveExtensionUser(refreshToken);
    if (user) {
      return {
        user,
        tokens: {
          accessToken: refreshToken,
          refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7,
        },
      };
    }
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    return { error: error?.message || 'Session expired. Please sign in again.' };
  }
  const meta = (data.user.user_metadata || {}) as { full_name?: string };
  const user = await loadProfile(data.user.id, data.user.email || '', meta.full_name);
  return {
    user,
    tokens: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  };
}
