import { describe, it, expect } from 'vitest';
import { getVaultValue, matchesRadioValue } from '../extension/src/content/detector';
import { DEFAULT_VAULT_DATA, applicantToVault } from '../extension/src/lib/vault';

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

  it('correctly resolves relationshipToOwner default and custom values', () => {
    expect(getVaultValue(DEFAULT_VAULT_DATA, 'relationshipToOwner')).toBe('Self');

    const customVault = { ...DEFAULT_VAULT_DATA, relationshipToOwner: 'Parent' };
    expect(getVaultValue(customVault, 'relationshipToOwner')).toBe('Parent');
  });

  it('accurately matches radio buttons without substring collisions (e.g. m vs female)', () => {
    // Gender radio matching
    expect(matchesRadioValue('gender', 'Female', 'FEMALE')).toBe(true);
    expect(matchesRadioValue('gender', 'Male', 'FEMALE')).toBe(false);
    expect(matchesRadioValue('gender', 'f', 'FEMALE')).toBe(true);
    expect(matchesRadioValue('gender', 'm', 'FEMALE')).toBe(false);
    expect(matchesRadioValue('gender', 'Male', 'MALE')).toBe(true);
    expect(matchesRadioValue('gender', 'Female', 'MALE')).toBe(false);

    // Civil Status radio matching
    expect(matchesRadioValue('civilStatus', 'Single', 'SINGLE')).toBe(true);
    expect(matchesRadioValue('civilStatus', 'Married', 'SINGLE')).toBe(false);
    expect(matchesRadioValue('civilStatus', 'Separated', 'SINGLE')).toBe(false);
    expect(matchesRadioValue('civilStatus', 'Married', 'MARRIED')).toBe(true);
    expect(matchesRadioValue('civilStatus', 'Single', 'MARRIED')).toBe(false);
  });

  it('correctly maps live My Details profile to extension autofill vault', () => {
    const liveProfile = {
      first_name: 'Juan',
      middle_name: 'Santos',
      last_name: 'Dela Cruz',
      phone: '0917-555-0192',
      father_first_name: 'Roberto',
      mother_maiden_name: 'Maria Gomez Santos',
      philsys_id: '1234-5678-9012-3456',
      city: 'Quezon City',
      barangay: 'Brgy. San Isidro',
    };

    const vault = applicantToVault(liveProfile);
    expect(vault.firstName).toBe('Juan');
    expect(vault.fatherFirstName).toBe('Roberto');
    expect(vault.philsysId).toBe('1234-5678-9012-3456');
    expect(vault.mobileNumber).toBe('0917-555-0192');
    expect(vault.relationshipToOwner).toBe('Self');
  });
});
