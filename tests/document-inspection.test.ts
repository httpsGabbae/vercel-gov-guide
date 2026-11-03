import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@/lib/ai/models', () => ({
  GEMINI_FLASH_MODEL: 'test-model',
  getGeminiClient: () => ({ models: { generateContent } }),
}));
vi.mock('@/lib/ai/tools', () => ({ searchCharterTool: vi.fn().mockResolvedValue([]) }));
import { POST } from '@/app/api/inspect/route';
const profile = {
  id: 'test',
  role: 'new_citizen',
  display_name: 'Maria Cristina Santos',
  birth_date: '',
  title: 'Citizen Account',
  initials: 'MS',
  civil_status: '',
  barangay: '',
  city: '',
};
const attachment = {
  name: 'my-psa.png',
  type: 'image/png',
  dataUrl: 'data:image/png;base64,dGVzdA==',
};
async function inspect(applicant = profile, extra = {}) {
  const response = await POST(
    new NextRequest('http://localhost/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Please inspect my PSA birth certificate',
        applicant,
        attachments: [attachment],
        serviceCode: 'PSA_BIRTH_CERT',
        ...extra,
      }),
    }),
  );
  return { response, data: await response.json() };
}
function result(name: string, fields: object[] = []) {
  return {
    text: JSON.stringify({
      document_title: 'PSA Birth Certificate',
      issues: [],
      fields: [
        { key: 'child_name', label: "Child's full name", value: name, status: 'valid' },
        ...fields,
      ],
    }),
  };
}
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test');
  generateContent.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
