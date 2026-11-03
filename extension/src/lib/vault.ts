/**
 * GovGuide PH — Citizen Vault Manager & GovGuide Online Bridge
 */

import { encryptVault, decryptVault } from './crypto';
import type { CitizenVaultData, ExtensionSession } from '../types';

export const STORAGE_VAULT_KEY = 'govguide_citizen_vault_encrypted';
export const STORAGE_SESSION_KEY = 'govguide_extension_session';

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
  userRole: 'citizen',
  citizenId: 'active',
  officerName: 'Consular Officer Maria Teresa Gomez',
  agencyCode: 'DFA',
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
          // If decryption fails, fallback to defaults
        }
      }
      resolve(DEFAULT_VAULT_DATA);
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
 */
export function applicantToVault(a: any, fallbackVault?: CitizenVaultData): CitizenVaultData {
  const base = fallbackVault || DEFAULT_VAULT_DATA;
  if (!a || typeof a !== 'object') return base;

  // Derive name parts
  let fn = a.first_name || '';
  let mn = a.middle_name || '';
  let ln = a.last_name || '';
  let suf = a.suffix || '';

  if (!fn && a.display_name && a.display_name.trim()) {
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
  let fFn = a.father_first_name || '';
  let fMn = a.father_middle_name || '';
  let fLn = a.father_last_name || '';
  let fSuf = a.father_suffix || '';
  const fFull = a.father_name || '';
  if (!fFn && fFull && fFull.trim()) {
    const parts = fFull.trim().split(/\s+/);
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
  let mFn = a.mother_first_name || '';
  let mMn = a.mother_middle_name || '';
  let mLn = a.mother_last_name || a.maiden_name || '';
  let mSuf = a.mother_suffix || '';
  const mFull = a.mother_maiden_name || '';
  if (!mFn && mFull && mFull.trim()) {
    const parts = mFull.trim().split(/\s+/);
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

  return {
    firstName: fn || base.firstName,
    middleName: mn || base.middleName,
    lastName: ln || base.lastName,
    suffix: suf || base.suffix,
    gender: a.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
    dateOfBirth: a.birth_date || a.date_of_birth || base.dateOfBirth,
    placeOfBirth: a.place_of_birth || (a.city ? `${a.city}, Philippines` : base.placeOfBirth),
    civilStatus: (a.civil_status?.toUpperCase() as any) || base.civilStatus,
    nationality: a.nationality || 'FILIPINO',

    fatherFullName: fFull || [fFn, fMn, fLn, fSuf].filter(Boolean).join(' ') || base.fatherFullName,
    fatherFirstName: fFn || base.fatherFirstName,
    fatherMiddleName: fMn || base.fatherMiddleName,
    fatherLastName: fLn || base.fatherLastName,
    fatherSuffix: fSuf || base.fatherSuffix,

    motherMaidenFirstName: mFn || base.motherMaidenFirstName,
    motherMaidenMiddleName: mMn || base.motherMaidenMiddleName,
    motherMaidenLastName: mLn || base.motherMaidenLastName,
    motherMaidenSuffix: mSuf || base.motherMaidenSuffix,

    mobileNumber: a.contact_number || a.phone || base.mobileNumber,
    emailAddress: a.email || base.emailAddress,
    landline: a.landline || base.landline,

    region: a.region || base.region,
    province: a.province || base.province,
    cityMunicipality: a.city || base.cityMunicipality,
    barangay: a.barangay || base.barangay,
    streetHouseNumber: a.street_address || a.residential_address || base.streetHouseNumber,
    zipCode: a.zip_code || base.zipCode,

    philsysId: a.philsys_id || a.philsys_card_number || base.philsysId,
    tin: a.tin || a.tin_number || base.tin,
    sssNumber: a.sss_number || base.sssNumber,
    philhealthNumber: a.philhealth_number || base.philhealthNumber,
    pagibigMid: a.pagibig_number || base.pagibigMid,
    passportNumber: a.passport_number || base.passportNumber,
  };
}

/**
 * Syncs the Citizen's Details with the GovGuide PH Web App API
 */
export async function syncVaultFromGovGuide(apiUrl: string, citizenId?: string): Promise<CitizenVaultData> {
  const targetId = citizenId && citizenId !== '967760de-3912-5aaf-8ce9-48b2a8dd55f0' ? citizenId : 'active';
  const res = await fetch(`${apiUrl}/api/citizen/details?citizenId=${encodeURIComponent(targetId)}`);
  if (!res.ok) {
    throw new Error(`GovGuide Sync error: ${res.statusText}`);
  }
  const json = await res.json();
  if (json.ok && json.applicant) {
    const currentVault = await loadLocalVault();
    const syncedVault = applicantToVault(json.applicant, currentVault);

    await saveLocalVault(syncedVault);
    await saveSession({
      lastSyncedAt: new Date().toISOString(),
      citizenId: json.applicant.id || targetId,
    });
    return syncedVault;
  }
  throw new Error('No applicant profile returned from GovGuide');
}
