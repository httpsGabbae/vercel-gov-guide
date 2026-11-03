import { describe, it, expect } from 'vitest';
import { GET, POST } from '@/app/api/citizen/consent/route';
import { NextRequest } from 'next/server';

describe('Terms & Conditions / Data Privacy Consent API (/api/citizen/consent)', () => {
  const testUserId = `test-user-${Date.now()}`;

  it('rejects GET requests without a userId', async () => {
    const req = new NextRequest('http://localhost:3000/api/citizen/consent');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/userId is required/i);
  });

  it('returns accepted: false for a new or unconsented user', async () => {
    const req = new NextRequest(`http://localhost:3000/api/citizen/consent?userId=unconsented-${Date.now()}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(false);
  });

  it('rejects POST requests if userId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/citizen/consent', {
      method: 'POST',
      body: JSON.stringify({ termsAccepted: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/userId is required/i);
  });

  it('rejects POST requests if termsAccepted is false', async () => {
    const req = new NextRequest('http://localhost:3000/api/citizen/consent', {
      method: 'POST',
      body: JSON.stringify({ userId: testUserId, termsAccepted: false }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/must be accepted/i);
  });

  it('successfully records citizen terms and data privacy consent', async () => {
    const req = new NextRequest('http://localhost:3000/api/citizen/consent', {
      method: 'POST',
      body: JSON.stringify({
        userId: testUserId,
        termsAccepted: true,
        version: '2026.11-v1',
        details: {
          data_privacy_act_10173: true,
          ephemeral_biometrics: true,
          ai_assisted_guidance: true,
          confirmation_gated_actions: true,
        },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(true);
    expect(json.version).toBe('2026.11-v1');
    expect(json.consentedAt).toBeDefined();
  });

  it('subsequently returns accepted: true for the consented citizen', async () => {
    const req = new NextRequest(`http://localhost:3000/api/citizen/consent?userId=${testUserId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(true);
    expect(json.version).toBe('2026.11-v1');
    expect(json.consentedAt).toBeDefined();
  });
});

