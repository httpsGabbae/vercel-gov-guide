import { beforeEach, describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/citizen/details/route';
import { PROFILES } from '@/lib/citizen/defaults';

const state = vi.hoisted(() => ({
  userId: '',
  records: new Map<string, Record<string, unknown>>(),
}));
vi.mock('@/lib/auth/details-pin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/details-pin')>()),
  requireDetailsUnlock: vi.fn(async () => ({ userId: state.userId })),
}));
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({ data: state.records.get(id) || null }),
        }),
      }),
      upsert: async (record: Record<string, unknown>) => {
        state.records.set(record.id as string, record);
        return { error: null };
      },
      update: (record: Record<string, unknown>) => ({
        eq: async (_column: string, id: string) => {
          state.records.set(id, { ...state.records.get(id), ...record });
          return { error: null };
        },
      }),
    }),
  }),
}));
beforeEach(() => {
  state.userId = PROFILES.jobseeker.id;
  state.records.clear();
  state.records.set(state.userId, {
    id: state.userId,
    full_name: PROFILES.jobseeker.display_name,
    role: 'citizen',
    consent_settings: {
      applicant: PROFILES.jobseeker,
      saved_files: [],
      checklists: [],
      inspections: [],
    },
  });
});

describe('Citizen Details Supabase Persistence API (/api/citizen/details)', () => {
  it('does not let the extension header read or overwrite another account', async () => {
    const otherId = PROFILES.married_applicant.id;
    const headers = { 'x-extension-id': 'govguide-extension', 'Content-Type': 'application/json' };
    expect(
      (
        await GET(
          new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${otherId}`, {
            headers,
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          new NextRequest('http://localhost:3000/api/citizen/details', {
            method: 'POST',
            headers,
            body: JSON.stringify({ citizenId: otherId, applicant: PROFILES.married_applicant }),
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await DELETE(
          new NextRequest(`http://localhost:3000/api/citizen/details?citizenId=${otherId}`, {
            method: 'DELETE',
            headers,
          }),
        )
      ).status,
    ).toBe(403);
  });
  const testCitizenId = PROFILES.jobseeker.id;

  it('hydrates citizen details directly from Supabase profiles', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`,
    );
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
    const verifyReq = new NextRequest(
      `http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`,
    );
    const verifyRes = await GET(verifyReq);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.applicant.display_name).toBe(updatedName);
  });

  it('resets citizen details back to template defaults', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`,
      {
        method: 'DELETE',
      },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify it returned to default
    const verifyReq = new NextRequest(
      `http://localhost:3000/api/citizen/details?citizenId=${testCitizenId}`,
    );
    const verifyRes = await GET(verifyReq);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.applicant.display_name).toBe(PROFILES.jobseeker.display_name);
  });

  it('initializes New Citizen (zero details) with empty vault, empty inspections, and clean checklists', async () => {
    const newCitizenId = PROFILES.new_citizen.id;
    state.userId = newCitizenId;
    const req = new NextRequest(
      `http://localhost:3000/api/citizen/details?citizenId=${newCitizenId}`,
    );
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
