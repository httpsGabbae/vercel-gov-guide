/**
 * GovGuide PH — Background Service Worker (Manifest V3)
 * Manages Context Menus, Vault Sync, Notifications & Agency API Dispatch
 */

import { loadLocalVault, saveLocalVault, getSession, saveSession, syncVaultFromGovGuide, applicantToVault } from '../lib/vault';
import type { ExtensionMessage } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'govguide_root',
      title: '🇵🇭 GovGuide PH Copilot',
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
      const { applicant, citizenId } = msg.payload;
      const currentVault = await loadLocalVault();
      const updatedVault = applicantToVault(applicant, currentVault);
      await saveLocalVault(updatedVault);
      const effectiveId = citizenId || applicant?.id || 'active';
      await saveSession({
        citizenId: effectiveId,
        lastSyncedAt: new Date().toISOString(),
      });
      try {
        chrome.runtime.sendMessage({ type: 'VAULT_UPDATED', vault: updatedVault });
      } catch {}
      return { success: true, vault: updatedVault };
    }
    case 'GET_SESSION': {
      const session = await getSession();
      return { session };
    }
    case 'SET_SESSION': {
      const updated = await saveSession(msg.payload);
      return { session: updated };
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
    case 'UPDATE_REQUEST_STATUS': {
      const session = await getSession();
      const res = await fetch(`${session.apiBaseUrl}/api/agency/requests`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-agency-role': 'counter_officer',
        },
        body: JSON.stringify(msg.payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update agency request status');
      }

      // Notify citizen/officer via Chrome Notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'GovGuide Agency Bridge',
        message: `Status updated to '${msg.payload.statusLabel}' for ${msg.payload.requestId}`,
      });

      return { success: true, data: json.data };
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
