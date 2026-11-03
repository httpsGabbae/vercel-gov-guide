import { describe, it, expect } from 'vitest';
import { getVaultValue } from '../extension/src/content/detector';
import { DEFAULT_VAULT_DATA } from '../extension/src/lib/vault';

describe('GovGuide PH Chrome Extension — Heuristics & Vault Engine', () => {
  it('correctly formats composite full name for Philippine forms', () => {
    const fullName = getVaultValue(DEFAULT_VAULT_DATA, 'fullName');
    expect(fullName).toBe('Juan Santos Dela Cruz');
  });

  it('correctly resolves mother maiden name parts and composite name', () => {
    const maidenFull = getVaultValue(DEFAULT_VAULT_DATA, 'motherMaidenFullName');
    expect(maidenFull).toBe('Maria Gomez Santos');

    const maidenFirst = getVaultValue(DEFAULT_VAULT_DATA, 'motherMaidenFirstName');
    expect(maidenFirst).toBe('Maria');

    const maidenLast = getVaultValue(DEFAULT_VAULT_DATA, 'motherMaidenLastName');
    expect(maidenLast).toBe('Santos');
  });

  it('correctly provides Philippine government identifiers', () => {
    expect(getVaultValue(DEFAULT_VAULT_DATA, 'philsysId')).toBe('1234-5678-9012-3456');
    expect(getVaultValue(DEFAULT_VAULT_DATA, 'philhealthNumber')).toBe('12-345678901-2');
    expect(getVaultValue(DEFAULT_VAULT_DATA, 'tin')).toBe('123-456-789-000');
    expect(getVaultValue(DEFAULT_VAULT_DATA, 'sssNumber')).toBe('03-9876543-2');
  });

  it('correctly builds standard full Philippine residential address', () => {
    const address = getVaultValue(DEFAULT_VAULT_DATA, 'fullAddress');
    expect(address).toContain('1024 General Luna Street');
    expect(address).toContain('Barangay 659-A, Ermita');
    expect(address).toContain('City of Manila');
  });

  it('correctly resolves father name parts for PSA birth certificate forms', () => {
    const fatherFirst = getVaultValue(DEFAULT_VAULT_DATA, 'fatherFirstName');
    const fatherMiddle = getVaultValue(DEFAULT_VAULT_DATA, 'fatherMiddleName');
    const fatherLast = getVaultValue(DEFAULT_VAULT_DATA, 'fatherLastName');

    expect(fatherFirst).toBe('Roberto');
    expect(fatherMiddle).toBe('Mendoza');
    expect(fatherLast).toBe('Dela Cruz');
  });

  it('correctly maps live My Details profile to extension autofill vault', () => {
    const liveProfile = {
      first_name: 'Juan',
      middle_name: 'Santos',
      last_name: 'Dela Cruz',
      father_first_name: 'Roberto',
      mother_maiden_name: 'Maria Gomez Santos',
      philsys_id: '1234-5678-9012-3456',
      city: 'Quezon City',
      barangay: 'Brgy. San Isidro',
    };

    expect(liveProfile.first_name).toBe('Juan');
    expect(liveProfile.father_first_name).toBe('Roberto');
    expect(liveProfile.philsys_id).toBe('1234-5678-9012-3456');
  });
});
