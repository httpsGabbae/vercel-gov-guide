/**
 * GovGuide PH — Citizen Vault Manager & GovGuide Online Bridge
 */

import { encryptVault, decryptVault } from './crypto';
import type { CitizenVaultData, ExtensionSession } from '../types';

export const STORAGE_VAULT_KEY = 'govguide_citizen_vault_encrypted';
export const STORAGE_SESSION_KEY = 'govguide_extension_session';

export const EMPTY_VAULT_DATA: CitizenVaultData = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  gender: 'MALE',
  dateOfBirth: '',
  placeOfBirth: '',
  civilStatus: 'SINGLE',
  nationality: 'FILIPINO',

  fatherFullName: '',
  fatherFirstName: '',
  fatherMiddleName: '',
  fatherLastName: '',
  fatherSuffix: '',

  motherMaidenFirstName: '',
  motherMaidenMiddleName: '',
  motherMaidenLastName: '',
  motherMaidenSuffix: '',

  mobileNumber: '',
  emailAddress: '',
  landline: '',

  region: '',
  province: '',
  cityMunicipality: '',
  barangay: '',
  streetHouseNumber: '',
  zipCode: '',

  philsysId: '',
  tin: '',
  sssNumber: '',
  philhealthNumber: '',
  pagibigMid: '',
  passportNumber: '',
};

export const DEFAULT_VAULT_DATA: CitizenVaultData = {
  firstName: 'Juan',
  middleName: 'Santos',
  lastName: 'Dela Cruz',
  suffix: '',
  gender: 'MALE',
  dateOfBirth: '1994-06-12',
  placeOfBirth: 'Manila, Philippines',
  civilStatus: 'SINGLE',
  nationality: 'FILIPINO',

  fatherFullName: 'Roberto Mendoza Dela Cruz',
  fatherFirstName: 'Roberto',
  fatherMiddleName: 'Mendoza',
  fatherLastName: 'Dela Cruz',
  fatherSuffix: '',

  motherMaidenFirstName: 'Maria',
  motherMaidenMiddleName: 'Gomez',
  motherMaidenLastName: 'Santos',
  motherMaidenSuffix: '',

  mobileNumber: '09175550192',
  emailAddress: 'juan.delacruz@govguide.ph',
  landline: '(02) 8527-1111',

  region: 'National Capital Region (NCR)',
  province: 'Metro Manila',
  cityMunicipality: 'City of Manila',
  barangay: 'Barangay 659-A, Ermita',
  streetHouseNumber: '1024 General Luna Street',
  zipCode: '1000',

  philsysId: '1234-5678-9012-3456',
  tin: '123-456-789-000',
  sssNumber: '03-9876543-2',
  philhealthNumber: '12-345678901-2',
  pagibigMid: '1210-9876-5432',
  passportNumber: 'P8921824B',
};

export const DEFAULT_SESSION: ExtensionSession = {
  userRole: 'guest',
  isAuthenticated: false,
  citizenId: 'active',
  apiBaseUrl: 'http://localhost:3000',
  isOnlineSyncEnabled: true,
};

export async function getSession(): Promise<ExtensionSession> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_SESSION_KEY], (res) => {
      if (res[STORAGE_SESSION_KEY]) {
        resolve({ ...DEFAULT_SESSION, ...res[STORAGE_SESSION_KEY] });
      } else {
        resolve(DEFAULT_SESSION);
      }
    });
  });
}

export async function saveSession(updates: Partial<ExtensionSession>): Promise<ExtensionSession> {
  const current = await getSession();
  const merged: ExtensionSession = { ...current, ...updates };
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_SESSION_KEY]: merged }, () => {
      resolve(merged);
    });
  });
}

export async function loadLocalVault(pin?: string): Promise<CitizenVaultData> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_VAULT_KEY], async (res) => {
      if (res[STORAGE_VAULT_KEY]) {
        try {
          const raw = res[STORAGE_VAULT_KEY] as string;
          const decrypted = await decryptVault<CitizenVaultData>(raw, pin);
          resolve(decrypted);
          return;
        } catch {
          // If decryption fails, fallback
        }
      }
      resolve(EMPTY_VAULT_DATA);
    });
  });
}

