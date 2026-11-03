import { describe, it, expect } from 'vitest';
import {
  isDocumentGoodAndCorrect,
  shouldRequirementBeSkipped,
  matchDocumentToRequirement,
  reconcileChecklistWithVault,
} from '@/lib/citizen/checklists';
import {
  PROFILES,
  createCleanChecklists,
  createInitialChecklists,
  createInitialSavedFiles,
  createInitialInspections,
} from '@/lib/citizen/defaults';
import type {
  ApplicantProfile,
  SavedVaultFile,
  ChecklistRequirementItem,
} from '@/lib/services/charter-sources';

describe('My Details Document & Checklist Reconciliation (Auto-Check & Skip)', () => {
  const juan: ApplicantProfile = { ...PROFILES.jobseeker };
  const maria: ApplicantProfile = { ...PROFILES.married_applicant };

  function mockVaultFile(
    file: Partial<SavedVaultFile> & {
      id: string;
      name: string;
      document_type: string;
      service_code: string;
      status: SavedVaultFile['status'];
    }
  ): SavedVaultFile {
    return {
      size_label: '140 KB',
      mime_type: 'image/png',
      uploaded_at: '2026-10-30T10:00:00.000Z',
      ...file,
    };
  }

  it('identifies good and correct documents in My Details vault', () => {
    const validPhilsys = mockVaultFile({
      id: 'file-1',
      name: 'valid-philsys-id.png',
      document_type: 'PhilSys National ID (Primary ID)',
      service_code: 'PSA_BIRTH_CERT',
      status: 'counter_ready',
      issue_summary: '100% Counter-Ready · Matches My Details',
    });

    const expiredPostal = mockVaultFile({
      id: 'file-2',
      name: 'expired-postal-id.png',
      document_type: 'Philippine Postal ID (Primary ID)',
      service_code: 'NBI_CLEARANCE',
      status: 'issues_found',
      issue_summary: 'Expired (12 Mar 2025) · DOB Mismatch',
      discrepancy_what: 'Postal ID expired on 12 Mar 2025',
    });

    expect(isDocumentGoodAndCorrect(validPhilsys)).toBe(true);
    expect(isDocumentGoodAndCorrect(expiredPostal)).toBe(false);
  });

  it('automatically skips representative and non-applicable requirements based on profile', () => {
    const spaReq: ChecklistRequirementItem = {
      id: 'psa-spa',
      service_code: 'PSA_BIRTH_CERT',
      name: 'Special Power of Attorney (SPA) o Authorization Letter',
      description: 'Kailangan kung hindi ang may-ari ang kukuha',
      required: true,
      appliesTo: 'representative',
      status: 'pending',
    };

    const marriageReq: ChecklistRequirementItem = {
      id: 'dfa-marriage',
      service_code: 'DFA_PASSPORT',
      name: 'PSA Marriage Certificate',
      description: 'Para sa may-asawang babae na nais gamitin ang apelyido ng asawa',
      required: false,
      appliesTo: 'all',
      status: 'pending',
    };

    const seniorReq: ChecklistRequirementItem = {
      id: 'philhealth-senior',
      service_code: 'PHILHEALTH_REGISTRATION',
      name: 'Senior Citizen OSCA ID o DSWD Indigency Certificate',
      description: 'Para sa 100% subsidized premium ng pamahalaan',
      required: true,
      appliesTo: 'senior',
      status: 'pending',
    };

    // Juan is Single, age 27, applying personally
    const spaResult = shouldRequirementBeSkipped(spaReq, juan);
    expect(spaResult.skipped).toBe(true);
    expect(spaResult.reason).toContain('Personal Application');

    const marriageResultJuan = shouldRequirementBeSkipped(marriageReq, juan);
    expect(marriageResultJuan.skipped).toBe(true);
    expect(marriageResultJuan.reason).toContain('Single applicant');

    const seniorResultJuan = shouldRequirementBeSkipped(seniorReq, juan);
    expect(seniorResultJuan.skipped).toBe(true);
    expect(seniorResultJuan.reason).toContain('Senior Citizen');

    // Maria is Married -> Marriage Cert should NOT be skipped
    const marriageResultMaria = shouldRequirementBeSkipped(marriageReq, maria);
    expect(marriageResultMaria.skipped).toBe(false);
  });

  it('automatically checks checklist items when documents in My Details are good and correct', () => {
    const files: SavedVaultFile[] = [
      mockVaultFile({
        id: 'file-philsys',
        name: 'valid-philsys-id.png',
        document_type: 'PhilSys National ID (Primary ID)',
        service_code: 'PSA_BIRTH_CERT',
        status: 'counter_ready',
        issue_summary: '100% Counter-Ready · Matches My Details',
      }),
    ];

    const psaPrimaryIdReq: ChecklistRequirementItem = {
      id: 'PSA_BIRTH_CERT-req-2',
      service_code: 'PSA_BIRTH_CERT',
      name: 'Isang (1) Valid Primary Government ID',
      description: 'PhilSys National ID, Passport, Driver’s License, UMID, o PRC ID.',
      isPrimaryId: true,
      required: true,
      appliesTo: 'all',
      status: 'pending',
    };

    const dfaPhotoIdReq: ChecklistRequirementItem = {
      id: 'DFA_PASSPORT-req-3',
      service_code: 'DFA_PASSPORT',
      name: 'Isang (1) Valid Government-Issued Photo ID',
      description: 'PhilSys National ID, SSS/GSIS UMID, Driver’s License, PRC ID.',
      isPrimaryId: true,
      required: true,
      appliesTo: 'all',
      status: 'pending',
    };

    const matchPsa = matchDocumentToRequirement(psaPrimaryIdReq, files);
    expect(matchPsa.matched).toBe(true);
    expect(matchPsa.note).toContain('PhilSys National ID');

    const matchDfa = matchDocumentToRequirement(dfaPhotoIdReq, files);
    expect(matchDfa.matched).toBe(true);
    expect(matchDfa.note).toContain('PhilSys National ID');
  });

  it('reconciles entire checklist: checks good documents and skips non-applicable requirements', () => {
    const rawChecklists = createCleanChecklists();
    const vaultFiles: SavedVaultFile[] = [
      mockVaultFile({
        id: 'file-philsys',
        name: 'valid-philsys-id.png',
        document_type: 'PhilSys National ID (Primary ID)',
        service_code: 'PSA_BIRTH_CERT',
        status: 'counter_ready',
        issue_summary: '100% Counter-Ready · Matches My Details',
      }),
      mockVaultFile({
        id: 'file-postal',
        name: 'expired-postal-id.png',
        document_type: 'Philippine Postal ID (Primary ID)',
        service_code: 'NBI_CLEARANCE',
        status: 'issues_found',
        issue_summary: 'Postal ID Expired (12 Mar 2025) & Birth Date Mismatch',
      }),
    ];

    const reconciled = reconcileChecklistWithVault(rawChecklists, juan, vaultFiles);

    // 1. PSA Primary ID should be checked
    const psaPrimaryId = reconciled.find((i) => i.id === 'PSA_BIRTH_CERT-req-2');
    expect(psaPrimaryId?.status).toBe('verified');
    expect(psaPrimaryId?.issue_note).toContain('Verified via My Details');

    // 2. PSA SPA & Owner ID should be skipped
    const psaSpa = reconciled.find((i) => i.id === 'PSA_BIRTH_CERT-req-3');
    const psaOwnerId = reconciled.find((i) => i.id === 'PSA_BIRTH_CERT-req-4');
    expect(psaSpa?.status).toBe('skipped');
    expect(psaOwnerId?.status).toBe('skipped');

    // 3. DFA Photo ID should be checked (PhilSys is a valid Primary ID)
    const dfaId = reconciled.find((i) => i.id === 'DFA_PASSPORT-req-3');
    expect(dfaId?.status).toBe('verified');

    // 4. DFA Marriage Cert should be skipped for Juan (Single)
    const dfaMarriage = reconciled.find((i) => i.id === 'DFA_PASSPORT-req-4');
    expect(dfaMarriage?.status).toBe('skipped');

    // 5. PhilHealth Primary ID should be checked
    const philhealthId = reconciled.find((i) => i.id === 'PHILHEALTH_REGISTRATION-req-2');
    expect(philhealthId?.status).toBe('verified');

    // 6. PhilHealth Senior ID should be skipped
    const philhealthSenior = reconciled.find((i) => i.id === 'PHILHEALTH_REGISTRATION-req-5');
    expect(philhealthSenior?.status).toBe('skipped');

    // 7. NBI Postal ID issue is retained because Postal ID is flagged as issues_found
    const nbiId = reconciled.find((i) => i.id === 'NBI_CLEARANCE-req-1');
    expect(nbiId?.status).toBe('issue');
  });

  it('updates checklist to checked when an issue document is replaced with a good & correct document', () => {
    const rawChecklists = createCleanChecklists();

    // Initial state: Postal ID has issue
    const initialFiles: SavedVaultFile[] = [
      mockVaultFile({
        id: 'file-postal',
        name: 'expired-postal-id.png',
        document_type: 'Philippine Postal ID (Primary ID)',
        service_code: 'NBI_CLEARANCE',
        status: 'issues_found',
        issue_summary: 'Expired Postal ID',
      }),
    ];

    const initialReconciled = reconcileChecklistWithVault(rawChecklists, juan, initialFiles);
    const nbiIdBefore = initialReconciled.find((i) => i.id === 'NBI_CLEARANCE-req-1');
    expect(nbiIdBefore?.status).toBe('issue');

    // Corrected state: User uploaded a renewed, good & correct DFA Passport and PhilSys ID
    const correctedFiles: SavedVaultFile[] = [
      mockVaultFile({
        id: 'file-passport',
        name: 'valid-dfa-passport.png',
        document_type: 'DFA Passport (Primary ID)',
        service_code: 'NBI_CLEARANCE',
        status: 'counter_ready',
        issue_summary: 'All goods',
      }),
      mockVaultFile({
        id: 'file-philsys',
        name: 'valid-philsys-id.png',
        document_type: 'PhilSys National ID (Primary ID)',
        service_code: 'NBI_CLEARANCE',
        status: 'counter_ready',
        issue_summary: 'All goods',
      }),
    ];

    const correctedReconciled = reconcileChecklistWithVault(rawChecklists, juan, correctedFiles);
    const nbiIdAfter = correctedReconciled.find((i) => i.id === 'NBI_CLEARANCE-req-1');
    expect(nbiIdAfter?.status).toBe('verified');
    expect(nbiIdAfter?.issue_note).toContain('2 Valid Primary IDs Verified in My Details');
  });
});
