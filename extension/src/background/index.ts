/**
 * GovGuide PH — Background Service Worker (Manifest V3)
 * Manages Auth (popup login + web chat session sync), Context Menus, Vault Sync,
 * Notifications & Agency API Dispatch
 */

import { loadLocalVault, saveLocalVault, getSession, saveSession, syncVaultFromGovGuide, applicantToVault, EMPTY_VAULT_DATA } from '../lib/vault';
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
        if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
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
  source: 'extension' | 'web'
): Promise<ExtensionSession> {
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
  });
  broadcastSession(session);
  return session;
}

async function clearAuth(): Promise<ExtensionSession> {
  await saveLocalVault(EMPTY_VAULT_DATA);
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
    chrome.runtime.sendMessage({ type: 'VAULT_UPDATED', vault: EMPTY_VAULT_DATA });
  } catch {}
  return session;
}

async function tryRefresh(session: ExtensionSession): Promise<ExtensionSession | null> {
  if (!session.refreshToken) return null;
  try {
    const res = await fetch(`${session.apiBaseUrl}/api/extension/auth`, {
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

async function syncWebAuth(payload: { accessToken?: string; refreshToken?: string; signedOut?: boolean }) {
  const session = await getSession();

  if (payload.signedOut || !payload.accessToken) {
    // Web chat signed out: mirror sign-out for any session sourced from the web
    if (session.isAuthenticated && session.authSource === 'web') {
      return { session: publicSession(await clearAuth()) };
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
    const res = await fetch(`${session.apiBaseUrl}/api/extension/auth`, {
      headers: { Authorization: `Bearer ${payload.accessToken}` },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { session: publicSession(session), error: json.error || 'Web session could not be verified' };
    }
    const updated = await applyAuth(
      json.user,
      { accessToken: payload.accessToken, refreshToken: payload.refreshToken || '' },
      'web'
    );
    return { session: publicSession(updated) };
  } finally {
    webSyncInFlight = null;
  }
}

// Message Router
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || 'Unknown background error' });
  });
  return true; // Keep message channel open for async response
});

