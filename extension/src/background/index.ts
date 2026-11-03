/**
 * GovGuide PH — Background Service Worker (Manifest V3)
 * Manages Auth (popup login + web chat session sync), Context Menus, Vault Sync,
 * Notifications & Agency API Dispatch
 */

import {
  loadLocalVault,
  saveLocalVault,
  getSession,
  saveSession,
  applicantToVault,
  EMPTY_VAULT_DATA,
} from '../lib/vault';
import { isGovGuideUrl, requestWebDetails } from '../lib/bridge';
import { clearStoredCitizenChat } from '../lib/citizen-chat';
import type { ExtensionMessage, ExtensionSession, UserRole } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'govguide_root',
      title: 'GovGuide PH',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'govguide_paste_mmn',
      parentId: 'govguide_root',
      title: "Paste Mother's Maiden Name",
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'govguide_paste_philsys',
      parentId: 'govguide_root',
      title: 'Paste PhilSys National ID',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'govguide_paste_philhealth',
      parentId: 'govguide_root',
      title: 'Paste PhilHealth PIN',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'govguide_paste_tin',
      parentId: 'govguide_root',
      title: 'Paste BIR TIN',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'govguide_paste_fullname',
      parentId: 'govguide_root',
      title: 'Paste Full Name',
      contexts: ['editable'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  const vault = await loadLocalVault();

  let textToPaste = '';
  switch (info.menuItemId) {
    case 'govguide_paste_mmn':
      textToPaste = `${vault.motherMaidenFirstName} ${vault.motherMaidenLastName}`.trim();
      break;
    case 'govguide_paste_philsys':
      textToPaste = vault.philsysId || '';
      break;
    case 'govguide_paste_philhealth':
      textToPaste = vault.philhealthNumber || '';
      break;
    case 'govguide_paste_tin':
      textToPaste = vault.tin || '';
      break;
    case 'govguide_paste_fullname':
      textToPaste = `${vault.firstName} ${vault.middleName} ${vault.lastName}`.trim();
      break;
  }

  if (textToPaste) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (val: string) => {
        const active = document.activeElement;
        if (
          active &&
          (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
        ) {
          active.value = val;
          active.dispatchEvent(new Event('input', { bubbles: true }));
          active.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      args: [textToPaste],
    });
  }
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface AuthUserPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  agencyCode?: string;
  agencyName?: string;
}

interface AuthTokensPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

function broadcastSession(session: ExtensionSession) {
  try {
    chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', session: publicSession(session) }, () => {
      void chrome.runtime.lastError; // popup may be closed
    });
  } catch {
    // Safe ignore
  }
}

/** Strips tokens before handing the session to UI contexts. */
function publicSession(session: ExtensionSession): ExtensionSession {
  const { accessToken: _a, refreshToken: _r, ...rest } = session;
  return rest;
}

async function applyAuth(
  user: AuthUserPayload,
  tokens: AuthTokensPayload,
  source: 'extension' | 'web',
): Promise<ExtensionSession> {
  const previous = await getSession();
  if (previous.userId !== user.userId) await saveLocalVault(EMPTY_VAULT_DATA);
  const session = await saveSession({
    isAuthenticated: true,
    authSource: source,
    userRole: user.role,
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    officerName: user.fullName,
    agencyCode: user.agencyCode,
    agencyName: user.agencyName,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    citizenId: user.userId,
  });
  broadcastSession(session);
  return session;
}

async function clearAuth(): Promise<ExtensionSession> {
  const prev = await getSession();
  await saveLocalVault(EMPTY_VAULT_DATA);
  await clearStoredCitizenChat(prev.userId || prev.citizenId);
  const session = await saveSession({
    isAuthenticated: false,
    authSource: undefined,
    userRole: 'guest',
    userId: undefined,
    citizenId: 'active',
    email: undefined,
    fullName: undefined,
    officerName: undefined,
    agencyCode: undefined,
    agencyName: undefined,
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
  });
  broadcastSession(session);
  try {
    chrome.runtime.sendMessage(
      { type: 'VAULT_UPDATED', vault: EMPTY_VAULT_DATA, online: false },
      () => {
        void chrome.runtime.lastError;
      },
    );
  } catch {}
  return session;
}

async function tryRefresh(session: ExtensionSession): Promise<ExtensionSession | null> {
  if (!session.refreshToken) return null;
  try {
    const res = await fetch(`${session.apiBaseUrl}/api/extension/auth`, {
      signal: AbortSignal.timeout(10000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return null;
    return await applyAuth(json.user, json.tokens, session.authSource || 'extension');
  } catch {
    return null;
  }
}

/**
 * Fetch against the GovGuide API with the stored bearer token.
 * Retries once after refreshing an expired token; signs out if refresh fails.
 */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let session = await getSession();
  const buildHeaders = (token?: string): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-agency-role': 'counter_officer',
      ...((init.headers as Record<string, string>) || {}),
    };
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  };

  const doFetch = (headers: Record<string, string>) =>
    fetch(`${session.apiBaseUrl}${path}`, {
      ...init,
      headers,
      signal: init.signal || AbortSignal.timeout(10000),
    });

  let res = await doFetch(buildHeaders(session.accessToken));
  if (res.status === 401 && session.refreshToken) {
    const refreshed = await tryRefresh(session);
    if (refreshed && refreshed.accessToken) {
      session = refreshed;
      res = await doFetch(buildHeaders(refreshed.accessToken));
    }
  }
  return res;
}

