import { describe, it, expect } from 'vitest';
import { parseResponseJson, safeResponseJson } from '@/lib/utils';

describe('Resilient JSON parsing helpers', () => {
  it('handles plain text "Internal Server Error" without throwing SyntaxError', async () => {
    const mockResponse = new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });

    await expect(parseResponseJson(mockResponse)).rejects.toThrow('Internal Server Error');
  });

  it('safeResponseJson safely returns ok: false for "Internal Server Error"', async () => {
    const mockResponse = new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });

    const result = await safeResponseJson(mockResponse);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBe('Internal Server Error');
    expect(result.data).toBeNull();
  });

  it('handles HTML error pages cleanly', async () => {
    const html = '<html><body><h1>502 Bad Gateway</h1></body></html>';
    const mockResponse = new Response(html, {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    const result = await safeResponseJson(mockResponse);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.data).toBeNull();
  });

  it('correctly parses valid JSON success responses', async () => {
    const payload = { ok: true, data: [1, 2, 3] };
    const mockResponse = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const parsed = await parseResponseJson(mockResponse);
    expect(parsed).toEqual(payload);

    const safe = await safeResponseJson(
      new Response(JSON.stringify(payload), { status: 200 })
    );
    expect(safe.ok).toBe(true);
    expect(safe.data).toEqual(payload);
  });

  it('correctly extracts structured error messages from JSON error responses', async () => {
    const errPayload = { ok: false, message: 'Invalid requirement checklist' };
    const mockResponse = new Response(JSON.stringify(errPayload), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseResponseJson(mockResponse)).rejects.toThrow('Invalid requirement checklist');
  });
});
