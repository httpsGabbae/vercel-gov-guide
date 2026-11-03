import { describe, it, expect } from 'vitest';
import { generateOfficialNoticeLetter } from '../extension/src/lib/letter-generator';

describe('Agency AI Chatbot & Letter Generator Engine', () => {
  it('generates a formal DFA notice letter from missing & expired ID keywords', () => {
    const result = generateOfficialNoticeLetter({
      keywords: 'expired postal ID, need 2 valid IDs, counter 3 on Nov 5 10:00 AM',
      citizenName: 'Juan Santos Dela Cruz',
      serviceTitle: 'ePassport Regular Renewal (10-Year Validity)',
      referenceNumber: 'DFA-ASEANA-2026-98124',
      agencyCode: 'DFA',
      agencyName: 'Department of Foreign Affairs',
      officerName: 'Consular Officer Maria Teresa Gomez',
      officerRole: 'Supervising Consular Officer',
      location: 'DFA ASEANA, Parañaque City',
    });

    expect(result.suggestedStatus).toBe('missing_details');
    expect(result.appointmentSchedule).toContain('Nov 5');
    expect(result.appointmentSchedule).toContain('10:00 AM');
    expect(result.letterText).toContain('DEPARTMENT OF FOREIGN AFFAIRS');
    expect(result.letterText).toContain('Juan Santos Dela Cruz');
    expect(result.letterText).toContain('DFA-ASEANA-2026-98124');
    expect(result.letterText).toContain('RA 11032');
    expect(result.letterText).toContain('Consular Officer Maria Teresa Gomez');
  });

  it('generates a formal PSA delivery completion letter from approved/courier keywords', () => {
    const result = generateOfficialNoticeLetter({
      keywords: 'printed on SECPA, handed to 2GO courier, tracking 2GO-PH-889104820',
      citizenName: 'Juan Santos Dela Cruz',
      serviceTitle: 'PSA Birth Certificate (SECPA Copy Nationwide Delivery)',
      referenceNumber: 'PSA-CRS-2026-302194',
      agencyCode: 'PSA',
      agencyName: 'Philippine Statistics Authority',
      officerName: 'Supervisor Corazon C. Bautista',
    });

    expect(result.suggestedStatus).toBe('complete');
    expect(result.letterText).toContain('PHILIPPINE STATISTICS AUTHORITY');
    expect(result.letterText).toContain('SECPA');
    expect(result.letterText).toContain('doorstep.delivery@psahelpline.ph');
  });

  it('handles NBI First-Time Jobseeker dry seal keywords correctly', () => {
    const result = generateOfficialNoticeLetter({
      keywords: 'barangay cert missing dry seal, first-time jobseeker oath required',
      citizenName: 'Juan Santos Dela Cruz',
      serviceTitle: 'NBI Clearance',
      referenceNumber: 'REQ-NBI-2026-1102',
      agencyCode: 'NBI',
      agencyName: 'National Bureau of Investigation',
    });

    expect(result.suggestedStatus).toBe('missing_details');
    expect(result.letterText).toContain('RA 11261');
    expect(result.letterText).toContain('NATIONAL BUREAU OF INVESTIGATION');
  });
});
