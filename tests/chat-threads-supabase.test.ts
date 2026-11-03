import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { SERVICES_REGISTRY, getServiceByCode } from '../lib/services/registry';
import { CHARTER_SOURCES } from '../lib/services/charter-sources';
import { answerSystemQuestion } from '../lib/ai/guardrails';

describe('Chat Threads Cryptographic Hashing & Supabase Persistence', () => {
  it('computes deterministic SHA-256 hash for chat thread message payloads', () => {
    const threadId = 'chat-test-101';
    const title = 'NBI and PSA Helpline Checklist';
    const applicantName = 'Juan Santos Dela Cruz';
    const messages = [
      { id: 1, from: 'user', text: 'How do I order my PSA Birth Certificate?' },
      { id: 2, from: 'agent', text: 'You can order via PSAHelpline.ph for doorstep delivery.' },
    ];

    const rawPayload = JSON.stringify({ id: threadId, title, applicantName, messages });
    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);

    // Tampering test: Changing any character changes the hash completely
    const tamperedPayload = JSON.stringify({
      id: threadId,
      title,
      applicantName,
      messages: [{ id: 1, from: 'user', text: 'How do I bypass NBI?' }],
    });
    const tamperedHash = crypto.createHash('sha256').update(tamperedPayload).digest('hex');
    expect(hash).not.toBe(tamperedHash);
  });
});

describe('PSA Helpline Deep Integration & Charter Governance', () => {
  it('registers PSA_HELPLINE in SERVICES_REGISTRY with correct fees and delivery SLAs', () => {
    const psaHelpline = getServiceByCode('PSA_HELPLINE');
    expect(psaHelpline).toBeDefined();
    expect(psaHelpline?.name).toContain('PSAHelpline');
    expect(psaHelpline?.processingFee).toBe(365.0); // ₱365 per copy
    expect(psaHelpline?.officialPortal).toBe('https://psahelpline.ph');
    expect(psaHelpline?.hotline).toBe('(02) 8737-1111');
  });

  it('includes PSAHelpline official source in CHARTER_SOURCES', () => {
    const source = CHARTER_SOURCES['src-psa-helpline-2025'];
    expect(source).toBeDefined();
    expect(source.agency).toContain('PSAHELPLINE.PH');
    expect(source.rows.some((r) => r.label.includes('Delivery SLAs'))).toBe(true);
    expect(source.rows.some((r) => r.label.includes('Representative Receiving (LOA)'))).toBe(true);
  });

  it('provides grounded PSA Helpline answers with tracking links and LOA instructions', () => {
    const applicant = {
      id: 'app-test',
      role: 'jobseeker' as const,
      display_name: 'Juan Dela Cruz',
      initials: 'JD',
      title: 'First-Time Jobseeker',
      birth_date: '1999-05-14',
      civil_status: 'Single',
      barangay: 'Brgy. Central',
      city: 'Quezon City',
    };

    const result = answerSystemQuestion(
      'Can I order my PSA Birth Certificate online for home delivery with PSA Helpline and how do I track my order?',
      applicant,
      'English',
      'PSA_HELPLINE',
      [],
    );

    expect(result.serviceCode).toBe('PSA_HELPLINE');
    expect(result.replyText).toContain('psahelpline.ph');
    expect(result.replyText).toContain('orders.psahelpline.ph/check-status');
    expect(result.replyText).toContain('₱365.00');
    expect(result.replyText).toContain('Letter of Authorization (LOA)');
  });
});