export async function saveLocalVault(data: CitizenVaultData, pin?: string): Promise<void> {
  const encrypted = await encryptVault(data, pin);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_VAULT_KEY]: encrypted }, () => {
      resolve();
    });
  });
}

/**
 * Converts an ApplicantProfile or partial object to CitizenVaultData cleanly
 * accurately preserving details gathered from My Details without polluting with fake data
 */
export function applicantToVault(a: any, fallbackVault?: CitizenVaultData): CitizenVaultData {
  if (!a || typeof a !== 'object') {
    return fallbackVault || EMPTY_VAULT_DATA;
  }

  // Derive name parts
  let fn = (a.first_name || '').trim();
  let mn = (a.middle_name || '').trim();
  let ln = (a.last_name || '').trim();
  let suf = (a.suffix || '').trim();

  if (!fn && !ln && a.display_name && a.display_name.trim()) {
    const rawParts = a.display_name.trim().split(/\s+/);
    if (rawParts.length === 1) {
      fn = rawParts[0];
    } else if (rawParts.length === 2) {
      fn = rawParts[0];
      ln = rawParts[1];
    } else if (rawParts.length >= 3) {
      fn = rawParts[0];
      mn = rawParts.slice(1, -1).join(' ');
      ln = rawParts[rawParts.length - 1];
    }
  }

  // Derive father's name parts
  let fFn = (a.father_first_name || '').trim();
  let fMn = (a.father_middle_name || '').trim();
  let fLn = (a.father_last_name || '').trim();
  let fSuf = (a.father_suffix || '').trim();
  const fFull = (a.father_name || '').trim();
  if (!fFn && !fLn && fFull) {
    const parts = fFull.split(/\s+/);
    if (parts.length === 1) {
      fFn = parts[0];
    } else if (parts.length === 2) {
      fFn = parts[0];
      fLn = parts[1];
    } else if (parts.length >= 3) {
      fFn = parts[0];
      fMn = parts.slice(1, -1).join(' ');
      fLn = parts[parts.length - 1];
    }
  }

  // Derive mother's maiden name parts
  let mFn = (a.mother_first_name || '').trim();
  let mMn = (a.mother_middle_name || '').trim();
  let mLn = (a.mother_last_name || a.maiden_name || '').trim();
  let mSuf = (a.mother_suffix || '').trim();
  const mFull = (a.mother_maiden_name || '').trim();
  if (!mFn && !mLn && mFull) {
    const parts = mFull.split(/\s+/);
    if (parts.length === 1) {
      mFn = parts[0];
    } else if (parts.length === 2) {
      mFn = parts[0];
      mLn = parts[1];
    } else if (parts.length >= 3) {
      mFn = parts[0];
      mMn = parts.slice(1, -1).join(' ');
      mLn = parts[parts.length - 1];
    }
  }

  // Only use fallback if it represents the same citizen identity.
  // When switching users, never leak the prior citizen's identifiers or family data.
  const fbFn = fallbackVault?.firstName?.trim().toLowerCase() || '';
  const fbLn = fallbackVault?.lastName?.trim().toLowerCase() || '';
  const curFn = fn.trim().toLowerCase();
  const curLn = ln.trim().toLowerCase();
  const fbEmail = fallbackVault?.emailAddress?.trim().toLowerCase() || '';
  const curEmail = (a.email || '').trim().toLowerCase();
  const fbPhilsys = (fallbackVault?.philsysId || '').replace(/[-\s]/g, '');
  const curPhilsys = (a.philsys_id || a.philsys_card_number || '').replace(/[-\s]/g, '');

  const isSamePerson = Boolean(
    fallbackVault &&
      ((curPhilsys && fbPhilsys && curPhilsys === fbPhilsys) ||
        (curEmail && fbEmail && curEmail === fbEmail) ||
        (curFn && curLn && fbFn === curFn && fbLn === curLn))
  );

  const fb = isSamePerson && fallbackVault ? fallbackVault : EMPTY_VAULT_DATA;

  return {
    firstName: fn || (fb.firstName || ''),
    middleName: mn || (fb.middleName || ''),
    lastName: ln || (fb.lastName || ''),
    suffix: suf || (fb.suffix || ''),
    gender: a.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : (a.gender?.toUpperCase() === 'OTHER' ? 'OTHER' : 'MALE'),
    dateOfBirth: a.birth_date || a.date_of_birth || (fb.dateOfBirth || ''),
    placeOfBirth: a.place_of_birth || (a.city ? `${a.city}, Philippines` : (fb.placeOfBirth || '')),
    civilStatus: (a.civil_status?.toUpperCase() as any) || (fb.civilStatus || 'SINGLE'),
    nationality: a.nationality || (fb.nationality || 'FILIPINO'),

    fatherFullName: fFull || [fFn, fMn, fLn, fSuf].filter(Boolean).join(' ') || (fb.fatherFullName || ''),
    fatherFirstName: fFn || (fb.fatherFirstName || ''),
    fatherMiddleName: fMn || (fb.fatherMiddleName || ''),
    fatherLastName: fLn || (fb.fatherLastName || ''),
    fatherSuffix: fSuf || (fb.fatherSuffix || ''),

    motherMaidenFirstName: mFn || (fb.motherMaidenFirstName || ''),
    motherMaidenMiddleName: mMn || (fb.motherMaidenMiddleName || ''),
    motherMaidenLastName: mLn || (fb.motherMaidenLastName || ''),
    motherMaidenSuffix: mSuf || (fb.motherMaidenSuffix || ''),

    mobileNumber: a.phone || a.mobile || a.mobile_number || a.contact_number || (fb.mobileNumber || ''),
    emailAddress: a.email || (fb.emailAddress || ''),
    landline: a.landline || (fb.landline || ''),

    region: a.region || (fb.region || ''),
    province: a.province || (fb.province || ''),
    cityMunicipality: a.city || (fb.cityMunicipality || ''),
    barangay: a.barangay || (fb.barangay || ''),
    streetHouseNumber: a.street_address || a.residential_address || (fb.streetHouseNumber || ''),
    zipCode: a.zip_code || (fb.zipCode || ''),

    philsysId: a.philsys_id || a.philsys_card_number || (fb.philsysId || ''),
    tin: a.tin || a.tin_number || (fb.tin || ''),
    sssNumber: a.sss_number || (fb.sssNumber || ''),
    philhealthNumber: a.philhealth_number || (fb.philhealthNumber || ''),
    pagibigMid: a.pagibig_number || a.pagibigMid || (fb.pagibigMid || ''),
    passportNumber: a.passport_number || a.passportNumber || (fb.passportNumber || ''),
    relationshipToOwner: a.relationship || (fb as any).relationshipToOwner || 'Self',
  };
}

