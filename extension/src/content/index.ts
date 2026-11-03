/**
 * GovGuide PH — Content Script Coordinator
 * Supports Laravel Livewire 3 / Alpine.js dynamic sections (PSA Online) & standard forms
 */

import { isGovGuideUrl } from '../lib/bridge';
import { scanPageForFields } from './detector';
import { performAutofill } from './autofill';
import type { CitizenVaultData, DetectionSummary, ExtensionMessage } from '../types';

let currentSummary: DetectionSummary | null = null;
let cachedVault: CitizenVaultData | null = null;
let rescanTimeout: any = null;

function scanForReferenceNumbers(): string | null {
  const text = document.body ? document.body.innerText : '';
  const match = text.match(
    /\b(REQ-[A-Z0-9-]+|DFA-[A-Z0-9-]+|NBI-[A-Z0-9-]+|PSA-[A-Z0-9-]+|PH-[A-Z0-9-]+)\b/i,
  );
  return match ? match[1] : null;
}

function isIgnoredDomain(): boolean {
  const host =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname.toLowerCase()
      : '';
  return (
    host.includes('google.') ||
    host.includes('bing.com') ||
    host.includes('yahoo.com') ||
    host.includes('duckduckgo.com') ||
    host.includes('baidu.com') ||
    host.includes('youtube.com') ||
    host.includes('facebook.com') ||
    host.includes('twitter.com') ||
    host.includes('x.com') ||
    host.includes('github.com')
  );
}

async function initialize() {
  // Ensure no lingering floating overlay elements exist on the page
  const existingHost = document.getElementById('govguide-copilot-host');
  if (existingHost) {
    existingHost.remove();
  }

  // Skip auto-detection & mutation observers on major search engines and social platforms
  const isIgnored = isIgnoredDomain();

  // 1. Check for Reference numbers (Agency Officer helper) on relevant portals
  if (!isIgnored) {
    const ref = scanForReferenceNumbers();
    if (ref) {
      chrome.runtime.sendMessage({
        type: 'DETECTED_REFERENCE_NUMBER',
        payload: { referenceNumber: ref },
      });
    }

    // 2. Fetch Vault and prepare Form Fields detection in memory
    chrome.runtime.sendMessage({ type: 'GET_VAULT' }, (response) => {
      if (response && response.vault) {
        cachedVault = response.vault;
        runDetection(response.vault);
        setupDynamicSectionObserver();
      }
    });
  }

  // 3. Listen for manual triggers from the Extension Popup button
  chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
    if (msg.type === 'REQUEST_WEB_DETAILS' && isGovGuideUrl(location.href)) {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        window.removeEventListener('message', receive);
        sendResponse({ error: 'GovGuide did not respond. Refresh the tab and unlock My Details.' });
      }, 10000);
      const receive = (event: MessageEvent) => {
        if (
          event.source !== window ||
          event.origin !== location.origin ||
          event.data?.type !== 'GOVGUIDE_DETAILS_RESPONSE' ||
          event.data.requestId !== requestId
        )
          return;
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        sendResponse(event.data);
      };
      window.addEventListener('message', receive);
      window.postMessage(
        { type: 'GOVGUIDE_DETAILS_REQUEST', requestId, ...msg.payload },
        location.origin,
      );
      return true;
    }
    if (msg.type === 'DETECT_FIELDS_REQUEST') {
      chrome.runtime.sendMessage({ type: 'GET_VAULT' }, (response) => {
        if (chrome.runtime.lastError || !response?.vault) {
          sendResponse({ summary: null });
          return;
        }
        cachedVault = response.vault;
        sendResponse({ summary: runDetection(response.vault) });
      });
      return true;
    }

    if (msg.type === 'TRIGGER_AUTOFILL') {
      const res = performAutofill(msg.payload.fields);
      sendResponse({ success: true, ...res });
      return true;
    }
  });

  // 4. Live synchronization bridge with GovGuide PH web application ("My Details" & Sign Out)
  window.addEventListener('message', (event) => {
    if (
      !isGovGuideUrl(location.href) ||
      event.source !== window ||
      event.origin !== location.origin
    )
      return;
    if (event.data?.type === 'GOVGUIDE_DETAILS_LOCKED') {
      cachedVault = null;
      chrome.runtime.sendMessage(
        { type: 'CLEAR_WEB_DETAILS', payload: { apiBaseUrl: location.origin } },
        () => {
          void chrome.runtime.lastError;
        },
      );
    }
    if (event.data && event.data.type === 'GOVGUIDE_MY_DETAILS_UPDATED') {
      const { applicant, citizenId } = event.data;
      if (applicant) {
        chrome.runtime.sendMessage(
          {
            type: 'PUSH_VAULT_FROM_WEB',
            payload: {
              applicant,
              citizenId: citizenId || applicant.id,
              apiBaseUrl: window.location.origin,
            },
          },
          (res) => {
            if (res && res.vault) {
              cachedVault = res.vault;
              runDetection(res.vault);
            }
          },
        );
      }
    }
    if (event.data && event.data.type === 'GOVGUIDE_USER_SIGNED_OUT') {
      lastWebAuthToken = null;
      cachedVault = null;
      try {
        chrome.runtime.sendMessage({ type: 'SYNC_WEB_AUTH', payload: { signedOut: true } }, () => {
          void chrome.runtime.lastError;
        });
      } catch {}
    }
  });

  if (isGovGuideUrl(location.href) && location.pathname.startsWith('/chat')) {
    startWebAuthBridge();
  }
}

