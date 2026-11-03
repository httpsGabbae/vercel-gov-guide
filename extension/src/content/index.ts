/**
 * GovGuide PH — Content Script Coordinator
 * Supports Laravel Livewire 3 / Alpine.js dynamic sections (PSA Online) & standard forms
 */

import { scanPageForFields } from './detector';
import { performAutofill } from './autofill';
import { GovGuideOverlay } from './overlay';
import type { CitizenVaultData, DetectionSummary, ExtensionMessage } from '../types';

let overlay: GovGuideOverlay | null = null;
let currentSummary: DetectionSummary | null = null;
let cachedVault: CitizenVaultData | null = null;
let rescanTimeout: any = null;

function scanForReferenceNumbers(): string | null {
  const text = document.body ? document.body.innerText : '';
  const match = text.match(/\b(REQ-[A-Z0-9-]+|DFA-[A-Z0-9-]+|NBI-[A-Z0-9-]+|PSA-[A-Z0-9-]+|PH-[A-Z0-9-]+)\b/i);
  return match ? match[1] : null;
}

/**
 * Injects a small bridge into the page's main world so we can call window.Livewire.find(id).set(...)
 */
function injectMainWorldLivewireBridge() {
  if (document.getElementById('govguide-livewire-bridge')) return;
  const script = document.createElement('script');
  script.id = 'govguide-livewire-bridge';
  script.textContent = `
    window.addEventListener('__govguide_set_livewire__', function(e) {
      if (!e || !e.detail) return;
      var d = e.detail;
      if (window.Livewire && d.wireId && d.model) {
        try {
          var comp = window.Livewire.find(d.wireId);
          if (comp && typeof comp.set === 'function') {
            comp.set(d.model, d.value);
          }
        } catch(err) {
          // fallback to standard DOM events
        }
      }
    });
  `;
  (document.head || document.documentElement).appendChild(script);
}

async function initialize() {
  overlay = new GovGuideOverlay();
  injectMainWorldLivewireBridge();

  // 1. Check for Reference numbers (Agency Officer helper)
  const ref = scanForReferenceNumbers();
  if (ref) {
    overlay.showAgencyRibbon(ref);
    chrome.runtime.sendMessage({
      type: 'DETECTED_REFERENCE_NUMBER',
      payload: { referenceNumber: ref },
    });
  }

  // 2. Fetch Vault and scan for Citizen Form Fields
  chrome.runtime.sendMessage({ type: 'GET_VAULT' }, (response) => {
    if (response && response.vault) {
      cachedVault = response.vault;
      runDetection(response.vault);
      setupDynamicSectionObserver();
    }
  });

  // 3. Listen for manual triggers from Popup or Background
  chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
    if (msg.type === 'DETECT_FIELDS_REQUEST') {
      if (cachedVault) {
        const summary = runDetection(cachedVault);
        sendResponse({ summary });
      } else {
        chrome.runtime.sendMessage({ type: 'GET_VAULT' }, (response) => {
          if (response && response.vault) {
            cachedVault = response.vault;
            const summary = runDetection(response.vault);
            sendResponse({ summary });
          }
        });
      }
      return true;
    }

    if (msg.type === 'TRIGGER_AUTOFILL') {
      const res = performAutofill(msg.payload.fields);
      sendResponse({ success: true, ...res });
      return true;
    }
  });

  // 4. Live synchronization bridge with GovGuide PH web application ("My Details")
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GOVGUIDE_MY_DETAILS_UPDATED') {
      const { applicant, citizenId } = event.data;
      if (applicant) {
        chrome.runtime.sendMessage(
          {
            type: 'PUSH_VAULT_FROM_WEB',
            payload: { applicant, citizenId: citizenId || applicant.id },
          },
          (res) => {
            if (res && res.vault) {
              cachedVault = res.vault;
              console.log('[GovGuide Extension] Live synced with updated My Details from web app.');
              if (overlay && currentSummary && currentSummary.totalFieldsFound > 0) {
                runDetection(res.vault);
              }
            }
          }
        );
      }
    }
  });

  // If on GovGuide web application, read stored active applicant and push immediately
  if (
    typeof window !== 'undefined' &&
    (window.location.origin.includes('localhost:3000') || window.location.origin.includes('govguide'))
  ) {
    try {
      const rawStored = localStorage.getItem('govguide_active_applicant');
      const activeId = localStorage.getItem('govguide_active_citizen_id');
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        if (parsed && typeof parsed === 'object') {
          chrome.runtime.sendMessage({
            type: 'PUSH_VAULT_FROM_WEB',
            payload: { applicant: parsed, citizenId: activeId || parsed.id || 'active' },
          });
        }
      }
    } catch {
      // Safe ignore
    }
  }
}

function runDetection(vault: CitizenVaultData): DetectionSummary {
  currentSummary = scanPageForFields(vault);

  if (currentSummary.totalFieldsFound > 0 && overlay) {
    overlay.showPill(currentSummary);
  }

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
    let hasRelevantMutation = false;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        hasRelevantMutation = true;
        break;
      }
      if (m.type === 'attributes' && (m.attributeName === 'wire:snapshot' || m.attributeName === 'class' || m.attributeName === 'style')) {
        hasRelevantMutation = true;
        break;
      }
    }

    if (hasRelevantMutation) {
      triggerDebouncedRescan();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['wire:snapshot', 'class', 'style', 'id'],
  });
}

function triggerDebouncedRescan() {
  if (rescanTimeout) clearTimeout(rescanTimeout);
  rescanTimeout = setTimeout(() => {
    if (cachedVault) {
      runDetection(cachedVault);
    }
  }, 350);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
