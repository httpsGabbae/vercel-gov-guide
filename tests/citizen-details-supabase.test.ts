import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/citizen/details/route';
import { PROFILES } from '@/lib/citizen/defaults';

describe('Citizen Details Supabase Persistence API (/api/citizen/details)', () => {
  const testCitizenId = PROFILES.jobseeker.id;

  it('hydrates citizen details directly from Supabase profiles', async () => {
    const req = new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.applicant).toBeDefined();
    expect(body.applicant.display_name).toContain('Juan');
    expect(Array.isArray(body.savedFiles)).toBe(true);
    expect(Array.isArray(body.checklistItems)).toBe(true);
    expect(Array.isArray(body.inspections)).toBe(true);
  });

  it('updates and persists citizen changes directly into Supabase', async () => {
    const updatedName = 'Juan Santos Dela Cruz (Verified Citizen)';
    const req = new NextRequest('http://localhost:3000/api/citizen/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizenId: testCitizenId,
        applicant: {
          ...PROFILES.jobseeker,
          display_name: updatedName,
        },
        savedFiles: [],
        checklistItems: [],
        inspections: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify it was persisted to Supabase
    const verifyReq = new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`);
    const verifyRes = await GET(verifyReq);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.applicant.display_name).toBe(updatedName);
  });

  it('resets citizen details back to template defaults', async () => {
    const req = new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify it returned to default
    const verifyReq = new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`);
    const verifyRes = await GET(verifyReq);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.applicant.display_name).toBe(PROFILES.jobseeker.display_name);
  });

  it('initializes New Citizen (zero details) with empty vault, empty inspections, and clean checklists', async () => {
    const newCitizenId = PROFILES.new_citizen.id;
    const req = new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${newCitizenId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.applicant.role).toBe('new_citizen');
    expect(body.applicant.birth_date).toBe('');
    expect(body.savedFiles).toEqual([]);
    expect(body.inspections).toEqual([]);
    expect(body.checklistItems.length).toBeGreaterThan(0);
    // All items should be pending with no pre-seeded failure notes
    expect(body.checklistItems.every((i: { status: string }) => i.status === 'pending')).toBe(true);
  });
});