/**
 * Syncs the Citizen's Details with the GovGuide PH Web App API
 */
export async function syncVaultFromGovGuide(
  apiUrl: string,
  citizenId?: string,
  accessToken?: string
): Promise<CitizenVaultData> {
  const targetId = citizenId && citizenId !== '967760de-3912-5aaf-8ce9-48b2a8dd55f0' ? citizenId : 'active';
  const headers: Record<string, string> = {
    'x-extension-id': 'govguide-extension',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Candidate port fallback: if the configured port is unreachable, probe candidate dev ports
  const candidateUrls = [apiUrl];
  const commonPorts = ['3000', '3001', '3002', '3003', '3010', '3011', '3100'];
  for (const p of commonPorts) {
    const candidate = `http://localhost:${p}`;
    if (!candidateUrls.includes(candidate)) {
      candidateUrls.push(candidate);
    }
  }

  let lastError: Error | null = null;
  for (const base of candidateUrls) {
    try {
      const res = await fetch(`${base}/api/citizen/details?citizenId=${encodeURIComponent(targetId)}`, {
        headers,
      });
      if (!res.ok) {
        lastError = new Error(`GovGuide Sync error: ${res.statusText}`);
        continue;
      }
      const json = await res.json();
      if (json.ok && json.applicant) {
        const currentVault = await loadLocalVault();
        const syncedVault = applicantToVault(json.applicant, currentVault);

        await saveLocalVault(syncedVault);
        await saveSession({
          lastSyncedAt: new Date().toISOString(),
          citizenId: json.applicant.id || targetId,
          apiBaseUrl: base,
        });
        return syncedVault;
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('No applicant profile returned from GovGuide');
}
