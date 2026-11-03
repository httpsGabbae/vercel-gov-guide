import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCitizenRequests,
  getAgencyRequests,
  findRequestById,
  updateRequestStatusBar,
  resetRequestsToDemo,
  clearAllRequests,
  createOrGetRequestForInquiry,
} from '@/lib/citizen/requests';

describe('Citizen Service Requests & Agency Chrome Extension Store', () => {
  beforeEach(() => {
    resetRequestsToDemo();
  });

  it('loads seeded requests for DFA, DPWH, and PSA when demo is explicitly reset', () => {
    const list = getCitizenRequests();
    expect(list.length).toBeGreaterThanOrEqual(3);

    const dfa = list.find((r) => r.agencyCode === 'DFA');
    expect(dfa).toBeDefined();
    expect(dfa?.steps.length).toBe(5);
    expect(dfa?.currentStep).toBe(3);
    expect(dfa?.steps[2].isCurrent).toBe(true);

    const dpwh = list.find((r) => r.agencyCode === 'DPWH');
    expect(dpwh).toBeDefined();
    expect(dpwh?.serviceCode).toBe('DPWH_PROJECTS');
  });

  it('starts with zero predefined processes for a new citizen account', () => {
    clearAllRequests();
    const newCitizenRequests = getCitizenRequests('new-citizen-123');
    expect(newCitizenRequests).toHaveLength(0);
  });

  it('dynamically creates a PSA process when citizen asks in chat about getting a PSA', () => {
    clearAllRequests();
    const citizenId = 'citizen-ana-001';

    // Verify empty before asking
    expect(getCitizenRequests(citizenId)).toHaveLength(0);

    // Citizen asks in chat
    const created = createOrGetRequestForInquiry({
      citizenId,
      citizenName: 'Ana Dela Cruz',
      queryText: 'Paano mag-request ng PSA Birth Certificate online sa PSA Serbilis?',
      serviceCode: 'PSA_BIRTH_CERT',
    });

    expect(created).not.toBeNull();
    expect(created?.agencyCode).toBe('PSA');
    expect(created?.serviceCode).toBe('PSA_BIRTH_CERT');
    expect(created?.status).toBe('under_review');
    expect(created?.currentStep).toBe(2);
    expect(created?.steps).toHaveLength(5);

    // Verify now shows in citizen's account
    const citizenList = getCitizenRequests(citizenId);
    expect(citizenList).toHaveLength(1);
    expect(citizenList[0].serviceTitle).toContain('PSA Birth Certificate');
  });

  it('deduplicates processes so repeated PSA inquiries reuse the active process', () => {
    clearAllRequests();
    const citizenId = 'citizen-ana-001';

    const first = createOrGetRequestForInquiry({
      citizenId,
      citizenName: 'Ana Dela Cruz',
      queryText: 'How to get PSA birth certificate?',
      serviceCode: 'PSA_BIRTH_CERT',
    });

    const second = createOrGetRequestForInquiry({
      citizenId,
      citizenName: 'Ana Dela Cruz',
      queryText: 'Magkano bayarin sa PSA birth cert delivery?',
      serviceCode: 'PSA_BIRTH_CERT',
    });

    expect(second?.id).toBe(first?.id);
    expect(getCitizenRequests(citizenId)).toHaveLength(1);
  });

  it('filters requests by agency for the Chrome Extension', () => {
    const dfaList = getAgencyRequests('DFA');
    expect(dfaList.every((r) => r.agencyCode === 'DFA')).toBe(true);
    expect(dfaList.length).toBeGreaterThanOrEqual(1);

    const allList = getAgencyRequests('ALL');
    expect(allList.length).toBeGreaterThanOrEqual(3);
  });

  it('allows the Agency / Chrome Extension to edit the status bar and step progress', () => {
    const targetId = 'REQ-DFA-2026-8921';
    const updated = updateRequestStatusBar({
      requestId: targetId,
      currentStep: 4,
      status: 'processing_production',
      statusLabel: 'Passport Booklet Printing at APO Plant',
      statusBadgeColor: 'purple',
      officerNotes: 'Biometrics capture completed successfully. Sent to booklet queue.',
      officerName: 'Consular Supervisor J. Santos',
    });

    expect(updated).not.toBeNull();
    expect(updated?.currentStep).toBe(4);
    expect(updated?.status).toBe('processing_production');
    expect(updated?.statusLabel).toContain('Passport Booklet');
    expect(updated?.steps[0].completed).toBe(true);
    expect(updated?.steps[1].completed).toBe(true);
    expect(updated?.steps[2].completed).toBe(true);
    expect(updated?.steps[3].isCurrent).toBe(true);
    expect(updated?.officerNotes).toContain('Biometrics capture completed');
  });

  it('handles completing all 5 steps to ready_released', () => {
    const targetId = 'REQ-DFA-2026-8921';
    const finished = updateRequestStatusBar({
      requestId: targetId,
      currentStep: 5,
      status: 'ready_released',
      statusLabel: 'Passport Ready for Releasing / Delivery',
      statusBadgeColor: 'emerald',
      officerNotes: 'Ready for claiming at Counter Window 7.',
    });

    expect(finished).not.toBeNull();
    expect(finished?.currentStep).toBe(5);
    expect(finished?.steps[4].completed).toBe(true);
  });
});
