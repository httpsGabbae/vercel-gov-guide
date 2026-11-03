import type { UserRole } from '../supabase/types';

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  citizen: '/citizen/chat',
  agency_admin: '/agency/dashboard',
  platform_admin: '/admin/dashboard',
};

export function getRoleRedirectPath(role?: UserRole | string | null): string {
  if (!role) return '/login';
  if (role in ROLE_REDIRECTS) {
    return ROLE_REDIRECTS[role as UserRole];
  }
  return '/citizen/chat';
}

export function isCitizen(role?: string | null): boolean {
  return role === 'citizen';
}

export function isAgencyAdmin(role?: string | null): boolean {
  return role === 'agency_admin';
}

export function isPlatformAdmin(role?: string | null): boolean {
  return role === 'platform_admin';
}

/**
 * Validates if the actor can manage an agency's data or charters.
 */
export function canManageAgency(
  role: UserRole,
  userAgencyId: string | null,
  targetAgencyId: string,
): boolean {
  if (role === 'platform_admin') return true;
  if (role === 'agency_admin' && userAgencyId === targetAgencyId) return true;
  return false;
}

/**
 * Validates if the actor can view/manage a specific service request.
 */
export function canAccessRequest(params: {
  actorRole: UserRole;
  actorUserId: string;
  actorAgencyId?: string | null;
  requestCitizenId: string;
  requestAgencyId: string;
}): boolean {
  const { actorRole, actorUserId, actorAgencyId, requestCitizenId, requestAgencyId } = params;

  if (actorRole === 'platform_admin') return true;
  if (actorRole === 'citizen' && actorUserId === requestCitizenId) return true;
  if (actorRole === 'agency_admin' && actorAgencyId === requestAgencyId) return true;

  return false;
}
