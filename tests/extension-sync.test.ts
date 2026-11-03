import { afterEach, describe, expect, it, vi } from 'vitest';
import { isGovGuideUrl, requestWebDetails } from '../extension/src/lib/bridge';
import { applicantToVault, EMPTY_VAULT_DATA } from '../extension/src/lib/vault';

afterEach(() => vi.unstubAllGlobals());

describe('extension My Details bridge', () => {
  it.each([
    'https://govguide.ph/chat',
    'https://app.govguide.ph/chat',
    'http://localhost:3011/chat',
    'http://127.0.0.1:3002/chat',
  ])('accepts app origin %s', (url) => {
    expect(isGovGuideUrl(url)).toBe(true);
  });
  it.each([
    'https://govguide.ph.evil.test/chat',
    'https://notgovguide.ph/chat',
    'https://localhost.evil.test',
    'file:///chat',
  ])('rejects unrelated origin %s', (url) => {
    expect(isGovGuideUrl(url)).toBe(false);
  });
  it('targets the connected origin and account, not another active localhost app', async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValue({ success: true, applicant: { id: 'citizen-a', first_name: 'Ana' } });
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 1, active: true, url: 'http://localhost:3000/chat' },
          { id: 2, active: false, url: 'http://localhost:3011/chat' },
        ]),
        sendMessage,
      },
    });
    const result = await requestWebDetails('http://localhost:3011', 'citizen-a');
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith(2, {
      type: 'REQUEST_WEB_DETAILS',
      payload: { userId: 'citizen-a', applicant: undefined },
    });
    expect(result.applicant.first_name).toBe('Ana');
  });
  it('surfaces a locked-details error without claiming sync succeeded', async () => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 2, url: 'http://localhost:3011/chat' }]),
        sendMessage: vi.fn().mockResolvedValue({ error: 'Unlock My Details first.' }),
      },
    });
    await expect(requestWebDetails('http://localhost:3011', 'citizen-a')).rejects.toThrow(
      'Unlock My Details first.',
    );
  });
  it('rejects another user returned by a tab', async () => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 2, url: 'http://localhost:3011/chat' }]),
        sendMessage: vi.fn().mockResolvedValue({ success: true, applicant: { id: 'citizen-b' } }),
      },
    });
    await expect(requestWebDetails('http://localhost:3011', 'citizen-a')).rejects.toThrow();
  });
  it('explains how to recover after extension reload', async () => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 2, url: 'http://localhost:3011/chat' }]),
        sendMessage: vi.fn().mockRejectedValue(new Error('Receiving end does not exist')),
      },
    });
    await expect(requestWebDetails('http://localhost:3011', 'citizen-a')).rejects.toThrow(
      'Refresh',
    );
  });
  it('applies full profile snapshots without retaining deleted IDs or demo details', () => {
    expect(applicantToVault({ id: 'citizen-a', first_name: 'Ana', philsys_id: '' })).toMatchObject({
      firstName: 'Ana',
      philsysId: '',
      lastName: '',
      motherMaidenFirstName: '',
    });
    expect(applicantToVault(null)).toEqual(EMPTY_VAULT_DATA);
  });
});
