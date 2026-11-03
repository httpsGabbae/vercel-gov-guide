import { describe, it, expect } from 'vitest';
import { proposeDraft, extractDraftDeterministic } from '../lib/ai/propose-draft';
import {
  nbiClearanceSchema,
  psaBirthCertSchema,
  philHealthRegistrationSchema,
  getServiceFormConfig,
  isValidPhilippineDate,
  isValidPhilippineMobile,
  mapApplicantProfileToForm,
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

  describe('M4-A: Strict Validation & Conditional Field Enforcement', () => {
    it('validates Philippine date invariants (rejects future and impossible calendar dates)', () => {
      expect(isValidPhilippineDate('1995-08-14')).toBe(true);
      expect(isValidPhilippineDate('2000-02-29')).toBe(true); // Leap year

      // Future date
      expect(isValidPhilippineDate('2099-01-01')).toBe(false);
      // Impossible date
      expect(isValidPhilippineDate('1995-02-30')).toBe(false);
      // Malformed format
      expect(isValidPhilippineDate('08/14/1995')).toBe(false);
      expect(isValidPhilippineDate('not-a-date')).toBe(false);
    });

    it('validates Philippine mobile phone invariants', () => {
      expect(isValidPhilippineMobile('09171234567')).toBe(true);
      expect(isValidPhilippineMobile('+639171234567')).toBe(true);
      expect(isValidPhilippineMobile('0917-123-4567')).toBe(true);

      // Invalid mobile numbers
      expect(isValidPhilippineMobile('08171234567')).toBe(false); // Does not start with 09
      expect(isValidPhilippineMobile('12345')).toBe(false); // Too short
      expect(isValidPhilippineMobile('09171234567890')).toBe(false); // Too long
    });

    it('enforces conditional deliveryAddress on PSA Birth Cert when doorstep delivery is selected', () => {
      const baseValidPsa = {
        requesterType: 'OWNER',
        numberOfCopies: 1,
        documentOwnerFirstName: 'MARIA',
        documentOwnerMiddleName: 'DELA CRUZ',
        documentOwnerLastName: 'SANTOS',
        dateOfBirth: '1998-05-20',
        placeOfBirthCity: 'MANILA',
        placeOfBirthProvince: 'METRO MANILA',
        fatherFirstName: 'JOSE',
        fatherLastName: 'SANTOS',
        motherMaidenFirstName: 'CORAZON',
        motherMaidenLastName: 'DELA CRUZ',
      };

      // CRS Outlet does not require delivery address
      const crsResult = psaBirthCertSchema.safeParse({
        ...baseValidPsa,
        deliveryMode: 'CRS_OUTLET',
        deliveryAddress: '',
      });
      expect(crsResult.success).toBe(true);

      // Doorstep delivery without delivery address must fail
      const doorstepMissingAddress = psaBirthCertSchema.safeParse({
        ...baseValidPsa,
        deliveryMode: 'DOORSTEP_DELIVERY',
        deliveryAddress: '',
      });
      expect(doorstepMissingAddress.success).toBe(false);
      if (!doorstepMissingAddress.success) {
        expect(
          doorstepMissingAddress.error.issues.some((i) => i.path.includes('deliveryAddress')),
        ).toBe(true);
      }

      // Doorstep delivery with address succeeds
      const doorstepWithAddress = psaBirthCertSchema.safeParse({
        ...baseValidPsa,
        deliveryMode: 'DOORSTEP_DELIVERY',
        deliveryAddress: 'Block 5 Lot 12 Sampaguita St., Quezon City',
      });
      expect(doorstepWithAddress.success).toBe(true);
    });

    it('enforces conditional dependentNames on PhilHealth registration when hasDependents is true', () => {
      const baseValidPhilHealth = {
        membershipCategory: 'DIRECT_EMPLOYED',
        firstName: 'JUAN',
        lastName: 'DELA CRUZ',
        dateOfBirth: '1990-01-15',
        civilStatus: 'MARRIED',
        contactNumber: '09181234567',
        permanentAddress: 'Manila, Philippines',
        declaredMonthlyIncome: 25000,
      };

      // No dependents -> passes without names
      const noDepsResult = philHealthRegistrationSchema.safeParse({
        ...baseValidPhilHealth,
        hasDependents: false,
        dependentNames: '',
      });
      expect(noDepsResult.success).toBe(true);

      // Has dependents -> fails without dependent names
      const missingDepsResult = philHealthRegistrationSchema.safeParse({
        ...baseValidPhilHealth,
        hasDependents: true,
        dependentNames: '',
      });
      expect(missingDepsResult.success).toBe(false);
      if (!missingDepsResult.success) {
        expect(
          missingDepsResult.error.issues.some((i) => i.path.includes('dependentNames')),
        ).toBe(true);
      }

      // Has dependents with names -> succeeds
      const withDepsResult = philHealthRegistrationSchema.safeParse({
        ...baseValidPhilHealth,
        hasDependents: true,
        dependentNames: 'Maria Dela Cruz (Spouse), Juan Jr. (Son)',
      });
      expect(withDepsResult.success).toBe(true);
    });
  });

  describe('M4-B: Profile Mapping & AI Suggestion Non-Overwrite Rule', () => {
    it('correctly maps citizen profile fields to all 3 service forms without inventing data', () => {
      const mockProfile = {
        display_name: 'Lorraine Lasi Cabatic',
        first_name: 'Lorraine',
        middle_name: 'Lasi',
        last_name: 'Cabatic',
        birth_date: '1996-09-20',
        civil_status: 'SINGLE',
        contact_number: '09175550192',
        email: 'lorraine@example.com',
        current_address: 'Lipa City, Batangas',
        city: 'Lipa City',
        province: 'Batangas',
        father_first_name: 'Joselito',
        father_last_name: 'Cabatic',
        mother_first_name: 'Rowena',
        mother_last_name: 'Lasi',
        role: 'citizen' as const,
      };

      // NBI clearance mapping
      const nbiData = mapApplicantProfileToForm('NBI_CLEARANCE', mockProfile);
      expect(nbiData.firstName).toBe('LORRAINE');
      expect(nbiData.lastName).toBe('CABATIC');
      expect(nbiData.dateOfBirth).toBe('1996-09-20');
      expect(nbiData.mobileNumber).toBe('09175550192');
      expect(nbiData.civilStatus).toBe('SINGLE');

      // PSA birth certificate mapping
      const psaData = mapApplicantProfileToForm('PSA_BIRTH_CERT', mockProfile);
      expect(psaData.documentOwnerFirstName).toBe('LORRAINE');
      expect(psaData.documentOwnerLastName).toBe('CABATIC');
      expect(psaData.motherMaidenFirstName).toBe('ROWENA');
      expect(psaData.motherMaidenLastName).toBe('LASI');
      expect(psaData.fatherFirstName).toBe('JOSELITO');

      // PhilHealth registration mapping
      const philHealthData = mapApplicantProfileToForm('PHILHEALTH_REGISTRATION', mockProfile);
      expect(philHealthData.firstName).toBe('LORRAINE');
      expect(philHealthData.lastName).toBe('CABATIC');
      expect(philHealthData.contactNumber).toBe('09175550192');
      expect(philHealthData.permanentAddress).toContain('Batangas');
    });

    it('demonstrates that AI suggestions do not silently overwrite citizen confirmed details', () => {
      const confirmedCitizenState = {
        firstName: 'LORRAINE',
        lastName: 'CABATIC',
        mobileNumber: '09175550192', // Confirmed user number
      };
      const confirmedFields = new Set(['firstName', 'lastName', 'mobileNumber']);

      // Simulated AI suggestion proposing different/hallucinated phone number
      const aiSuggestedData = {
        firstName: 'LORRAINE',
        lastName: 'CABATIC',
        mobileNumber: '09189999999', // Conflicting suggestion
        purpose: 'LOCAL_EMPLOYMENT',
      };

      // Merge logic from ServiceFormPage:
      const merged: Record<string, unknown> = { ...confirmedCitizenState };
      for (const [key, val] of Object.entries(aiSuggestedData)) {
        if (confirmedFields.has(key) && merged[key] !== undefined && merged[key] !== '') {
          continue; // Citizen edits win!
        }
        merged[key] = val;
      }

      // Citizen confirmed number is preserved
      expect(merged.mobileNumber).toBe('09175550192');
      // Unconfirmed field is populated
      expect(merged.purpose).toBe('LOCAL_EMPLOYMENT');
    });
  });

  describe('M4-D: Deterministic Fallback & Provider Reliability', () => {
    it('reliably extracts draft data via extractDraftDeterministic during offline or API timeout', () => {
      const text =
        'Ako si Juan Santos, pinanganak noong 1995-08-14 sa Sampaloc Manila. Mobile: 09171234567, email: juan@example.com.';
      const offlineDraft = extractDraftDeterministic('NBI_CLEARANCE', text);

      expect(offlineDraft.firstName).toBe('JUAN');
      expect(offlineDraft.lastName).toBe('SANTOS');
      expect(offlineDraft.dateOfBirth).toBe('1995-08-14');
      expect(offlineDraft.mobileNumber).toBe('09171234567');
      expect(offlineDraft.email).toBe('juan@example.com');
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
