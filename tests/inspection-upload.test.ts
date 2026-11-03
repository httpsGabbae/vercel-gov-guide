import { describe, expect, it, vi } from 'vitest';
import { encodeInspectionFile } from '@/lib/citizen/inspection-upload';
import { parseResponseJson } from '@/lib/utils';
import { isDocumentGoodAndCorrect } from '@/lib/citizen/checklists';
import type { SavedVaultFile } from '@/lib/services/charter-sources';

describe('cross-reference transport', () => {
  it.each(['application/pdf', 'image/png'])(
    'encodes %s contents instead of omitting them',
    async (type) => {
      const read = vi.fn().mockResolvedValue(`data:${type};base64,dGVzdA==`);
      const result = await encodeInspectionFile(new File(['test'], 'psa.pdf', { type }), read);
      expect(result.dataUrl).toContain('base64,dGVzdA==');
      expect(read).toHaveBeenCalledOnce();
    },
  );
  it('infers a PDF MIME type for saved files with missing metadata', async () => {
    const result = await encodeInspectionFile(
      new File(['test'], 'psa.pdf'),
      async () => 'data:;base64,dGVzdA==',
    );
    expect(result.type).toBe('application/pdf');
    expect(result.dataUrl).toBe('data:application/pdf;base64,dGVzdA==');
  });
  it('rejects oversized uploads before encoding', async () => {
    const read = vi.fn();
    await expect(
      encodeInspectionFile(
        new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' }),
        read,
      ),
    ).rejects.toThrow('under 3 MB');
    expect(read).not.toHaveBeenCalled();
  });
  it.each(['image/png', 'image/webp'])(
    'preserves JPEG encoding after resizing %s',
    async (type) => {
      const result = await encodeInspectionFile(
        new File(['test'], 'psa.png', { type }),
        async () => 'data:image/jpeg;base64,/9j/2Q==',
      );
      expect(result.type).toBe('image/jpeg');
      expect(result.dataUrl).toBe('data:image/jpeg;base64,/9j/2Q==');
    },
  );
  it.each(['', 'not-a-data-url', 'data:image/png;base64,'])(
    'rejects unreadable encoded content: %s',
    async (raw) => {
      await expect(
        encodeInspectionFile(new File(['test'], 'psa.png', { type: 'image/png' }), async () => raw),
      ).rejects.toThrow('could not be read');
    },
  );
  it('preserves actionable server errors for the UI', async () => {
    await expect(
      parseResponseJson(
        new Response(JSON.stringify({ message: 'Check the server credential.' }), { status: 503 }),
      ),
    ).rejects.toThrow('Check the server credential.');
  });
  it('does not verify an uninspected file even with a stale All goods label', () => {
    expect(
      isDocumentGoodAndCorrect({
        status: 'uninspected',
        issue_summary: 'All goods',
      } as SavedVaultFile),
    ).toBe(false);
  });
});