let webSyncInFlight: string | null = null;

async function syncWebAuth(payload: {
  accessToken?: string;
  refreshToken?: string;
  signedOut?: boolean;
  apiBaseUrl?: string;
}) {
  const session = await getSession();
  const effectiveBaseUrl = payload.apiBaseUrl || session.apiBaseUrl;
  if (!isGovGuideUrl(effectiveBaseUrl)) throw new Error('Unsupported GovGuide origin.');

  if (payload.signedOut && effectiveBaseUrl !== session.apiBaseUrl)
    return { session: publicSession(session) };
  if (payload.signedOut) {
    // Web chat signed out: mirror sign-out for any session sourced from the web
    if (session.isAuthenticated && session.authSource === 'web') {
      return { session: publicSession(await clearAuth()) };
    }
    return { session: publicSession(session) };
  }

  if (!payload.accessToken) {
    if (payload.apiBaseUrl && payload.apiBaseUrl !== session.apiBaseUrl) {
      const updated = await saveSession({ apiBaseUrl: payload.apiBaseUrl });
      return { session: publicSession(updated) };
    }
    return { session: publicSession(session) };
  }

  if (session.isAuthenticated && session.accessToken === payload.accessToken) {
    return { session: publicSession(session) };
  }
  if (webSyncInFlight === payload.accessToken) {
    return { session: publicSession(session) };
  }

  webSyncInFlight = payload.accessToken;
  try {
    const res = await fetch(`${effectiveBaseUrl}/api/extension/auth`, {
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        'x-extension-id': 'govguide-extension',
      },
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        session: publicSession(session),
        error: json.error || 'Web session could not be verified',
      };
    }
    if (payload.apiBaseUrl && payload.apiBaseUrl !== session.apiBaseUrl) {
      await saveSession({ apiBaseUrl: payload.apiBaseUrl });
    }
    const updated = await applyAuth(
      json.user,
      { accessToken: payload.accessToken, refreshToken: payload.refreshToken || '' },
      'web',
    );
    return { session: publicSession(updated) };
  } finally {
    webSyncInFlight = null;
  }
}

// Message Router
let messageQueue: Promise<unknown> = Promise.resolve();
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, sender, sendResponse) => {
  if (
    sender.tab &&
    ![
      'GET_VAULT',
      'DETECTED_REFERENCE_NUMBER',
      'PUSH_VAULT_FROM_WEB',
      'SYNC_WEB_AUTH',
      'CLEAR_WEB_DETAILS',
    ].includes(msg.type)
  ) {
    sendResponse({ error: 'This action must be started in the extension.' });
    return false;
  }
  if (
    sender.tab &&
    (msg.type === 'CLEAR_WEB_DETAILS' ||
      msg.type === 'PUSH_VAULT_FROM_WEB' ||
      msg.type === 'SYNC_WEB_AUTH' ||
      msg.type === 'SET_SESSION')
  ) {
    if (!sender.url || !isGovGuideUrl(sender.url) || sender.frameId !== 0) {
      sendResponse({ error: 'Untrusted sync source.' });
      return false;
    }
    if ('payload' in msg) msg.payload = { ...msg.payload, apiBaseUrl: new URL(sender.url).origin };
  }
  const pending = messageQueue.then(() => handleMessage(msg));
  messageQueue = pending.catch(() => undefined);
  pending.then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || 'Unknown background error' });
  });
  return true; // Keep message channel open for async response
});