describe('real document discrepancy checks', () => {
  it('flags a different name despite missing DOB, new_citizen role and an AI all-clear', async () => {
    generateContent.mockResolvedValue(result('Ana Reyes'));
    const { response, data } = await inspect();
    expect(response.status).toBe(200);
    expect(data.inspection.overall_status).toBe('issues_found');
    expect(data.inspection.summary_counts.mismatch).toBeGreaterThan(0);
    expect(data.inspection.fields.find((f: any) => f.key === 'child_name')).toMatchObject({
      status: 'mismatch',
      expected: profile.display_name,
    });
    expect(data.learnedDetails).toBeUndefined();
  });
  it('preserves differences such as Ma. versus Maria for user review', async () => {
    generateContent.mockResolvedValue(result('Ma. Cristina Santos'));
    expect((await inspect()).data.inspection.overall_status).toBe('issues_found');
  });
  it('ignores case and spacing differences', async () => {
    generateContent.mockResolvedValue(result(' MARIA  CRISTINA SANTOS '));
    expect((await inspect()).data.inspection.summary_counts.mismatch).toBe(0);
  });
  it('compares DOB independently of a blank name', async () => {
    generateContent.mockResolvedValue(
      result('Maria Santos', [
        { key: 'birth_date', label: 'Date of birth', value: '2000-01-02', status: 'valid' },
      ]),
    );
    const { data } = await inspect({ ...profile, display_name: '', birth_date: '2000-01-01' });
    expect(data.inspection.fields.find((f: any) => f.key === 'birth_date').status).toBe('mismatch');
  });
  it('compares against the saved profile before extracted_details can replace it', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        document_title: 'PSA Birth Certificate',
        issues: [],
        fields: [],
        extracted_details: { display_name: 'Ana Reyes', birth_date: '2001-01-01' },
      }),
    });
    const { data } = await inspect();
    expect(data.inspection.overall_status).toBe('issues_found');
    expect(data.learnedDetails).toBeUndefined();
    expect(data.inspection.fields.find((f: any) => f.key === 'full_name').expected).toBe(
      profile.display_name,
    );
  });
  it('does not treat a parent name or birthplace as the document owner or DOB', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        document_title: 'PSA Birth Certificate',
        issues: [],
        fields: [
          {
            key: 'father_name',
            label: "Father's Full Name",
            value: 'Pedro Santos',
            status: 'valid',
          },
          { key: 'place_of_birth', label: 'Place of Birth', value: 'Manila', status: 'valid' },
          {
            key: 'child_name',
            label: "Child's Full Name",
            value: profile.display_name,
            status: 'valid',
          },
        ],
      }),
    });
    const { data } = await inspect();
    expect(data.inspection.summary_counts.mismatch).toBe(0);
    expect(data.inspection.fields.some((f: any) => f.key === 'birth_date')).toBe(false);
  });
  it('does not invent a mismatch against an empty profile', async () => {
    generateContent.mockResolvedValue(result('Maria Santos'));
    expect(
      (await inspect({ ...profile, display_name: '' })).data.inspection.summary_counts.mismatch,
    ).toBe(0);
  });
  it.each(['no-key', 'failure', 'empty-output'])(
    'never falls back to counter-ready on %s',
    async (mode) => {
      if (mode === 'no-key') vi.stubEnv('GEMINI_API_KEY', '');
      if (mode === 'failure') generateContent.mockRejectedValue(new Error('simulated failure'));
      if (mode === 'empty-output') generateContent.mockResolvedValue({ text: '{}' });
      const { response, data } = await inspect();
      expect(response.status).toBe(mode === 'empty-output' ? 422 : 503);
      expect(data.inspection).toBeNull();
      expect(data.ok).toBe(false);
    },
  );
  it('does not infer identity from a fixture-looking filename', async () => {
    generateContent.mockResolvedValue({ text: '{}' });
    const { response } = await inspect(profile, {
      attachments: [{ ...attachment, name: 'cabatic-psa.png' }],
    });
    expect(response.status).toBe(422);
  });
  it('passes PDF bytes to the vision model', async () => {
    generateContent.mockResolvedValue(result('Ana Reyes'));
    const { data } = await inspect(profile, {
      attachments: [
        {
          name: 'birth.pdf',
          type: 'application/pdf',
          dataUrl: 'data:application/pdf;base64,dGVzdA==',
        },
      ],
    });
    expect(generateContent.mock.calls[0][0].contents[0].parts[1].inlineData).toEqual({
      mimeType: 'application/pdf',
      data: 'dGVzdA==',
    });
    expect(data.inspection.overall_status).toBe('issues_found');
  });
  it('reports credential rejection without exposing provider details', async () => {
    generateContent.mockRejectedValue(
      Object.assign(new Error('sensitive provider diagnostics'), { status: 401 }),
    );
    const { response, data } = await inspect();
    expect(response.status).toBe(503);
    expect(data.message).toContain('credential');
    expect(data.message).not.toContain('sensitive');
  });
  it('does not silently ignore additional documents', async () => {
    const { response } = await inspect(profile, { attachments: [attachment, attachment] });
    expect(response.status).toBe(400);
  });
  it.each([
    [{ name: 'TimeoutError' }, 504, 'INSPECTION_TIMEOUT'],
    [{ status: 400 }, 422, 'INSPECTION_REQUEST_REJECTED'],
    [{ status: 503 }, 503, 'INSPECTION_PROVIDER_UNAVAILABLE'],
    [{ cause: { code: 'ECONNRESET' } }, 503, 'INSPECTION_PROVIDER_UNAVAILABLE'],
    [{ status: 429 }, 503, 'INSPECTION_RATE_LIMIT'],
  ])('reports the service failure accurately: %j', async (error, status, code) => {
    generateContent.mockRejectedValue({ ...error, message: 'sensitive provider diagnostics' });
    const { response, data } = await inspect();
    expect(response.status).toBe(status);
    expect(data.code).toBe(code);
    expect(data.inspection).toBeNull();
    expect(data.message).not.toContain('sensitive');
    expect(data.message).not.toContain('clear image');
  });
  it('reserves time for a fallback and disables unbounded SDK retries', async () => {
    generateContent.mockResolvedValue(result('Ana Reyes'));
    await inspect();
    expect(generateContent.mock.calls[0][0].config.httpOptions).toEqual({
      timeout: 25000,
      retryOptions: { attempts: 1 },
    });
    expect(generateContent.mock.calls[0][0].config.abortSignal).toBeInstanceOf(AbortSignal);
  });
  it('uses another vision model after a transient failure and still detects mismatches', async () => {
    generateContent.mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce(result('Ana Reyes'));
    const { response, data } = await inspect();
    expect(response.status).toBe(200);
    expect(data.inspection.overall_status).toBe('issues_found');
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0][0].model).not.toBe(generateContent.mock.calls[1][0].model);
    expect(generateContent.mock.calls[1][0].config.httpOptions.timeout).toBeLessThanOrEqual(45000);
  });
  it.each([401, 403, 429, 400])('does not retry credential, quota, or invalid-file errors (%s)', async (status) => {
    generateContent.mockRejectedValue({ status });
    await inspect();
    expect(generateContent).toHaveBeenCalledOnce();
  });
});
