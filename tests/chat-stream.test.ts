import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/chat/route';

describe('M3 Chat Streaming API Route Tests', () => {
  it('rejects invalid request bodies with status 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('streams responses with text/event-stream content type for valid queries', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Ano ang mga kailangan para sa NBI clearance first-time jobseeker?',
          },
        ],
        language: 'fil',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let rawOutput = '';

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;
      rawOutput += decoder.decode(value);
    }

    expect(rawOutput).toContain('tool_call');
    expect(rawOutput).toContain('sources');
    expect(rawOutput).toContain('checklist');
    expect(rawOutput).toContain('done');
  });

  it('emits fallback event with official agency contact info for ungrounded queries', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'astronomy black hole gravitational lensing astrophysics',
          },
        ],
        language: 'fil',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let rawOutput = '';

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;
      rawOutput += decoder.decode(value);
    }

    expect(rawOutput).toContain('"type":"fallback"');
    expect(rawOutput).toContain('clearance@nbi.gov.ph');
    expect(rawOutput).toContain('Paumanhin');
  });
});