/**
 * Reads the Supabase auth session persisted by the GovGuide web app
 * (localStorage key `sb-<project-ref>-auth-token`).
 */
function readWebAuthTokens(): { accessToken: string; refreshToken: string } | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const sessionObj = parsed?.currentSession || parsed;
      if (sessionObj?.access_token) {
        return {
          accessToken: sessionObj.access_token,
          refreshToken: sessionObj.refresh_token || '',
        };
      }
    }
  } catch {
    // Safe ignore
  }
  return null;
}

let lastWebAuthToken: string | null | undefined;
let webAuthPending = false;
function pushWebAuthIfChanged() {
  if (webAuthPending) return;
  const tokens = readWebAuthTokens();
  const token = tokens?.accessToken || null;
  if (token === lastWebAuthToken) return;
  if (!tokens && lastWebAuthToken === undefined) return;
  webAuthPending = true;
  try {
    chrome.runtime.sendMessage(
      {
        type: 'SYNC_WEB_AUTH',
        payload: tokens
          ? {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              apiBaseUrl: window.location.origin,
            }
          : { signedOut: true, apiBaseUrl: window.location.origin },
      },
      (response) => {
        webAuthPending = false;
        if (!chrome.runtime.lastError && !response?.error) lastWebAuthToken = token;
      },
    );
  } catch {
    webAuthPending = false;
    // Extension context invalidated (e.g. reloaded) - safe ignore
  }
}

function startWebAuthBridge() {
  pushWebAuthIfChanged();
  window.addEventListener('storage', () => {
    pushWebAuthIfChanged();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pushWebAuthIfChanged();
    }
  });
  // Same-tab profile or auth switches poll lightly
  setInterval(() => {
    pushWebAuthIfChanged();
  }, 2500);
}

function runDetection(vault: CitizenVaultData): DetectionSummary {
  currentSummary = scanPageForFields(vault);
  return currentSummary;
}

/**
 * Observes dynamic section transitions (e.g. PSA Livewire visibleSections and @section-shown.window)
 */
function setupDynamicSectionObserver() {
  // Listen for PSA custom window event
  window.addEventListener('section-shown', () => {
    triggerDebouncedRescan();
  });

  // MutationObserver for DOM changes when Livewire renders new sections
  const observer = new MutationObserver((mutations) => {
    let hasRelevantChange = false;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node instanceof HTMLElement) {
            if (
              node.tagName === 'INPUT' ||
              node.tagName === 'SELECT' ||
              node.querySelector('input, select') ||
              node.getAttribute('wire:id') ||
              node.classList.contains('section-pane')
            ) {
              hasRelevantChange = true;
              break;
            }
          }
        }
      }
      if (hasRelevantChange) break;
    }

    if (hasRelevantChange) {
      triggerDebouncedRescan();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function triggerDebouncedRescan() {
  if (rescanTimeout) clearTimeout(rescanTimeout);
  rescanTimeout = setTimeout(() => {
    if (cachedVault) {
      runDetection(cachedVault);
    }
  }, 400);
}

// Auto-boot if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
