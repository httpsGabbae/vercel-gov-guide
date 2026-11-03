import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionMessage, ExtensionSession } from '../extension/src/types';

const state = vi.hoisted(() => ({
  session: {} as ExtensionSession,
  vault: {} as Record<string, unknown>,
  requestWebDetails: vi.fn(),
}));
vi.mock('../extension/src/lib/vault', () => ({
  EMPTY_VAULT_DATA: { firstName: '', lastName: '', philsysId: '' },
  getSession: async () => ({ ...state.session }),
  saveSession: async (patch: Partial<ExtensionSession>) =>
    (state.session = { ...state.session, ...patch }),
  loadLocalVault: async () => state.vault,
  saveLocalVault: async (vault: Record<string, unknown>) => {
    state.vault = vault;
  },
  applicantToVault: (applicant: Record<string, unknown>) => ({
    firstName: applicant.first_name || '',
    philsysId: applicant.philsys_id || '',
  }),
}));
vi.mock('../extension/src/lib/citizen-chat', () => ({ clearStoredCitizenChat: vi.fn() }));
vi.mock('../extension/src/lib/bridge', async (original) => ({
  ...(await original<typeof import('../extension/src/lib/bridge')>()),
  requestWebDetails: state.requestWebDetails,
}));

let listener: (
  msg: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  respond: (result: any) => void,
) => boolean;
const send = (message: ExtensionMessage, sender: chrome.runtime.MessageSender = {}) =>
  new Promise<any>((resolve) => listener(message, sender, resolve));

beforeEach(async () => {
  vi.resetModules();
  state.session = {
    isAuthenticated: true,
    userId: 'user-a',
    citizenId: 'user-a',
    userRole: 'citizen',
    apiBaseUrl: 'http://localhost:3011',
    isOnlineSyncEnabled: true,
  };
  state.vault = { firstName: 'Ana', philsysId: 'old-id' };
  state.requestWebDetails.mockReset();
  vi.stubGlobal('chrome', {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: (fn: typeof listener) => {
          listener = fn;
        },
      },
      sendMessage: vi.fn((_message, callback) => callback?.()),
    },
    contextMenus: { onClicked: { addListener: vi.fn() } },
  });
  await import('../extension/src/background/index');
});

describe('extension background sync', () => {
  it('never provides demo or previous-user details after sign-out', async () => {
    state.session.isAuthenticated = false;
    expect((await send({ type: 'GET_VAULT' })).vault).toEqual({
      firstName: '',
      lastName: '',
      philsysId: '',
    });
  });
  it('refreshes the vault from the matching unlocked tab and preserves field deletion', async () => {
    state.requestWebDetails.mockResolvedValue({
      success: true,
      apiBaseUrl: 'http://localhost:3011',
      applicant: { id: 'user-a', first_name: 'Ana', philsys_id: '' },
    });
    const result = await send({ type: 'SYNC_FROM_GOVGUIDE', payload: { citizenId: 'active' } });
    expect(result.success).toBe(true);
    expect(state.requestWebDetails).toHaveBeenCalledWith(
      'http://localhost:3011',
      'user-a',
      undefined,
    );
    expect(state.vault.philsysId).toBe('');
    expect(state.session.lastSyncedAt).toBeTruthy();
  });
  it('does not modify the local vault when the web save fails', async () => {
    state.requestWebDetails.mockRejectedValue(new Error('Unlock My Details.'));
    const result = await send({
      type: 'SAVE_WEB_DETAILS',
      payload: { applicant: { first_name: 'Edited' } },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unlock');
    expect(state.vault.firstName).toBe('Ana');
  });
  it('rejects web snapshots from another citizen', async () => {
    const result = await send({
      type: 'PUSH_VAULT_FROM_WEB',
      payload: { applicant: { id: 'user-b', first_name: 'Bea' } },
    });
    expect(result.error).toContain('same GovGuide account');
    expect(state.vault.firstName).toBe('Ana');
  });
  it('rejects web sync messages from unrelated sites', async () => {
    const result = await send(
      { type: 'SYNC_WEB_AUTH', payload: { signedOut: true } },
      { tab: { id: 1 } as chrome.tabs.Tab, frameId: 0, url: 'https://evil.test/chat' },
    );
    expect(result.error).toBe('Untrusted sync source.');
    expect(state.session.isAuthenticated).toBe(true);
  });
  it('does not let content scripts change account settings', async () => {
    const result = await send(
      { type: 'SET_SESSION', payload: { userId: 'user-b' } },
      { tab: { id: 1 } as chrome.tabs.Tab },
    );
    expect(result.error).toContain('extension');
    expect(state.session.userId).toBe('user-a');
  });
  it('clears the vault when the connected My Details tab locks', async () => {
    await send({ type: 'CLEAR_WEB_DETAILS', payload: { apiBaseUrl: 'http://localhost:3011' } });
    expect(state.vault.firstName).toBe('');
    expect(state.session.isAuthenticated).toBe(true);
  });
});