async function handleMessage(msg: ExtensionMessage): Promise<any> {
  switch (msg.type) {
    case 'CLEAR_WEB_DETAILS': {
      const session = await getSession();
      if (msg.payload?.apiBaseUrl === session.apiBaseUrl) {
        await saveLocalVault(EMPTY_VAULT_DATA);
        await saveSession({ lastSyncedAt: undefined });
        chrome.runtime.sendMessage(
          { type: 'VAULT_UPDATED', vault: EMPTY_VAULT_DATA, online: false },
          () => {
            void chrome.runtime.lastError;
          },
        );
      }
      return { success: true };
    }
    case 'GET_VAULT': {
      const session = await getSession();
      return {
        vault: session.isAuthenticated ? await loadLocalVault() : EMPTY_VAULT_DATA,
        online: false,
      };
    }
    case 'SAVE_VAULT': {
      if (!(await getSession()).isAuthenticated) throw new Error('Sign in before saving details.');
      await saveLocalVault(msg.payload.vault, msg.payload.pin);
      try {
        chrome.runtime.sendMessage(
          { type: 'VAULT_UPDATED', vault: msg.payload.vault, online: false },
          () => {
            void chrome.runtime.lastError;
          },
        );
      } catch {}
      return { success: true };
    }
    case 'PUSH_VAULT_FROM_WEB': {
      const { applicant, citizenId, apiBaseUrl } = msg.payload;
      const existingSession = await getSession();
      const effectiveId = citizenId || applicant?.id;
      if (
        !existingSession.isAuthenticated ||
        !effectiveId ||
        effectiveId !== existingSession.userId ||
        applicant?.id !== effectiveId
      ) {
        throw new Error('Sign in with the same GovGuide account before syncing details.');
      }
      if (apiBaseUrl && new URL(apiBaseUrl).origin !== new URL(existingSession.apiBaseUrl).origin) {
        throw new Error('This GovGuide tab does not match the connected account origin.');
      }
      const updatedVault = applicantToVault(applicant);
      await saveLocalVault(updatedVault);
      const session = await saveSession({
        citizenId: effectiveId,
        lastSyncedAt: new Date().toISOString(),
      });
      broadcastSession(session);
      chrome.runtime.sendMessage({ type: 'VAULT_UPDATED', vault: updatedVault }, () => {
        void chrome.runtime.lastError;
      });
      return { success: true, vault: updatedVault, session: publicSession(session) };
    }
    case 'GET_SESSION': {
      let session = await getSession();
      return { session: publicSession(session) };
    }
    case 'SET_SESSION': {
      const safe: Partial<ExtensionSession> = {};
      if (typeof msg.payload.isOnlineSyncEnabled === 'boolean')
        safe.isOnlineSyncEnabled = msg.payload.isOnlineSyncEnabled;
      if (msg.payload.apiBaseUrl) {
        if (!isGovGuideUrl(msg.payload.apiBaseUrl)) throw new Error('Unsupported GovGuide origin.');
        safe.apiBaseUrl = new URL(msg.payload.apiBaseUrl).origin;
      }
      const updated = await saveSession(safe);
      return { session: publicSession(updated) };
    }
    case 'LOGIN': {
      const session = await getSession();
      const candidateUrls = [session.apiBaseUrl];
      let res: Response | null = null;
      let effectiveBase = session.apiBaseUrl;

      for (const url of candidateUrls) {
        try {
          res = await fetch(`${url}/api/extension/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-extension-id': 'govguide-extension' },
            body: JSON.stringify({ email: msg.payload.email, password: msg.payload.password }),
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            effectiveBase = url;
            break;
          }
        } catch {}
      }

      if (!res) {
        return {
          success: false,
          error: 'Unable to connect to GovGuide PH. Ensure the web app is running.',
        };
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Invalid email or password.' };
      }
      if (session.userId && session.userId !== json.user.userId) {
        await saveLocalVault(EMPTY_VAULT_DATA);
      }
      if (effectiveBase !== session.apiBaseUrl) {
        await saveSession({ apiBaseUrl: effectiveBase });
      }
      const updated = await applyAuth(json.user, json.tokens, 'extension');
      return { success: true, session: publicSession(updated) };
    }
    case 'LOGOUT': {
      const updated = await clearAuth();
      return { success: true, session: publicSession(updated) };
    }
    case 'SYNC_WEB_AUTH': {
      return await syncWebAuth(msg.payload);
    }
    case 'SAVE_WEB_DETAILS':
    case 'SYNC_FROM_GOVGUIDE': {
      try {
        const session = await getSession();
        if (!session.isAuthenticated || !session.userId)
          throw new Error('Sign in before syncing My Details.');
        const response = await requestWebDetails(
          session.apiBaseUrl,
          session.userId,
          msg.type === 'SAVE_WEB_DETAILS' ? msg.payload.applicant : undefined,
        );
        if (response.apiBaseUrl !== new URL(session.apiBaseUrl).origin)
          throw new Error('Open My Details on the connected GovGuide origin.');
        return await handleMessage({
          type: 'PUSH_VAULT_FROM_WEB',
          payload: {
            applicant: response.applicant,
            citizenId: response.applicant.id,
            apiBaseUrl: response.apiBaseUrl,
          },
        });
      } catch (err: any) {
        return { success: false, error: err.message || 'Unable to sync My Details.' };
      }
    }
    case 'FETCH_AGENCY_REQUESTS': {
      try {
        const q = msg.payload?.q?.trim() || '';
        const res = await authedFetch(
          `/api/agency/requests${q ? `?q=${encodeURIComponent(q)}` : ''}`,
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load agency requests');
        }
        return { success: true, data: json.data };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to load agency requests', data: [] };
      }
    }
    case 'UPDATE_REQUEST_STATUS': {
      try {
        const res = await authedFetch('/api/agency/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update agency request status');
        }

        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: 'GovGuide Agency Bridge',
            message: `${msg.payload.requestId} updated: ${json.data?.statusLabel || 'Saved'}`,
          });
        } catch {}

        return { success: true, data: json.data };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update agency request status' };
      }
    }
    case 'SHOW_NOTIFICATION': {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: msg.payload.title,
        message: msg.payload.message,
      });
      return { success: true };
    }
    default:
      return { unhandled: true };
  }
}
