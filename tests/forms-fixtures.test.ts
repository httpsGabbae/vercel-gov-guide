import { describe, it, expect } from 'vitest';
import { proposeDraft } from '../lib/ai/propose-draft';
import {
  nbiClearanceSchema,
  psaBirthCertSchema,
  philHealthRegistrationSchema,
  getServiceFormConfig,
} from '../lib/services/forms';

describe('M4 Services & AI Form Filling Fixtures Tests', () => {
  describe('Fixture 1: Complete NBI Clearance Application', () => {
    const completeNbiText = `
      Ako si Juan Dela Cruz Santos.
      Pangalan: Juan Santos.
      Date of birth: 1995-08-14.
      Lalaki, Single. First-time jobseeker po ako para sa local employment.
      Mobile: 09171234567
      Email: juan@example.com
      Address: Sampaloc, Manila
    `;

    it('extracts complete draft with 100% confidence and no missing fields', async () => {
      const result = await proposeDraft('NBI_CLEARANCE', completeNbiText);

      expect(result.serviceCode).toBe('NBI_CLEARANCE');
      expect(result.draftData.firstName).toBe('JUAN');
      expect(result.draftData.lastName).toBe('SANTOS');
      expect(result.draftData.dateOfBirth).toBe('1995-08-14');
      expect(result.draftData.isFirstTimeJobseeker).toBe(true);
      expect(result.draftData.mobileNumber).toBe('09171234567');
      expect(result.draftData.email).toBe('juan@example.com');
      expect(result.isComplete).toBe(true);
      expect(result.missingFields.length).toBe(0);
      expect(result.confidenceScore).toBe(100);

      // Verify draft passes strict Zod schema
      const parseResult = nbiClearanceSchema.safeParse(result.draftData);
      expect(parseResult.success).toBe(true);

      // Verify proactive warning for first-time jobseekers
      expect(result.proactiveWarnings.length).toBeGreaterThan(0);
      expect(result.proactiveWarnings[0]).toContain('Barangay Certification');
    });
  });

  describe('Fixture 2: Incomplete PSA Birth Certificate Request', () => {
    const incompletePsaText = `
      Nais ko pong humiling ng kopya ng aking PSA birth certificate para sa sarili ko (Maria Santos).
      Pinanganak ako noong 1998-05-20 sa Maynila.
      Mobile ko: 09187654321
    `;

    it('identifies missing parent and maiden name fields with natural clarification questions', async () => {
      const result = await proposeDraft('PSA_BIRTH_CERT', incompletePsaText);

      expect(result.serviceCode).toBe('PSA_BIRTH_CERT');
      expect(result.draftData.documentOwnerFirstName).toBe('MARIA');
      expect(result.draftData.documentOwnerLastName).toBe('SANTOS');
      expect(result.draftData.dateOfBirth).toBe('1998-05-20');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);

      const motherMaidenField = result.missingFields.find((f) =>
        f.fieldName.includes('motherMaiden'),
      );
      expect(motherMaidenField).toBeDefined();
      expect(motherMaidenField?.questionFil).toContain('dalagang apelyido');
      expect(motherMaidenField?.reason).toContain('PSA');
    });
  });

  describe('Fixture 3: PhilHealth Freelancer / Self-Employed Registration', () => {
    const freelancerText = `
      Magpaparehistro po ako sa PhilHealth bilang freelance web developer / self-employed.
      Pangalan: Carlos Santos.
      Birthday: 1992-11-03, Single.
      Mobile: 09191234567
      Address: Quezon City, Metro Manila
    `;

    it('classifies membership category as DIRECT_SELF_EMPLOYED and checks schema', async () => {
      const result = await proposeDraft('PHILHEALTH_REGISTRATION', freelancerText);

      expect(result.serviceCode).toBe('PHILHEALTH_REGISTRATION');
      expect(result.draftData.membershipCategory).toBe('DIRECT_SELF_EMPLOYED');
      expect(result.draftData.declaredMonthlyIncome).toBeGreaterThan(0);
      expect(result.draftData.firstName).toBe('CARLOS');
      expect(result.draftData.lastName).toBe('SANTOS');

      // Proactive duplicate PIN prevention warning
      expect(result.proactiveWarnings.some((w) => w.includes('PIN'))).toBe(true);

      const parseResult = philHealthRegistrationSchema.safeParse(result.draftData);
      expect(parseResult.success).toBe(true);
    });
  });

  describe('Form Registry & Configuration Invariants', () => {
    it('provides valid form configurations for all 3 MVP services', () => {
      const services = ['NBI_CLEARANCE', 'PSA_BIRTH_CERT', 'PHILHEALTH_REGISTRATION'];

      for (const code of services) {
        const config = getServiceFormConfig(code);
        expect(config).toBeDefined();
        expect(config?.sections.length).toBeGreaterThan(1);
        expect(config?.fields.length).toBeGreaterThan(5);

        // Every required field must have labels in both Taglish and English
        config?.fields.forEach((field) => {
          expect(field.labelFil.length).toBeGreaterThan(0);
          expect(field.labelEn.length).toBeGreaterThan(0);
          expect(field.section.length).toBeGreaterThan(0);
        });
      }
    });
  });
});
