import { describe, it, expect, beforeEach } from 'vitest';
import {
  proposeSubmitAction,
  confirmPendingAction,
  cancelPendingAction,
  clearMemoryStores,
  getMemoryAuditLogs,
  type PendingAction,
} from '../lib/actions/pending';
import { computePayloadHash, canonicalizeJson } from '../lib/actions/crypto';

describe('M5 Confirmation-Gated Submit & Safety Unit Tests', () => {
  beforeEach(() => {
    clearMemoryStores();
  });

  const validNbiPayload = {
    applicationType: 'NEW' as const,
    isFirstTimeJobseeker: true,
    firstName: 'JUAN',
    middleName: 'DELA CRUZ',
    lastName: 'SANTOS',
    suffix: '',
    dateOfBirth: '1995-08-14',
    gender: 'MALE' as const,
    civilStatus: 'SINGLE' as const,
    mobileNumber: '09171234567',
    email: 'juan@example.com',
    presentAddress: 'Sampaloc, Manila',
    purpose: 'LOCAL_EMPLOYMENT' as const,
  };

  describe('Cryptographic Payload Hashing', () => {
    it('produces identical SHA-256 hashes regardless of JSON key ordering', () => {
      const objA = { name: 'JUAN', age: 30, city: 'MANILA' };
      const objB = { city: 'MANILA', name: 'JUAN', age: 30 };

      const hashA = computePayloadHash(objA);
      const hashB = computePayloadHash(objB);

      expect(hashA).toBe(hashB);
      expect(hashA.length).toBe(64);
    });

    it('detects even a single character discrepancy in payload', () => {
      const objA = { name: 'JUAN' };
      const objB = { name: 'JUAN ' };

      expect(computePayloadHash(objA)).not.toBe(computePayloadHash(objB));
    });
  });

  describe('Happy Path: Propose -> Confirm -> Tracking & Audit', () => {
    it('successfully creates a pending action with 15-min TTL and confirms submission', async () => {
      const pending: PendingAction = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
        executionMode: 'assisted',
      });

      expect(pending.id).toBeDefined();
      expect(pending.status).toBe('pending');
      expect(pending.payloadHash.length).toBe(64);

      // Verify expiry is set 15 minutes into the future
      const expires = new Date(pending.expiresAt).getTime();
      const created = new Date(pending.createdAt).getTime();
      expect(expires - created).toBe(15 * 60 * 1000);

      // Confirm with citizen declaration
      const confirmRes = await confirmPendingAction(pending.id, {
        declarationConfirmed: true,
      });

      expect(confirmRes.success).toBe(true);
      expect(confirmRes.status).toBe('confirmed');
      expect(confirmRes.trackingNumber).toMatch(/^GG-NBI-2026-[A-F0-9]{6}$/);

      // Verify immutable audit log written
      const auditLogs = getMemoryAuditLogs();
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('APPLICATION_SUBMITTED');
      expect(auditLogs[0].actorId).toBe('user-juan-001');
    });
  });

  describe('Safety Invariant 1: Tamper-Proof Cryptographic Hash Gate', () => {
    it('strictly aborts submission if payload is altered after proposal', async () => {
      const pending = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
      });

      // Simulating malicious in-flight modification of payload (e.g. tampering with fee/name)
      pending.payload.firstName = 'HACKED_NAME';

      const confirmRes = await confirmPendingAction(pending.id, {
        declarationConfirmed: true,
      });

      expect(confirmRes.success).toBe(false);
      expect(confirmRes.error).toContain('CRITICAL SECURITY ERROR');
      expect(confirmRes.error).toContain('Payload hash mismatch');

      // No audit log for submission
      const auditLogs = getMemoryAuditLogs();
      expect(auditLogs.length).toBe(0);
    });
  });

  describe('Safety Invariant 2: 15-Minute Expiry Gate', () => {
    it('rejects confirmation if the 15-minute TTL has lapsed', async () => {
      const pending = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
        expiresInMinutes: -5, // Already expired in the past
      });

      const confirmRes = await confirmPendingAction(pending.id, {
        declarationConfirmed: true,
      });

      expect(confirmRes.success).toBe(false);
      expect(confirmRes.status).toBe('expired');
      expect(confirmRes.error).toContain('Action has expired');
    });
  });

  describe('Safety Invariant 3: Idempotency & Double-Submit Prevention', () => {
    it('blocks duplicate submissions of the same action ID', async () => {
      const pending = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
      });

      // First submit: Succeeds
      const firstRes = await confirmPendingAction(pending.id, { declarationConfirmed: true });
      expect(firstRes.success).toBe(true);

      // Second submit: Fails
      const secondRes = await confirmPendingAction(pending.id, { declarationConfirmed: true });
      expect(secondRes.success).toBe(false);
      expect(secondRes.error).toContain('already been confirmed');
    });
  });

  describe('Safety Invariant 4: Assisted vs Agent Mode & Consent Settings', () => {
    it('blocks autonomous agent mode execution if citizen has not given explicit agent consent', async () => {
      const pending = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
        executionMode: 'agent',
      });

      const confirmRes = await confirmPendingAction(pending.id, {
        declarationConfirmed: true,
        agentModeConsent: false, // Consent NOT granted
      });

      expect(confirmRes.success).toBe(false);
      expect(confirmRes.error).toContain('Autonomous agent mode submission is disabled');
    });

    it('permits agent execution when explicit agentModeConsent is granted', async () => {
      const pending = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
        executionMode: 'agent',
      });

      const confirmRes = await confirmPendingAction(pending.id, {
        declarationConfirmed: true,
        agentModeConsent: true, // Consent explicitly granted
      });

      expect(confirmRes.success).toBe(true);
      expect(confirmRes.trackingNumber).toBeDefined();
    });
  });

  describe('Safety Invariant 5: Cancellation Flow', () => {
    it('allows citizen to cancel action and blocks future confirmation', async () => {
      const pending = await proposeSubmitAction({
        citizenId: 'user-juan-001',
        serviceCode: 'NBI_CLEARANCE',
        payload: validNbiPayload,
      });

      const cancelRes = await cancelPendingAction(pending.id, 'Citizen changed mind');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.status).toBe('cancelled');

      // Verify audit log
      const auditLogs = getMemoryAuditLogs();
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('APPLICATION_CANCELLED');

      // Attempt to confirm afterwards must fail
      const confirmRes = await confirmPendingAction(pending.id, { declarationConfirmed: true });
      expect(confirmRes.success).toBe(false);
      expect(confirmRes.error).toContain('already been cancelled');
    });
  });
});
