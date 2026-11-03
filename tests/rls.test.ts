import { describe, it, expect } from 'vitest';
import {
  getRoleRedirectPath,
  canManageAgency,
  canAccessRequest,
  isCitizen,
  isAgencyAdmin,
  isPlatformAdmin,
} from '../lib/auth/roles';

describe('M1 Auth & RLS Access Control Tests', () => {
  describe('Role-Based Redirects', () => {
    it('redirects citizens to /citizen/chat', () => {
      expect(getRoleRedirectPath('citizen')).toBe('/citizen/chat');
    });

    it('redirects agency admins to /agency/dashboard', () => {
      expect(getRoleRedirectPath('agency_admin')).toBe('/agency/dashboard');
    });

    it('redirects platform admins to /admin/dashboard', () => {
      expect(getRoleRedirectPath('platform_admin')).toBe('/admin/dashboard');
    });

    it('redirects unauthenticated users to /login', () => {
      expect(getRoleRedirectPath(null)).toBe('/login');
      expect(getRoleRedirectPath(undefined)).toBe('/login');
    });
  });

  describe('Role Boolean Helpers', () => {
    it('accurately identifies roles', () => {
      expect(isCitizen('citizen')).toBe(true);
      expect(isCitizen('agency_admin')).toBe(false);

      expect(isAgencyAdmin('agency_admin')).toBe(true);
      expect(isAgencyAdmin('citizen')).toBe(false);

      expect(isPlatformAdmin('platform_admin')).toBe(true);
      expect(isPlatformAdmin('citizen')).toBe(false);
    });
  });

  describe('Agency Data Governance (RLS Equivalency)', () => {
    const AGENCY_NBI = 'agency-nbi-1111';
    const AGENCY_PSA = 'agency-psa-2222';

    it('allows platform admin to manage any agency', () => {
      expect(canManageAgency('platform_admin', null, AGENCY_NBI)).toBe(true);
      expect(canManageAgency('platform_admin', null, AGENCY_PSA)).toBe(true);
    });

    it('allows agency admin to manage only their assigned agency', () => {
      expect(canManageAgency('agency_admin', AGENCY_NBI, AGENCY_NBI)).toBe(true);
      expect(canManageAgency('agency_admin', AGENCY_NBI, AGENCY_PSA)).toBe(false);
    });

    it('prevents citizens from managing agency data or charters', () => {
      expect(canManageAgency('citizen', null, AGENCY_NBI)).toBe(false);
    });
  });

  describe('Cross-Agency & Citizen Request Isolation (RLS Equivalency)', () => {
    const CITIZEN_JUAN = 'user-juan-001';
    const CITIZEN_MARIA = 'user-maria-002';
    const AGENCY_NBI = 'agency-nbi';
    const AGENCY_PSA = 'agency-psa';

    it('allows a citizen to access their own request', () => {
      const allowed = canAccessRequest({
        actorRole: 'citizen',
        actorUserId: CITIZEN_JUAN,
        requestCitizenId: CITIZEN_JUAN,
        requestAgencyId: AGENCY_NBI,
      });
      expect(allowed).toBe(true);
    });

    it('strictly forbids a citizen from accessing another citizen request (RLS violation prevention)', () => {
      const allowed = canAccessRequest({
        actorRole: 'citizen',
        actorUserId: CITIZEN_JUAN,
        requestCitizenId: CITIZEN_MARIA,
        requestAgencyId: AGENCY_NBI,
      });
      expect(allowed).toBe(false);
    });

    it('allows agency admin to access requests within their agency', () => {
      const allowed = canAccessRequest({
        actorRole: 'agency_admin',
        actorUserId: 'admin-nbi',
        actorAgencyId: AGENCY_NBI,
        requestCitizenId: CITIZEN_JUAN,
        requestAgencyId: AGENCY_NBI,
      });
      expect(allowed).toBe(true);
    });

    it('strictly blocks agency admin from inspecting requests of a competing/different agency', () => {
      const allowed = canAccessRequest({
        actorRole: 'agency_admin',
        actorUserId: 'admin-psa',
        actorAgencyId: AGENCY_PSA,
        requestCitizenId: CITIZEN_JUAN,
        requestAgencyId: AGENCY_NBI,
      });
      expect(allowed).toBe(false);
    });

    it('allows platform admin to audit any request', () => {
      const allowed = canAccessRequest({
        actorRole: 'platform_admin',
        actorUserId: 'super-admin',
        requestCitizenId: CITIZEN_JUAN,
        requestAgencyId: AGENCY_NBI,
      });
      expect(allowed).toBe(true);
    });
  });
});