async function handleMessage(msg: ExtensionMessage): Promise<any> {
  switch (msg.type) {
    case 'GET_VAULT': {
      try {
        const session = await getSession();
        if (session.isOnlineSyncEnabled) {
          try {
            const targetId = session.citizenId && session.citizenId !== '967760de-3912-5aaf-8ce9-48b2a8dd55f0' ? session.citizenId : 'active';
            const liveVault = await syncVaultFromGovGuide(session.apiBaseUrl, targetId);
            return { vault: liveVault };
          } catch {
            // Server offline or unreachable, fall through to local vault
          }
        }
      } catch {
        // Safe ignore
      }
      const vault = await loadLocalVault();
      return { vault };
    }
    case 'SAVE_VAULT': {
      await saveLocalVault(msg.payload.vault, msg.payload.pin);
      try {
        chrome.runtime.sendMessage({ type: 'VAULT_UPDATED', vault: msg.payload.vault });
      } catch {}
      return { success: true };
    }
    case 'PUSH_VAULT_FROM_WEB': {
      const { applicant, citizenId, apiBaseUrl } = msg.payload;
      const currentVault = await loadLocalVault();
      const updatedVault = applicantToVault(applicant, currentVault);
      await saveLocalVault(updatedVault);
      const effectiveId = citizenId || applicant?.id || 'active';
      const existingSession = await getSession();
      const hasApplicantIdentity =
        Boolean(applicant?.display_name?.trim()) ||
        Boolean(applicant?.first_name?.trim()) ||
        Boolean(applicant?.email?.trim()) ||
        (effectiveId !== 'active' && effectiveId !== 'e1000000-0000-4000-8000-000000000003');

      const targetRole = applicant?.role === 'agency_admin' ? 'agency_admin' : 'citizen';
      const nextFullName =
        applicant?.display_name ||
        [applicant?.first_name, applicant?.last_name].filter(Boolean).join(' ') ||
        'Citizen Session';

      const sessionPatch: Partial<ExtensionSession> = {
        citizenId: effectiveId,
        lastSyncedAt: new Date().toISOString(),
      };
      if (apiBaseUrl) {
        sessionPatch.apiBaseUrl = apiBaseUrl;
      }

      // Check if the citizen identity or role changed from the web session
      const userChanged =
        existingSession.userId !== effectiveId ||
        existingSession.citizenId !== effectiveId ||
        existingSession.userRole !== targetRole ||
        (hasApplicantIdentity && existingSession.fullName !== nextFullName);

      if (hasApplicantIdentity || userChanged) {
        sessionPatch.isAuthenticated = true;
        sessionPatch.authSource = 'web';
        sessionPatch.userRole = targetRole;
        sessionPatch.userId = effectiveId;
        sessionPatch.email = applicant?.email || existingSession.email || 'citizen@govguide.ph';
        sessionPatch.fullName = nextFullName;
      }

      const nextSession = await saveSession(sessionPatch);
      if (
        (!existingSession.isAuthenticated && nextSession.isAuthenticated) ||
        userChanged
      ) {
        broadcastSession(nextSession);
      }
      try {
        chrome.runtime.sendMessage({ type: 'VAULT_UPDATED', vault: updatedVault });
      } catch {}
      return { success: true, vault: updatedVault };
    }
    case 'GET_SESSION': {
      let session = await getSession();
      if (!session.isAuthenticated && session.isOnlineSyncEnabled) {
        try {
          const targetId =
            session.citizenId && session.citizenId !== '967760de-3912-5aaf-8ce9-48b2a8dd55f0'
              ? session.citizenId
              : 'active';
          const res = await fetch(
            `${session.apiBaseUrl}/api/citizen/details?citizenId=${encodeURIComponent(targetId)}`
          );
          if (res.ok) {
            const json = await res.json();
            const app = json?.applicant;
            const hasActiveIdentity =
              json?.ok &&
              app &&
              (json.source === 'active_session_cache' ||
                json.source === 'supabase_profile' ||
                Boolean(app.display_name?.trim()) ||
                Boolean(app.first_name?.trim()) ||
                Boolean(app.email?.trim()));

            if (hasActiveIdentity) {
              const currentVault = await loadLocalVault();
              const syncedVault = applicantToVault(app, currentVault);
              await saveLocalVault(syncedVault);
              session = await saveSession({
                isAuthenticated: true,
                authSource: 'web',
                userRole: 'citizen',
                userId: app.id || targetId,
                citizenId: app.id || targetId,
                email: app.email || 'citizen@govguide.ph',
                fullName:
                  app.display_name ||
                  [app.first_name, app.last_name].filter(Boolean).join(' ') ||
                  'Citizen Session',
                lastSyncedAt: new Date().toISOString(),
              });
            }
          }
        } catch {
          // Offline or no active chat session
        }
      }
      return { session: publicSession(session) };
    }
    case 'SET_SESSION': {
      // Auth fields can only be changed through LOGIN / LOGOUT / SYNC_WEB_AUTH
      const {
        isAuthenticated: _i,
        userRole: _u,
        accessToken: _a,
        refreshToken: _r,
        authSource: _s,
        ...safe
      } = msg.payload;
      const updated = await saveSession(safe);
      return { session: publicSession(updated) };
    }
    case 'LOGIN': {
      const session = await getSession();
      const res = await fetch(`${session.apiBaseUrl}/api/extension/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: msg.payload.email, password: msg.payload.password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Invalid email or password.' };
      }
      if (session.userId && session.userId !== json.user.userId) {
        await saveLocalVault(EMPTY_VAULT_DATA);
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
    case 'SYNC_FROM_GOVGUIDE': {
      const session = await getSession();
      const targetId = msg.payload?.citizenId || (session.citizenId && session.citizenId !== '967760de-3912-5aaf-8ce9-48b2a8dd55f0' ? session.citizenId : 'active');
      const synced = await syncVaultFromGovGuide(session.apiBaseUrl, targetId);
      try {
        chrome.runtime.sendMessage({ type: 'VAULT_UPDATED', vault: synced });
      } catch {}
      return { success: true, vault: synced };
    }
    case 'FETCH_AGENCY_REQUESTS': {
      try {
        const q = msg.payload?.q?.trim() || '';
        const res = await authedFetch(`/api/agency/requests${q ? `?q=${encodeURIComponent(q)}` : ''}`);
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
