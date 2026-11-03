import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/inspect/route';
import {
  evaluateOnlineReadiness,
  checkPsaProfileReadiness,
} from '@/lib/services/online-services';

describe('PSA & Government Online Service Readiness Engine', () => {
  const sampleCompleteProfile = {
    id: 'user-001',
    role: 'jobseeker' as const,
    display_name: 'Juan Santos Dela Cruz',
    first_name: 'Juan',
    middle_name: 'Santos',
    last_name: 'Dela Cruz',
    initials: 'JD',
    title: 'First-Time Jobseeker',
    birth_date: '1999-05-14',
    place_of_birth: 'Quezon City',
    civil_status: 'Single',
    barangay: 'Barangay Central',
    city: 'Quezon City',
    province: 'Metro Manila',
    father_name: 'Roberto Garcia Dela Cruz',
    mother_maiden_name: 'Maria Lorenzo Santos',
    phone: '09171234567',
  };

  it('evaluates profile readiness and scores 100% for complete citizen details', () => {
    const readiness = checkPsaProfileReadiness(sampleCompleteProfile);
    expect(readiness.isProfileReady).toBe(true);
    expect(readiness.readinessScore).toBe(100);
    expect(readiness.missingFields.length).toBe(0);
  });

  it('evaluates profile readiness and flags missing family fields for incomplete profile', () => {
    const incompleteProfile = {
      ...sampleCompleteProfile,
      father_name: '',
      mother_maiden_name: '',
      phone: '',
    };
    const readiness = checkPsaProfileReadiness(incompleteProfile);
    expect(readiness.isProfileReady).toBe(false);
    expect(readiness.readinessScore).toBeLessThan(65);
    expect(readiness.missingFields).toContain('Pangalan ng Tatay');
    expect(readiness.missingFields).toContain('Dalagang Pangalan ng Nanay');
  });

  it('researches PSA Birth Certificate online ordering: ₱365 fee, 1-3 days delivery, and 1 Valid ID', () => {
    const result = evaluateOnlineReadiness(
      'PSA_BIRTH_CERT',
      'Pwede ba mag-apply online ng PSA Birth Certificate para sa trabaho?',
      sampleCompleteProfile,
    );

    expect(result).not.toBeNull();
    expect(result?.canApplyOnline).toBe(true);
    expect(result?.badgeVariant).toBe('online_ready');
    expect(result?.onlineFeeText).toContain('₱365.00');
    expect(result?.walkInFeeText).toContain('₱155.00');
    expect(result?.primaryPortalUrl).toContain('psahelpline.ph');
    expect(result?.secondaryPortalUrl).toContain('psaserbilis.com.ph');
    expect(result?.deliverySla).toContain('1–3 working days');
    expect(result?.acceptedIds.length).toBeGreaterThan(3);
    expect(result?.requirementsList.some((r) => r.name.includes('Valid Government Photo ID'))).toBe(true);
  });

  it('researches PSA CENOMAR online ordering: ₱420 fee', () => {
    const result = evaluateOnlineReadiness(
      'PSA_CENOMAR',
      'How to apply for PSA CENOMAR online for marriage license?',
      sampleCompleteProfile,
    );

    expect(result).not.toBeNull();
    expect(result?.canApplyOnline).toBe(true);
    expect(result?.serviceTitle).toContain('CENOMAR');
    expect(result?.onlineFeeText).toContain('₱420.00');
    expect(result?.walkInFeeText).toContain('₱210.00');
  });

  it('strictly blocks online application when query involves clerical name spelling errors (RA 9048/10172)', () => {
    const result = evaluateOnlineReadiness(
      'PSA_BIRTH_CERT',
      'Mali ang spelling ng pangalan ko sa PSA birth cert, pwede ko ba ito i-apply at itama online sa PSA Helpline?',
      sampleCompleteProfile,
    );

    expect(result).not.toBeNull();
    expect(result?.canApplyOnline).toBe(false);
    expect(result?.badgeVariant).toBe('walkin_only');
    expect(result?.blockerReason).toContain('RA 9048');
    expect(result?.blockerReason).toContain('Local Civil Registry Office');
    expect(result?.badgeLabel).toContain('Hindi Pwede Online');
  });

  it('strictly blocks online application when birth was never registered (Delayed / Late Registration)', () => {
    const result = evaluateOnlineReadiness(
      'PSA_BIRTH_CERT',
      'Hindi pa nairehistro ang anak ko nung pinanganak, late registration birth certificate online pwede ba?',
      sampleCompleteProfile,
    );

    expect(result).not.toBeNull();
    expect(result?.canApplyOnline).toBe(false);
    expect(result?.blockerReason).toContain('Delayed o Late Registration');
    expect(result?.walkInPortalName).toContain('Local Civil Registry Office');
  });

  it('integrates with /api/inspect and returns an online_application card for PSA inquiries', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Paano mag-order ng PSA Birth Certificate online sa PSAHelpline at magkano ang bayad sa delivery?',
        language: 'Filipino',
        applicant: sampleCompleteProfile,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const onlineCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'online_application',
    );
    expect(onlineCard).toBeDefined();
    expect(onlineCard.onlineApplication.canApplyOnline).toBe(true);
    expect(onlineCard.onlineApplication.onlineFeeText).toContain('₱365.00');
    expect(onlineCard.onlineApplication.primaryPortalUrl).toContain('psahelpline.ph');
  });

  it('integrates with /api/inspect and returns an online_application warning card for misspelled names', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Mali ang spelling ng pangalan ng nanay ko sa PSA birth certificate ko. Pwede ba itong itama online?',
        language: 'Filipino',
        applicant: sampleCompleteProfile,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const onlineCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'online_application',
    );
    expect(onlineCard).toBeDefined();
    expect(onlineCard.onlineApplication.canApplyOnline).toBe(false);
    expect(onlineCard.onlineApplication.badgeVariant).toBe('walkin_only');
    expect(onlineCard.onlineApplication.blockerReason).toContain('RA 9048');
  });
});
