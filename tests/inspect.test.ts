import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/inspect/route';
import { PROFILES } from '@/lib/citizen/defaults';
import type { ApplicantProfile } from '@/lib/services/charter-sources';

describe('AI Requirement Checklist & Document Inspection API (/api/inspect)', () => {
  it('prepares an interactive requirements checklist when asked about a service', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'What are the requirements for NBI Clearance?',
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.cards.some((c: { kind: string }) => c.kind === 'checklist_card')).toBe(true);
  });

  it('flags expired dates, mismatched birth date, and missing signature on Postal ID', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Inspect my Postal ID for NBI Clearance',
        attachments: [{ name: 'expired-postal-id.png', type: 'image/png' }],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    expect(reportCard.report.overall_status).toBe('issues_found');
    expect(reportCard.report.summary_counts.expired).toBeGreaterThan(0);
    expect(reportCard.report.summary_counts.mismatch).toBeGreaterThan(0);
    expect(reportCard.report.summary_counts.missing).toBeGreaterThan(0);
  });

  it('flags >90 day expiration, missing dry seal, and unsigned Oath on Barangay Certificate', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Check my Barangay Certificate for RA 11261',
        attachments: [{ name: 'incomplete-brgy-cert.png', type: 'image/png' }],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    expect(reportCard.report.summary_counts.expired).toBe(1);
    expect(reportCard.report.summary_counts.missing).toBe(2);
  });

  it('verifies 100% Counter-Ready status for a valid PhilSys National ID', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Check my PhilSys National ID',
        attachments: [{ name: 'valid-philsys-id.png', type: 'image/png' }],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    expect(reportCard.report.overall_status).toBe('counter_ready');
    expect(reportCard.report.summary_counts.expired).toBe(0);
    expect(reportCard.report.summary_counts.mismatch).toBe(0);
    expect(reportCard.report.summary_counts.missing).toBe(0);
  });

  it('handles out-of-scope unrelated questions without defaulting to NBI Clearance or returning NBI cards', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'How do I cook chicken adobo recipe?',
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    // Should NOT attach NBI checklist card
    expect(data.cards.some((c: { kind: string }) => c.kind === 'checklist_card')).toBe(false);
    // Should NOT attach NBI expense receipt
    expect(data.cards.some((c: { kind: string }) => c.kind === 'expense_receipt')).toBe(false);
    // Text should politely explain the scope
    expect(data.text.toLowerCase()).toContain('scope');
    // What's next should provide agency quick-picks
    expect(data.next.length).toBeGreaterThanOrEqual(3);
  });

  it('does NOT display NBI when typing numbers only (e.g. "123") and returns out of scope', async () => {
    const numbersOnlySamples = ['123', '9999', '48291'];
    for (const num of numbersOnlySamples) {
      const req = new NextRequest('http://localhost:3000/api/inspect', {
        method: 'POST',
        body: JSON.stringify({
          text: num,
          language: 'English',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.blocked).toBe(true);
      expect(data.guardrailCategory).toBe('OUT_OF_SCOPE');
      expect(data.text).toBe('Out of scope.');
      // Must NOT attach NBI checklist card
      expect(data.cards.some((c: { kind: string }) => c.kind === 'checklist_card')).toBe(false);
      // Must NOT mention NBI Clearance
      expect(data.text.toLowerCase()).not.toContain('nbi');
    }
  });

  it('handles simple greetings without forcing an NBI checklist card', async () => {
    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Kumusta! Ano ang kaya mong gawin?',
        language: 'Filipino',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    // Should NOT force NBI checklist card on simple greeting
    expect(data.cards.some((c: { kind: string }) => c.kind === 'checklist_card')).toBe(false);
    // Text should greet citizen
    expect(data.text).toContain('GovGuide PH');
  });

  it('inspects valid PhilSys National ID for New Citizen (Zero saved details) without false mismatches', async () => {
    const newCitizenApplicant = {
      id: 'e1000000-0000-4000-8000-000000000003',
      role: 'new_citizen' as const,
      display_name: 'Bagong Bisita (New Citizen)',
      initials: 'NC',
      title: 'New Citizen · Zero Saved Details (Upload Only)',
      birth_date: '',
      civil_status: '',
      barangay: '',
      city: '',
    };

    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'I just discovered GovGuidePH, here is my PhilSys ID to try it out.',
        attachments: [{ name: 'valid-philsys-id.png', type: 'image/png' }],
        applicant: newCitizenApplicant,
        savedFiles: [],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    expect(reportCard.report.overall_status).toBe('counter_ready');
    // Must NOT flag any mismatch against non-existent profile
    expect(reportCard.report.summary_counts.mismatch).toBe(0);
    expect(reportCard.report.summary_counts.expired).toBe(0);
    expect(data.text).toContain('Counter-Ready');
  });

  it('inspects expired Postal ID for New Citizen without generating false birth date mismatch', async () => {
    const newCitizenApplicant = {
      id: 'e1000000-0000-4000-8000-000000000003',
      role: 'new_citizen' as const,
      display_name: 'Bagong Bisita (New Citizen)',
      initials: 'NC',
      title: 'New Citizen · Zero Saved Details (Upload Only)',
      birth_date: '',
      civil_status: '',
      barangay: '',
      city: '',
    };

    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Testing uploading an expired postal ID without pre-existing profile',
        attachments: [{ name: 'expired-postal-id.png', type: 'image/png' }],
        applicant: newCitizenApplicant,
        savedFiles: [],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    expect(reportCard.report.overall_status).toBe('issues_found');
    expect(reportCard.report.summary_counts.expired).toBe(1);
    expect(reportCard.report.summary_counts.missing).toBe(1);
    // Crucial: 0 mismatches because new citizen has no stored birth date!
    expect(reportCard.report.summary_counts.mismatch).toBe(0);
  });

  it('inspects valid PSA Birth Certificate for a first-time citizen with blank profile without false name discrepancy', async () => {
    const blankApplicant = {
      id: 'e1000000-0000-4000-8000-000000000003',
      role: 'new_citizen' as const,
      display_name: '',
      first_name: '',
      last_name: '',
      initials: '',
      title: 'Citizen Applicant',
      birth_date: '',
      civil_status: '',
      barangay: '',
      city: '',
    };

    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Uploading my PSA Birth Certificate for the first time',
        attachments: [{ name: 'cabatic-psa.jpg', type: 'image/jpeg' }],
        applicant: blankApplicant,
        savedFiles: [],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    // Must be 100% Counter-Ready because PSA is valid and permanent lifetime validity under RA 11909
    expect(reportCard.report.overall_status).toBe('counter_ready');
    expect(reportCard.report.summary_counts.mismatch).toBe(0);
    expect(reportCard.report.summary_counts.expired).toBe(0);
    // Must NOT contain "Applicant Full Name Not Provided" or Juan Santos Dela Cruz mismatch
    const hasNameComplaint = reportCard.report.issues.some((i: { title: string; detail: string }) =>
      (i.title + ' ' + i.detail).toLowerCase().includes('applicant full name not provided') ||
      (i.title + ' ' + i.detail).toLowerCase().includes('profile does not specify') ||
      (i.title + ' ' + i.detail).toLowerCase().includes('juan santos dela cruz')
    );
    expect(hasNameComplaint).toBe(false);
    expect(reportCard.report.applicant_name).toContain('Cabatic');
  });

  it('inspects valid PhilSys National ID for a citizen establishing identity without false demo mismatch', async () => {
    const blankApplicant = {
      id: 'e1000000-0000-4000-8000-000000000003',
      role: 'new_citizen' as const,
      display_name: '',
      first_name: '',
      last_name: '',
      initials: '',
      title: 'Citizen Applicant',
      birth_date: '',
      civil_status: '',
      barangay: '',
      city: '',
    };

    const req = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Inspecting uploaded document cabatic-national-id.png',
        attachments: [{ name: 'cabatic-national-id.png', type: 'image/png' }],
        applicant: blankApplicant,
        savedFiles: [],
        language: 'English',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const reportCard = data.cards.find(
      (c: { kind: string }) => c.kind === 'inspection_report',
    );
    expect(reportCard).toBeDefined();
    expect(reportCard.report.overall_status).toBe('counter_ready');
    expect(reportCard.report.summary_counts.mismatch).toBe(0);
    expect(reportCard.report.summary_counts.expired).toBe(0);
    expect(reportCard.report.applicant_name).toContain('Cabatic');
  });

  it('correctly extracts parents, location, and birthdate from PSA birth certificate and National ID without mock government IDs', async () => {
    const blankApplicant: ApplicantProfile = {
      ...PROFILES.new_citizen,
      display_name: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      birth_date: '',
      role: 'new_citizen',
    };

    // 1. Inspect PSA Birth Certificate
    const psaReq = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Inspecting uploaded document cabatic-psa.jpg',
        attachments: [{ name: 'cabatic-psa.jpg', type: 'image/jpeg' }],
        applicant: blankApplicant,
        savedFiles: [],
        language: 'English',
      }),
    });

    const psaRes = await POST(psaReq);
    expect(psaRes.status).toBe(200);
    const psaData = await psaRes.json();
    expect(psaData.ok).toBe(true);
    expect(psaData.learnedDetails).toBeDefined();
    expect(psaData.learnedDetails.display_name).toBe('Lorraine Lasi Cabatic');
    expect(psaData.learnedDetails.birth_date).toBe('2007-07-23');
    expect(psaData.learnedDetails.father_name).toBe('Joselito Bernas Cabatic');
    expect(psaData.learnedDetails.father_first_name).toBe('Joselito');
    expect(psaData.learnedDetails.father_last_name).toBe('Cabatic');
    expect(psaData.learnedDetails.mother_maiden_name).toBe('Rowena Tagle Lasi');
    expect(psaData.learnedDetails.mother_first_name).toBe('Rowena');
    expect(psaData.learnedDetails.mother_last_name).toBe('Lasi');
    expect(psaData.learnedDetails.city).toBe('Lipa City');
    expect(psaData.learnedDetails.province).toBe('Batangas');

    // Verify zero mock government IDs leaked
    expect(psaData.learnedDetails.philhealth_number).toBeUndefined();
    expect(psaData.learnedDetails.tin).toBeUndefined();
    expect(psaData.learnedDetails.sss_number).toBeUndefined();

    // 2. Inspect PhilSys National ID
    const idReq = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Inspecting uploaded document cabatic-national-id.png',
        attachments: [{ name: 'cabatic-national-id.png', type: 'image/png' }],
        applicant: blankApplicant,
        savedFiles: [],
        language: 'English',
      }),
    });

    const idRes = await POST(idReq);
    expect(idRes.status).toBe(200);
    const idData = await idRes.json();
    expect(idData.ok).toBe(true);
    expect(idData.learnedDetails).toBeDefined();
    expect(idData.learnedDetails.barangay).toContain('Santo Toribio');
    expect(idData.learnedDetails.city).toBe('Lipa City');
    expect(idData.learnedDetails.province).toBe('Batangas');
    expect(idData.learnedDetails.philsys_id).toBe('2631-2509-8106-8349');
  });
});
