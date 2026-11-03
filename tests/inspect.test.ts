import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/inspect/route';

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
});
