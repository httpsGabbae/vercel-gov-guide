'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type {
  ApplicantProfile,
  CharterSourceDoc,
  ChecklistRequirementItem,
  ExtractedField,
  InspectionReport,
  SavedVaultFile,
} from '@/lib/services/charter-sources';
import { CHARTER_SOURCES, formatFullName, parseNameParts, parseAddressParts } from '@/lib/services/charter-sources';
import { redactSecrets, type GuardrailCardData } from '@/lib/ai/guardrails';
import { SERVICES_REGISTRY } from '@/lib/services/registry';
import { AgentResponseView } from '@/components/chat/AgentResponseView';
import { ExpenseReceiptCard } from '@/components/chat/ExpenseReceiptCard';
import { OnlineApplicationCard } from '@/components/chat/OnlineApplicationCard';
import {
  evaluateOnlineReadiness,
  type OnlineApplicationData,
} from '@/lib/services/online-services';
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';
import { RemediationBranchDrawer, type RemediationBranchData } from '@/components/chat/RemediationBranchDrawer';
import { GmailNotificationsView } from '@/components/chat/GmailNotificationsView';
import { OfficialPsaBirthCertForm } from '@/components/forms/OfficialPsaBirthCertForm';
import { DfaAppointmentView } from '@/components/dfa/DfaAppointmentView';
import { DpwhProjectsView } from '@/components/dpwh/DpwhProjectsView';
import { RequestStatusSection } from '@/components/citizen/RequestStatusSection';
import { type CitizenServiceRequest, getCitizenRequests } from '@/lib/citizen/requests';
import { parseResponseJson, safeResponseJson } from '@/lib/utils';
import {
  reconcileChecklistWithVault,
  shouldRequirementBeSkipped,
  matchDocumentToRequirement,
  isDocumentGoodAndCorrect,
} from '@/lib/citizen/checklists';

/* -------------------------------------------------------------------------- */
/*  Icons (Matching GovGuide PH 1.75px stroke SVG icon set)                   */
/* -------------------------------------------------------------------------- */

function Icon({
  size = 16,
  stroke = 1.75,
  children,
}: {
  size?: number;
  stroke?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Icons = {
  chat: (
    <Icon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Icon>
  ),
  referral: (
    <Icon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13l2 2 4-4" />
    </Icon>
  ),
  tasks: (
    <Icon>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
    </Icon>
  ),
  log: (
    <Icon>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  ),
  sidebar: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
    </Icon>
  ),
  menu: (
    <Icon size={18}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  ),
  bell: (
    <Icon>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  send: (
    <Icon stroke={2}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Icon>
  ),
  chevronDown: (
    <Icon size={12} stroke={2.25}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  ),
  chevronRight: (
    <Icon size={14} stroke={2.25}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  ),
  check: (
    <Icon size={14} stroke={2.5}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  ),
  close: (
    <Icon size={14} stroke={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  ),
  alert: (
    <Icon size={16}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17.2v.1" />
    </Icon>
  ),
  trash: (
    <Icon size={14}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Icon>
  ),
  doc: (
    <Icon size={12} stroke={2}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Icon>
  ),
  docLg: (
    <Icon size={16}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Icon>
  ),
  help: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7" />
      <path d="M12 17.2v.1" />
    </Icon>
  ),
  search: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Icon>
  ),
  upload: (
    <Icon>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </Icon>
  ),
  image: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-9 9" />
    </Icon>
  ),
  lock: (
    <Icon size={14}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  ),
  user: (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Icon>
  ),
  receipt: (
    <Icon>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-8" />
      <path d="M16 12h-8" />
      <path d="M13 16h-5" />
    </Icon>
  ),
  passport: (
    <Icon size={14}>
      <rect width="16" height="20" x="4" y="2" rx="2" stroke="currentColor" fill="none" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" fill="none" />
      <path d="M12 16h.01" stroke="currentColor" strokeWidth={2.5} />
    </Icon>
  ),
  construction: (
    <Icon size={14}>
      <path d="M2 20h20M5 20v-8a7 7 0 0 1 14 0v8M12 5V2" stroke="currentColor" fill="none" />
      <path d="M9 13h6" stroke="currentColor" />
    </Icon>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Logo Mark Component (Cropped Text-Free GovGuidePH Emblem)                 */
/* -------------------------------------------------------------------------- */

function LogoMark({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo-mark.png"
        alt="GovGuidePH"
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Demo Applicant Profiles & Initial Data                                    */
/* -------------------------------------------------------------------------- */

const PROFILES: Record<'jobseeker' | 'married_applicant' | 'new_citizen', ApplicantProfile> = {
  jobseeker: {
    id: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    role: 'jobseeker',
    display_name: 'Juan Santos Dela Cruz',
    initials: 'JD',
    title: 'First-Time Jobseeker (RA 11261)',
    birth_date: '1999-05-14',
    civil_status: 'Single',
    barangay: 'Brgy. San Isidro',
    city: 'Quezon City',
  },
  married_applicant: {
    id: 'cc31a4a1-22f4-5dfb-9fe5-52fbd69e3ee1',
    role: 'married_applicant',
    display_name: 'Maria Clara Reyes-Santos',
    initials: 'MR',
    title: 'Married Applicant · Renewal & Civil Registry',
    birth_date: '1994-11-22',
    civil_status: 'Married',
    barangay: 'Brgy. Poblacion',
    city: 'Makati City',
    maiden_name: 'Maria Clara Reyes',
  },
  new_citizen: {
    id: 'e1000000-0000-4000-8000-000000000003',
    role: 'new_citizen',
    display_name: '',
    initials: '',
    title: 'Guest Account',
    birth_date: '',
    civil_status: '',
    barangay: '',
    city: '',
    notes: '',
  },
};

function createCleanChecklists(): ChecklistRequirementItem[] {
  const list: ChecklistRequirementItem[] = [];
  Object.values(SERVICES_REGISTRY).forEach((svc) => {
    svc.requirements.forEach((req, idx) => {
      list.push({
        id: `${svc.code}-req-${idx + 1}`,
        service_code: svc.code,
        name: req.name,
        description: req.description,
        required: req.required,
        isPrimaryId: req.isPrimaryId,
        appliesTo: req.appliesTo,
        status: 'pending',
      });
    });
  });
  return list;
}

function createInitialChecklists(): ChecklistRequirementItem[] {
  const list: ChecklistRequirementItem[] = [];
  Object.values(SERVICES_REGISTRY).forEach((svc) => {
    svc.requirements.forEach((req, idx) => {
      const id = `${svc.code}-req-${idx + 1}`;
      let status: 'pending' | 'verified' | 'issue' | 'skipped' = 'pending';
      let issue_note: string | undefined;

      if (svc.code === 'NBI_CLEARANCE' && idx === 0) {
        status = 'issue';
        issue_note = 'Postal ID Expired (12 Mar 2025) & Birth Date Mismatch';
      } else if (svc.code === 'NBI_CLEARANCE' && idx === 1) {
        status = 'verified';
        issue_note = 'Online Ref #NBI-2026-••••820 Verified';
      } else if (svc.code === 'NBI_CLEARANCE' && idx === 2) {
        status = 'issue';
        issue_note = 'Barangay Cert >90 Days Old & Missing Dry Seal';
      } else if (svc.code === 'PSA_BIRTH_CERT' && idx === 0) {
        status = 'verified';
        issue_note = 'CRS Appointment Slip Confirmed';
      } else if (svc.code === 'PSA_BIRTH_CERT' && idx === 1) {
        status = 'verified';
        issue_note = 'Verified via My Details: PhilSys National ID (All goods)';
      } else if (svc.code === 'PSA_BIRTH_CERT' && (idx === 2 || idx === 3)) {
        status = 'skipped';
        issue_note = 'Skipped · Personal Application (Hindi kailangan ng SPA o Kinatawan)';
      } else if (svc.code === 'DFA_PASSPORT' && idx === 2) {
        status = 'verified';
        issue_note = 'Verified via My Details: PhilSys National ID (All goods)';
      } else if (svc.code === 'DFA_PASSPORT' && idx === 3) {
        status = 'skipped';
        issue_note = 'Skipped · Hindi kailangan para sa Single applicant';
      } else if (svc.code === 'PHILHEALTH_REGISTRATION' && idx === 1) {
        status = 'verified';
        issue_note = 'Verified via My Details: PhilSys National ID (All goods)';
      } else if (svc.code === 'PHILHEALTH_REGISTRATION' && idx === 3) {
        status = 'skipped';
        issue_note = 'Skipped · Hindi kailangan para sa Single applicant (Walang asawa/dependents)';
      } else if (svc.code === 'PHILHEALTH_REGISTRATION' && idx === 4) {
        status = 'skipped';
        issue_note = 'Skipped · Para lamang sa Senior Citizen o Indigent';
      } else if (req.appliesTo === 'representative') {
        status = 'skipped';
        issue_note = 'Skipped · Personal Application (Hindi kailangan ng SPA)';
      }

      list.push({
        id,
        service_code: svc.code,
        name: req.name,
        description: req.description,
        required: req.required,
        isPrimaryId: req.isPrimaryId,
        appliesTo: req.appliesTo,
        status,
        issue_note,
      });
    });
  });
  return list;
}

function createInitialInspections(): InspectionReport[] {
  return [
    {
      id: 'insp-1001',
      document_title: 'Philippine Postal Identification Card',
      file_name: 'expired-postal-id.png',
      service_code: 'NBI_CLEARANCE',
      service_name: 'NBI Clearance (First-Time Jobseeker & Regular)',
      applicant_name: 'Juan Santos Dela Cruz',
      inspected_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
      overall_status: 'issues_found',
      summary_counts: { expired: 1, mismatch: 1, missing: 1, valid: 1 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · PHLPOST PRIMARY ID',
        'PRN: PST-••••-4120 [RA 10173 MASKED]',
        'NAME: DELA CRUZ, JUAN SANTOS',
        'DOB ON ID: 1999-08-14 [!= PSA BIRTH CERT: 1999-05-14]',
        'VALID UNTIL: 12 MAR 2025 [EXPIRED]',
        'SIGNATURE: [MISSING ON CARD]',
      ],
      issues: [
        {
          id: 'iss-1',
          category: 'expired',
          severity: 'critical',
          title: 'Expired Primary ID (12 Mar 2025)',
          detail: 'Postal ID expired on 12 Mar 2025. NBI counters strictly reject expired IDs.',
          field_key: 'expiry_date',
          charter_rule: 'NBI Citizen’s Charter > Unexpired Primary Government ID required.',
          source_id: 'src-nbi-2025',
        },
        {
          id: 'iss-2',
          category: 'mismatch',
          severity: 'critical',
          title: 'Birth Date Mismatch (Aug 14 vs May 14, 1999)',
          detail:
            'ID shows 1999-08-14 while PSA Birth Certificate & Applicant Profile state 1999-05-14.',
          field_key: 'birth_date',
          charter_rule: 'NBI Data Consistency Rule > Must match PSA Birth Certificate.',
          source_id: 'src-nbi-2025',
        },
        {
          id: 'iss-3',
          category: 'missing',
          severity: 'warning',
          title: 'Missing Cardholder Signature & 2nd Primary ID',
          detail: 'Signature block is blank and NBI requires 2 valid Primary IDs.',
          field_key: 'signature_status',
          charter_rule: 'NBI Citizen’s Charter > 2 Valid IDs with photo & signature.',
          source_id: 'src-nbi-2025',
        },
      ],
      fields: [
        { key: 'full_name', label: 'Full Name', value: 'Juan Santos Dela Cruz', status: 'valid' },
        {
          key: 'birth_date',
          label: 'Date of Birth',
          value: '1999-08-14',
          expected: '1999-05-14',
          status: 'mismatch',
          note: 'Mismatch vs PSA (1999-05-14)',
        },
        {
          key: 'expiry_date',
          label: 'Expiration Date',
          value: '2025-03-12',
          expected: 'Unexpired',
          status: 'expired',
          note: 'Expired',
        },
        {
          key: 'signature_status',
          label: 'Card Signature',
          value: 'Blank / Missing',
          expected: 'Signed',
          status: 'missing',
          note: 'Missing Signature',
        },
      ],
      source_id: 'src-nbi-2025',
    },
    {
      id: 'insp-1002',
      document_title: 'Barangay Certification (First-Time Jobseeker · RA 11261)',
      file_name: 'incomplete-brgy-cert.png',
      service_code: 'NBI_CLEARANCE',
      service_name: 'NBI Clearance (First-Time Jobseeker & Regular)',
      applicant_name: 'Juan Santos Dela Cruz',
      inspected_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
      overall_status: 'issues_found',
      summary_counts: { expired: 1, mismatch: 0, missing: 2, valid: 1 },
      preview_lines: [
        'BARANGAY SAN ISIDRO · QUEZON CITY',
        'FIRST-TIME JOBSEEKER CERTIFICATION (RA 11261)',
        'ISSUED: 10 MAY 2026 [OVER 90 DAYS OLD - EXPIRED]',
        'OATH OF UNDERTAKING: [UNSIGNED]',
        'BARANGAY DRY SEAL: [MISSING]',
      ],
      issues: [
        {
          id: 'iss-b1',
          category: 'expired',
          severity: 'critical',
          title: 'Expired Barangay Certification (>90 Days Old)',
          detail: 'Issued 10 May 2026. RA 11261 certifications expire 90 days after issuance.',
          field_key: 'issue_date',
          charter_rule: 'RA 11261 & NBI Charter > Valid within 90 days from issuance.',
          source_id: 'src-nbi-2025',
        },
        {
          id: 'iss-b2',
          category: 'missing',
          severity: 'critical',
          title: 'Missing Barangay Dry Seal & Oath Signature',
          detail: 'No embossed Barangay Dry Seal detected and Oath of Undertaking is unsigned.',
          field_key: 'dry_seal',
          charter_rule: 'RA 11261 > Requires Official Barangay Dry Seal and signed Oath.',
          source_id: 'src-nbi-2025',
        },
      ],
      fields: [
        { key: 'full_name', label: 'Applicant Name', value: 'Juan Santos Dela Cruz', status: 'valid' },
        {
          key: 'issue_date',
          label: 'Date Issued',
          value: '2026-05-10',
          status: 'expired',
          note: 'Expired (>90 days)',
        },
        {
          key: 'dry_seal',
          label: 'Barangay Dry Seal',
          value: 'Missing',
          status: 'missing',
          note: 'Missing Seal',
        },
        {
          key: 'oath_signature',
          label: 'Oath Signature',
          value: 'Unsigned',
          status: 'missing',
          note: 'Missing Info',
        },
      ],
      source_id: 'src-nbi-2025',
    },
    {
      id: 'insp-1003',
      document_title: 'PhilSys National ID (Pambansang Pagkakakilanlan)',
      file_name: 'valid-philsys-id.png',
      service_code: 'PSA_BIRTH_CERT',
      service_name: 'PSA Birth Certificate (SECPA Copy)',
      applicant_name: 'Juan Santos Dela Cruz',
      inspected_at: new Date(Date.now() - 3600_000 * 18).toISOString(),
      overall_status: 'counter_ready',
      summary_counts: { expired: 0, mismatch: 0, missing: 0, valid: 4 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · PHILSYS NATIONAL ID',
        'PCN: 4928-••••-••••-9104 [RA 10173 MASKED]',
        'NAME: DELA CRUZ, JUAN SANTOS',
        'DOB: 1999-05-14 (MATCHES PSA SECPA)',
        'VALIDITY: PERMANENT / NON-EXPIRING',
      ],
      issues: [
        {
          id: 'iss-p1',
          category: 'valid',
          severity: 'ok',
          title: '100% Counter-Ready Primary ID',
          detail: 'Non-expiring under RA 11055; name and birth date match applicant profile.',
          field_key: 'validity',
          charter_rule: 'PSA Citizen’s Charter > Accepted Primary ID',
          source_id: 'src-psa-2025',
        },
      ],
      fields: [
        { key: 'full_name', label: 'Full Name', value: 'Juan Santos Dela Cruz', status: 'valid' },
        { key: 'birth_date', label: 'Date of Birth', value: '1999-05-14', status: 'valid' },
        { key: 'validity', label: 'Validity', value: 'Permanent (RA 11055)', status: 'valid' },
      ],
      source_id: 'src-psa-2025',
    },
  ];
}


function createInitialSavedFiles(): SavedVaultFile[] {
  return [
    {
      id: 'file-philsys-01',
      name: 'valid-philsys-id.png',
      document_type: 'PhilSys National ID (Primary ID)',
      service_code: 'PSA_BIRTH_CERT',
      size_label: '142 KB',
      mime_type: 'image/png',
      preview_url: '/demo/valid-philsys-id.png',
      uploaded_at: new Date(Date.now() - 3600_000 * 18).toISOString(),
      status: 'counter_ready',
      issue_summary: 'All goods',
      extracted_name: 'Juan Santos Dela Cruz',
      extracted_dob: '1999-05-14',
      expiry_date: 'Permanent (RA 11055)',
    },
    {
      id: 'file-postal-02',
      name: 'expired-postal-id.png',
      document_type: 'Philippine Postal ID (Primary ID)',
      service_code: 'NBI_CLEARANCE',
      size_label: '158 KB',
      mime_type: 'image/png',
      preview_url: '/demo/expired-postal-id.png',
      uploaded_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
      status: 'issues_found',
      issue_summary: 'Expired (12 Mar 2025), DOB Mismatch & Blank Signature',
      discrepancy_what:
        'ID expired on 12 Mar 2025, DOB listed as 1999-08-14 conflicts with your profile (1999-05-14), and signature block is blank.',
      discrepancy_how_to_fix:
        'Renew your Postal ID at any PhilPost post office branch, or present an alternative unexpired Primary ID (such as PhilSys National ID or DFA Passport).',
      extracted_name: 'Juan Santos Dela Cruz',
      extracted_dob: '1999-08-14',
      expiry_date: '2025-03-12 (Expired)',
    },
    {
      id: 'file-brgy-03',
      name: 'incomplete-brgy-cert.png',
      document_type: 'Barangay Jobseeker Certificate (RA 11261)',
      service_code: 'NBI_CLEARANCE',
      size_label: '164 KB',
      mime_type: 'image/png',
      preview_url: '/demo/incomplete-brgy-cert.png',
      uploaded_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
      status: 'issues_found',
      issue_summary: 'Expired (>90 Days), Missing Dry Seal & Unsigned Oath',
      discrepancy_what:
        'Certificate was issued over 90 days ago (10 May 2026), missing embossed Barangay Dry Seal, and Oath of Undertaking is unsigned.',
      discrepancy_how_to_fix:
        'Visit Barangay San Isidro Hall to obtain a new First-Time Jobseeker Certificate with an embossed Dry Seal and sign the Oath of Undertaking.',
      extracted_name: 'Juan Santos Dela Cruz',
      extracted_dob: '1999-05-14',
      expiry_date: '2026-05-10 (>90 Days Old)',
    },
  ];
}

interface AuditEntry {
  id: string;
  ts: string;
  user_name: string;
  role: string;
  action: string;
  tool: string | null;
  document_name: string | null;
  reason: string | null;
  outcome: 'counter_ready' | 'flagged_issue' | 'verified';
  flagged: boolean;
  prev_hash: string | null;
  hash: string;
}

function computeHash(input: string): string {
  let h = 0x811c9dc5;
  let out = '';
  for (let pass = 0; out.length < 64; pass++) {
    const str = input + pass;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

function createInitialAuditLogs(): AuditEntry[] {
  const raw = [
    {
      ts: new Date(Date.now() - 3600_000 * 24).toISOString(),
      user_name: 'Juan Santos Dela Cruz',
      role: 'Citizen',
      action: 'Generated NBI Clearance Requirements Checklist',
      tool: 'get_service_requirements',
      document_name: 'NBI Clearance Charter',
      reason: 'First-Time Jobseeker (RA 11261) pre-flight check',
      outcome: 'verified' as const,
      flagged: false,
    },
    {
      ts: new Date(Date.now() - 3600_000 * 18).toISOString(),
      user_name: 'Juan Santos Dela Cruz',
      role: 'Citizen',
      action: 'Inspected PhilSys National ID (Ephemeral RA 10173 Check)',
      tool: 'inspect_document',
      document_name: 'valid-philsys-id.png',
      reason: '0 expired, 0 mismatched, 0 missing fields',
      outcome: 'counter_ready' as const,
      flagged: false,
    },
    {
      ts: new Date(Date.now() - 3600_000 * 5).toISOString(),
      user_name: 'Juan Santos Dela Cruz',
      role: 'Citizen',
      action: 'Inspected Barangay Jobseeker Certificate (RA 11261)',
      tool: 'inspect_document',
      document_name: 'incomplete-brgy-cert.png',
      reason: 'Flagged: Expired (>90 days), Missing Dry Seal & Oath Signature',
      outcome: 'flagged_issue' as const,
      flagged: true,
    },
    {
      ts: new Date(Date.now() - 3600_000 * 2).toISOString(),
      user_name: 'Juan Santos Dela Cruz',
      role: 'Citizen',
      action: 'Inspected Philippine Postal ID',
      tool: 'inspect_document',
      document_name: 'expired-postal-id.png',
      reason: 'Flagged: Expired 12 Mar 2025, DOB Mismatch (Aug 14 vs May 14), Missing Signature',
      outcome: 'flagged_issue' as const,
      flagged: true,
    },
  ];

  let prev: string | null = null;
  return raw
    .map((item, idx) => {
      const id = `log-${String(idx + 1).padStart(4, '0')}`;
      const hash = computeHash(`${prev}|${id}|${item.ts}|${item.action}`);
      const entry: AuditEntry = { ...item, id, prev_hash: prev, hash };
      prev = hash;
      return entry;
    })
    .reverse();
}

/* -------------------------------------------------------------------------- */
/*  Shared Primitives (Spinner, Swap, Card, Popover, ConfirmDialog, etc.)     */
/* -------------------------------------------------------------------------- */

function Spinner({
  variant = 'inline',
  size,
  label,
  className = '',
}: {
  variant?: 'main' | 'inline';
  size?: number;
  label?: string;
  className?: string;
}) {
  const aria = label ? { role: 'status' as const, 'aria-label': label } : { 'aria-hidden': true };
  const s = size ?? (variant === 'main' ? 24 : 14);
  return (
    <svg
      {...aria}
      className={`animate-spin text-emerald-600 shrink-0 ${className}`}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function Swap({
  active,
  items,
  className = '',
}: {
  active: number;
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <span className={`swap ${className}`}>
      {items.map((item, idx) => (
        <span
          key={idx}
          data-active={idx === active}
          aria-hidden={idx !== active}
          className="flex items-center justify-center gap-1.5"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

function CardBox({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card overflow-hidden ${className}`}>{children}</div>;
}

function Hairline({ inset = true }: { inset?: boolean }) {
  return <div aria-hidden="true" className={`${inset ? 'ml-4' : ''} h-px bg-[var(--hairline)]`} />;
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative flex rounded-[9px] bg-[var(--fill-2)] p-[2px]"
    >
      <span
        aria-hidden="true"
        className="seg-pill absolute top-[2px] bottom-[2px] left-[2px] rounded-[7px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${100 * idx}%)`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`seg-option press relative z-10 h-7 flex-1 rounded-[7px] text-[13px] font-medium ${opt.value === value ? 'text-[var(--fg)]' : 'text-[var(--label-2)]'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Popover({
  trigger,
  children,
  placement = 'bottom-end',
  label,
  className = '',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  placement?: 'bottom-end' | 'bottom-start' | 'top-start' | 'top-end';
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const posClass = {
    'bottom-end': 'top-full right-0 mt-2',
    'bottom-start': 'top-full left-0 mt-2',
    'top-start': 'bottom-full left-0 mb-2',
    'top-end': 'bottom-full right-0 mb-2',
  }[placement];

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <div
        role="dialog"
        aria-label={label}
        data-open={open}
        data-placement={placement}
        className={`popover absolute z-50 ${posClass} rounded-2xl bg-white p-1.5 shadow-[0_0_0_1px_var(--hairline),0_12px_32px_rgba(0,0,0,0.12)] ${className}`}
      >
        {children(close)}
      </div>
    </div>
  );
}

function MenuItemRadio({
  children,
  onSelect,
  checked,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  checked?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className="row-btn flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[14px] disabled:opacity-40"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {checked !== undefined && (
        <span className={`text-[var(--brand)] ${checked ? 'opacity-100' : 'opacity-0'}`}>
          {Icons.check}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Collapsible Multi-Step AI Progress Component (`et`)                       */
/* -------------------------------------------------------------------------- */

interface StepItem {
  id: string;
  label: string;
  status: 'running' | 'done' | 'pending';
}

/* -------------------------------------------------------------------------- */
/*  App Context                                                               */
/* -------------------------------------------------------------------------- */

interface AppContextValue {
  applicant: ApplicantProfile;
  openSource: (sourceId: string) => void;
  checklistItems: ChecklistRequirementItem[];
  toggleChecklistItem: (id: string) => void;
  toggleSkipChecklistItem: (id: string) => void;
  confirmInspectionFields: (reportId: string, updatedFields: ExtractedField[]) => void;
  triggerInspectForService: (serviceCode: string, reqName: string) => void;
  openRemediationBranch: (data: RemediationBranchData) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContext.Provider');
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  AI Document & Requirement Inspection Card (Expired / Mismatch / Missing)  */
/* -------------------------------------------------------------------------- */

function InspectionReportCard({ report }: { report: InspectionReport }) {
  const { openSource, confirmInspectionFields, openRemediationBranch } = useAppContext();
  const [fields, setFields] = useState<ExtractedField[]>(() => report.fields);
  const [saveState, setSaveState] = useState<'review' | 'saving' | 'saved'>('review');
  const locked = saveState !== 'review';

  const handleConfirm = async () => {
    setSaveState('saving');
    await new Promise((r) => setTimeout(r, 550));
    confirmInspectionFields(report.id, fields);
    setSaveState('saved');
  };

  const { expired, mismatch, missing } = report.summary_counts;
  const totalIssues = expired + mismatch + missing;

  return (
    <div className="grid w-full gap-3">
      <CardBox className="grid gap-4 p-4 sm:grid-cols-[230px_1fr]">
        {/* Left: Display the ID and the thing that is missing */}
        <div
          className="flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-[0_0_0_1px_var(--hairline)]"
          aria-label="Summary of the inspected requirement"
        >
          <div>
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-[var(--hairline)]">
              <span className="font-semibold text-[12px] text-[var(--fg)] truncate">
                {report.document_title}
              </span>
              <span className="text-[10px] text-[var(--label-3)] shrink-0 font-mono">
                {report.file_name}
              </span>
            </div>

            {/* Display the ID Photo */}
            <div className="mt-2.5 relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={
                  report.file_name.startsWith('/demo/')
                    ? report.file_name
                    : `/demo/${report.file_name}`
                }
                alt={report.document_title}
                className="w-full h-auto max-h-[140px] object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute top-1.5 right-1.5">
                {totalIssues > 0 ? (
                  <span className="rounded bg-rose-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 shadow-2xs">
                    {totalIssues} Issue{totalIssues > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="rounded bg-emerald-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 shadow-2xs">
                    Valid ID
                  </span>
                )}
              </div>
            </div>

            {/* Clean Status Summary */}
            <div className="mt-3 space-y-1">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Inspection Result
              </span>
              {totalIssues > 0 ? (
                <div className="rounded-lg bg-rose-50 border border-rose-200/80 p-2.5 text-xs text-rose-800 font-semibold">
                  <span>{totalIssues} Issue{totalIssues > 1 ? 's' : ''} Flagged</span>
                  <span className="block text-[10.5px] font-normal text-rose-600 mt-0.5">
                    Tingnan ang detalye at pagwawasto sa kanan
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-semibold">
                  <span>100% Counter-Ready</span>
                  <span className="block text-[10.5px] font-normal text-emerald-600 mt-0.5">
                    Walang kulang o mismatch
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-[var(--hairline)] pt-2 text-[11px]">
            <p className="text-[var(--label-2)] truncate">
              Applicant: <span className="font-semibold text-[var(--fg)]">{report.applicant_name}</span>
            </p>
            <button
              type="button"
              onClick={() => openSource(report.source_id)}
              className="chip-btn press mt-1.5 w-full justify-center text-[11px]"
            >
              {Icons.doc}
              <span>View Official Charter Rule</span>
            </button>
          </div>
        </div>

        {/* Right Findings & Editable Extracted Fields */}
        <div className="grid content-start gap-3">
          {/* Header & Summary Tags */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-2.5">
            <span className="text-[13px] font-semibold text-[var(--fg)]">
              AI Requirement Inspection Scorecard
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {expired > 0 && <span className="tag tag-danger">{expired} Expired</span>}
              {mismatch > 0 && <span className="tag tag-accent">{mismatch} Mismatched</span>}
              {missing > 0 && <span className="tag tag-accent">{missing} Missing</span>}
              {totalIssues === 0 && <span className="tag tag-brand">100% Counter-Ready</span>}
            </div>
          </div>

          {/* Issue Breakdown List (Clean, minimal, no emojis) */}
          <div className="space-y-2">
            {report.issues
              .filter((iss) => iss.category !== 'valid')
              .map((iss) => {
                const isExp = iss.category === 'expired';
                const isMis = iss.category === 'mismatch';
                const tagBorder = isExp
                  ? 'border-l-4 border-l-rose-500 bg-rose-50/50 border-slate-200'
                  : 'border-l-4 border-l-amber-500 bg-amber-50/50 border-slate-200';
                const badgeLabel = isExp
                  ? 'EXPIRED INFO'
                  : isMis
                    ? 'MISMATCHED INFO'
                    : 'MISSING INFO';
                const badgeClass = isExp ? 'tag-danger' : 'tag-accent';

                return (
                  <div
                    key={iss.id}
                    className={`rounded-lg border p-2.5 text-[13px] ${tagBorder}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{iss.title}</span>
                      <span className={`tag ${badgeClass}`}>{badgeLabel}</span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug text-slate-600">{iss.detail}</p>
                    <div className="mt-2 flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() =>
                          openRemediationBranch({
                            issueId: iss.id,
                            category: iss.category as any,
                            title: iss.title,
                            documentTitle: report.document_title,
                            serviceCode: report.service_code,
                            detail: iss.detail,
                            requirementName: report.document_title,
                            filePreviewUrl: report.file_name.startsWith('/demo/')
                              ? report.file_name
                              : `/demo/${report.file_name}`,
                          })
                        }
                        className="chip-btn press inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs"
                        title="Buksan ang sub-chat para sa gabay sa pag-ayos"
                      >
                        {Icons.chat}
                        <span>Ayusin sa Sub-Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Extracted Fields Table with Inline Editing */}
          <div className="mt-1 space-y-2 border-t border-[var(--hairline)] pt-2.5">
            <span className="block text-[12px] font-medium text-[var(--label-2)]">
              Extracted Document Fields (Edit or correct before confirming)
            </span>
            {fields.map((f, idx) => {
              const isProblem = f.status !== 'valid' && !locked;
              return (
                <label
                  key={f.key}
                  className="grid grid-cols-[130px_1fr] items-center gap-3 max-sm:grid-cols-1 max-sm:gap-1"
                >
                  <span className="text-[13px] text-[var(--label-2)]">{f.label}</span>
                  <span className="relative">
                    <input
                      type="text"
                      value={f.value}
                      disabled={locked}
                      data-low={(f.status === 'mismatch' || f.status === 'missing') && !locked}
                      data-error={f.status === 'expired' && !locked}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFields((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, value: val, status: 'valid', note: undefined } : item,
                          ),
                        );
                      }}
                      className={`field h-8 w-full px-2.5 ${isProblem ? 'pr-32' : ''}`}
                    />
                    {isProblem && f.note && (
                      <span
                        className={`tag pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 ${f.status === 'expired' ? 'tag-danger' : 'tag-accent'
                          }`}
                      >
                        {f.note}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-2.5">
            <span className="text-[12px] text-[var(--label-2)]">
              {saveState === 'saved'
                ? 'Checklist updated and logged to your session.'
                : 'Review flagged fields or upload a replacement document.'}
            </span>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={locked}
              aria-live="polite"
              className="btn btn-primary press min-w-[160px]"
            >
              <Swap
                active={saveState === 'review' ? 0 : saveState === 'saving' ? 1 : 2}
                items={[
                  'Confirm & mark reviewed',
                  <React.Fragment key="saving">
                    <Spinner /> Updating...
                  </React.Fragment>,
                  <React.Fragment key="saved">{Icons.check} Checklist updated</React.Fragment>,
                ]}
              />
            </button>
          </div>
        </div>
      </CardBox>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Interactive Service Requirements Checklist Card (In-Chat)                 */
/* -------------------------------------------------------------------------- */

function InteractiveChecklistCard({
  checklist,
}: {
  checklist: {
    service_code: string;
    service_name: string;
    agency_name: string;
    processing_fee: number;
    convenience_fee?: number;
    counter_tips: string[];
    items: ChecklistRequirementItem[];
  };
}) {
  const {
    checklistItems,
    toggleChecklistItem,
    toggleSkipChecklistItem,
    triggerInspectForService,
    openSource,
    openRemediationBranch,
  } = useAppContext();

  const liveItems = useMemo(() => {
    const map = new Map(checklistItems.map((i) => [i.id, i]));
    return checklist.items.map((item) => map.get(item.id) || item);
  }, [checklist.items, checklistItems]);

  const activeItems = liveItems.filter((i) => i.status !== 'skipped');
  const verifiedCount = liveItems.filter((i) => i.status === 'verified').length;
  const skippedCount = liveItems.filter((i) => i.status === 'skipped').length;
  const issueCount = liveItems.filter((i) => i.status === 'issue').length;
  const sourceId =
    checklist.service_code === 'PSA_BIRTH_CERT'
      ? 'src-psa-2025'
      : checklist.service_code === 'PHILHEALTH_REGISTRATION'
        ? 'src-philhealth-2025'
        : 'src-nbi-2025';

  return (
    <CardBox className="max-w-[640px]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <div>
          <span className="block text-[14px] font-semibold text-[var(--fg)]">
            {checklist.service_name}
          </span>
          <span className="text-[12px] text-[var(--label-2)]">
            {checklist.agency_name} · Fee:{' '}
            {checklist.processing_fee === 0
              ? 'FREE (₱0.00)'
              : `₱${checklist.processing_fee.toFixed(2)} (FREE for First-Time Jobseekers)`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {issueCount > 0 && <span className="tag tag-accent">{issueCount} Needs Fix</span>}
          <span className="tag tag-brand">
            {verifiedCount} of {activeItems.length} Ready
            {skippedCount > 0 && ` (${skippedCount} Skipped)`}
          </span>
        </div>
      </div>

      {/* Stepping Design Requirements Checklist */}
      <div className="space-y-0 px-4 py-2 border-t border-[var(--hairline)]">
        {liveItems.map((item, idx) => {
          const isDone = item.status === 'verified';
          const isSkipped = item.status === 'skipped';
          const isIssue = item.status === 'issue' || (!isSkipped && Boolean(item.issue_note && !isDone));
          const stepNum = idx + 1;
          const isLast = idx === liveItems.length - 1;

          return (
            <div key={item.id} className="relative flex items-start gap-3 pb-3.5">
              {/* Stepper Connector Line */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] bottom-0 w-[2px] ${
                    isDone
                      ? 'bg-emerald-400'
                      : isSkipped
                        ? 'bg-slate-300'
                        : isIssue
                          ? 'bg-rose-300'
                          : 'bg-slate-200'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step Circle Badge */}
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                onClick={() => toggleChecklistItem(item.id)}
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isSkipped
                      ? 'bg-slate-200 text-slate-700 border border-slate-300'
                      : isIssue
                        ? 'bg-rose-600 text-white shadow-xs ring-4 ring-rose-100'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
                title={
                  isDone
                    ? 'Mark as Pending'
                    : isSkipped
                      ? 'Skipped (Click to mark Ready)'
                      : 'Mark as Ready'
                }
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : isSkipped ? (
                  <span className="text-[11px] font-bold">⏭</span>
                ) : isIssue ? (
                  <span className="text-[11px]">!</span>
                ) : (
                  <span>{stepNum}</span>
                )}
              </button>

              {/* Step Card */}
              <div
                className={`flex-1 min-w-0 rounded-xl border p-3 transition-all ${
                  isIssue
                    ? 'border-rose-200 bg-rose-50/60'
                    : isDone
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : isSkipped
                        ? 'border-slate-200 bg-slate-50/50 opacity-80'
                        : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Step {stepNum}
                    </span>
                    <span
                      className={`text-xs sm:text-[13px] font-semibold truncate ${
                        isDone
                          ? 'text-slate-400 line-through'
                          : isSkipped
                            ? 'text-slate-500 line-through'
                            : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.isPrimaryId && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                        Primary ID
                      </span>
                    )}
                    {isSkipped && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                        ⏭ Na-skip · Hindi Kailangan
                      </span>
                    )}
                    {isDone && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                        ✓ Ready
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline"
                    >
                      {isDone ? 'Mark Pending' : 'Ready'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSkipChecklistItem(item.id)}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline"
                    >
                      {isSkipped ? 'Ibalik (Unskip)' : 'I-skip (N/A)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isIssue || item.status === 'issue' || item.issue_note) {
                          const isExp =
                            item.issue_note?.toLowerCase().includes('expired') ||
                            item.name.toLowerCase().includes('postal');
                          const isMissing =
                            item.issue_note?.toLowerCase().includes('seal') ||
                            item.issue_note?.toLowerCase().includes('oath') ||
                            item.name.toLowerCase().includes('barangay');
                          openRemediationBranch({
                            category: isExp ? 'expired' : isMissing ? 'missing' : 'general',
                            title: item.name,
                            documentTitle: item.name,
                            serviceCode: checklist.service_code,
                            detail:
                              item.issue_note ||
                              "Kailangang suriin at maisaayos alinsunod sa Citizen's Charter bago magpunta sa counter.",
                            requirementName: item.name,
                          });
                        } else {
                          triggerInspectForService(checklist.service_code, item.name);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {Icons.chat}
                      <span>Open in chat</span>
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-[11.5px] text-slate-600 leading-snug">
                  {item.description}
                </p>

                {/* Verified Info Note */}
                {isDone && item.issue_note && (
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-700">
                    ✓ {item.issue_note}
                  </p>
                )}

                {/* Skipped Info Note */}
                {isSkipped && (
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                    ℹ️ {item.issue_note || 'Na-skip: Hindi kailangan para sa iyong aplikasyon.'}
                  </p>
                )}

                {/* Step Error Box if flagged */}
                {isIssue && item.issue_note && (
                  <div className="mt-2 rounded-lg border border-rose-300 bg-rose-100/90 p-2 text-xs text-rose-900">
                    <div className="flex items-center gap-1 font-bold text-rose-800">
                      <span>May Isyu sa Step na Ito:</span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-rose-800 font-medium">
                      {item.issue_note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CardBox>
  );
}

/* -------------------------------------------------------------------------- */
/*  AI Safety, Legal & Privacy Guardrail Card (In-Chat)                       */
/* -------------------------------------------------------------------------- */

function GuardrailAlertCard({ guardrail }: { guardrail: GuardrailCardData }) {
  const { openSource } = useAppContext();
  const isCritical = guardrail.severity === 'critical';

  return (
    <CardBox className="max-w-[640px]">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2.5 ${isCritical ? 'bg-[#fef2f2]/70' : 'bg-[#fffbeb]/70'
          }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isCritical ? 'bg-[#fee2e2] text-red-700' : 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
              }`}
          >
            {Icons.lock}
          </span>
          <div>
            <span className="block text-[14px] font-semibold text-[var(--fg)]">
              {guardrail.title}
            </span>
            <span className="text-[12px] text-[var(--label-2)]">
              Policy: {guardrail.policy_code} · Logged to RA 10173 Audit Trail
            </span>
          </div>
        </div>
        <span className={`tag ${isCritical ? 'tag-danger' : 'tag-accent'}`}>
          {guardrail.badge}
        </span>
      </div>

      <Hairline inset={false} />

      <div className="space-y-2.5 px-4 py-3 text-[13px]">
        <div className="rounded-[10px] bg-[#fcfcfc] p-3 shadow-[0_0_0_1px_var(--hairline)]">
          <span className="block text-[11px] font-semibold tracking-[0.05em] text-[var(--label-2)] uppercase">
            Legal &amp; Security Basis
          </span>
          <p className="mt-0.5 font-medium text-[var(--fg)]">{guardrail.law_citation}</p>
          <p className="mt-1 leading-relaxed text-[var(--label-2)]">{guardrail.explanation}</p>
        </div>

        <div className="rounded-[10px] bg-[var(--brand-soft)]/50 p-3 shadow-[0_0_0_1px_var(--hairline)]">
          <span className="block text-[11px] font-semibold tracking-[0.05em] text-[var(--brand)] uppercase">
            Safe &amp; Legal Alternative
          </span>
          <p className="mt-0.5 leading-relaxed text-[var(--fg)]">{guardrail.safe_alternative}</p>
        </div>
      </div>

      <Hairline inset={false} />
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fcfcfc] px-4 py-2.5 text-[12px] text-[var(--label-2)]">
        <span>Official Assistance: {guardrail.official_hotline}</span>
        <button
          type="button"
          onClick={() => openSource('src-nbi-2025')}
          className="chip-btn press"
        >
          {Icons.doc} View Charter Rules
        </button>
      </div>
    </CardBox>
  );
}

/* -------------------------------------------------------------------------- */
/*  "What's next" Suggestions Card (`tg`)                                     */
/* -------------------------------------------------------------------------- */

export interface NextActionItem {
  id: string;
  label: string;
  hint?: string;
  action: 'message' | 'attach' | 'demo_file' | 'view';
  text?: string;
  view?: 'chat' | 'details' | 'referrals' | 'tasks' | 'notifications';
  file?: { path: string; name: string; type: string };
}

function NextActionsCard({
  items,
  onPick,
}: {
  items: NextActionItem[];
  onPick: (item: NextActionItem) => void;
}) {
  return (
    <div className="enter-card grid gap-2 pt-1">
      <span className="text-[13px] font-medium text-[var(--label-2)]">What&apos;s next</span>
      <CardBox className="max-w-[520px]">
        {items.map((item, idx) => (
          <div key={item.id}>
            {idx > 0 && <Hairline />}
            <button
              type="button"
              onClick={() => onPick(item)}
              className="row-btn press flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                {item.action === 'attach' || item.action === 'demo_file'
                  ? Icons.upload
                  : item.action === 'view'
                    ? Icons.user
                    : Icons.docLg}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{item.label}</span>
                {item.hint && (
                  <span className="block truncate text-[13px] text-[var(--label-2)]">
                    {item.hint}
                  </span>
                )}
              </span>
              <span className="text-[var(--label-3)]">{Icons.chevronRight}</span>
            </button>
          </div>
        ))}
      </CardBox>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Unified "My Details" Hub: Local Storage Profile, Files, Checklists &      */
/*  AI Document Inspections                                                   */
/* -------------------------------------------------------------------------- */

const INSPECTION_STAGES = [
  'Uploaded',
  'OCR Read',
  'Date Check',
  'Identity Match',
  'Completeness',
  'Counter-Ready',
];

function computeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const CHECKLIST_SECTIONS = [
  { code: 'NBI_CLEARANCE', label: 'NBI Clearance' },
  { code: 'PSA_BIRTH_CERT', label: 'PSA Birth Certificate' },
  { code: 'DFA_PASSPORT', label: 'DFA Passport' },
  { code: 'PHILHEALTH_REGISTRATION', label: 'PhilHealth Registration' },
  { code: 'DPWH_PROJECTS', label: 'DPWH Projects' },
];

function MyDetailsView({
  applicant,
  onUpdateApplicant,
  onResetAllToDemo,
  savedFiles,
  onAddVaultFiles,
  onRemoveVaultFile,
  onInspectVaultFile,
  inspections,
  onAskInChat,
  onCheckInChat,
  onPreviewImage,
}: {
  applicant: ApplicantProfile;
  onUpdateApplicant: (updated: ApplicantProfile) => void;
  onResetAllToDemo: () => void;
  savedFiles: SavedVaultFile[];
  onAddVaultFiles: (files: File[], docType: string, serviceCode: string) => void;
  onRemoveVaultFile: (id: string) => void;
  onInspectVaultFile: (file: SavedVaultFile) => void;
  inspections: InspectionReport[];
  onAskInChat: (prompt: string, demoFile?: { path: string; name: string; type: string }) => void;
  onCheckInChat: (serviceCode: string, reqName: string) => void;
  onPreviewImage: (src: string, name: string) => void;
}) {
  const {
    checklistItems,
    toggleChecklistItem,
    toggleSkipChecklistItem,
    openSource,
    openRemediationBranch,
  } = useAppContext();

  const [sectionTab, setSectionTab] = useState<'all' | 'requests' | 'profile_files' | 'checklists' | 'inspections'>('all');
  const [draftProfile, setDraftProfile] = useState<ApplicantProfile>(applicant);
  const [savedNotice, setSavedNotice] = useState(false);

  const [newFileDocType, setNewFileDocType] = useState('Primary Government ID');
  const [newFileService, setNewFileService] = useState('DFA_PASSPORT');
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<'all' | 'issues' | 'expired' | 'ready'>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(inspections[0]?.id ?? null);

  useEffect(() => {
    const isJobseekerPersona = applicant.role === 'jobseeker' && (applicant.display_name || '').toLowerCase().includes('juan');
    const isMarriedPersona = applicant.role === 'married_applicant';
    const isDemoAccount = isJobseekerPersona || isMarriedPersona;

    const hasPhilsysDoc = savedFiles.some((f) =>
      /philsys|national[- ]id|pambansang|ephilid/i.test(`${f.document_type || ''} ${f.name || ''}`)
    );
    const hasPhilhealthDoc = savedFiles.some((f) =>
      /philhealth|pmrf|mdr/i.test(`${f.document_type || ''} ${f.name || ''}`)
    );
    const hasTinDoc = savedFiles.some((f) =>
      /tin|bir|orus|1901|1902|1904/i.test(`${f.document_type || ''} ${f.name || ''}`)
    );
    const hasSssDoc = savedFiles.some((f) =>
      /sss|umid|crn|e-1/i.test(`${f.document_type || ''} ${f.name || ''}`)
    );

    const isGenericTitle =
      !applicant.display_name ||
      applicant.display_name === 'Guest Account' ||
      applicant.display_name === 'Citizen Account';

    let resolved = { ...applicant };

    if (!isDemoAccount) {
      // Strip mock numbers if no document has been presented for them
      if (!hasPhilsysDoc && (resolved.philsys_id === '1234-5678-9012-3456' || resolved.philsys_id === '8765-4321-0987-6543')) {
        resolved.philsys_id = '';
        resolved.philsys_card_number = '';
      }
      if (!hasPhilhealthDoc && (resolved.philhealth_number === '12-345678901-2' || resolved.philhealth_number === '23-456789012-3')) {
        resolved.philhealth_number = '';
      }
      if (!hasTinDoc && (resolved.tin === '123-456-789-000' || resolved.tin === '234-567-890-000')) {
        resolved.tin = '';
        resolved.tin_number = '';
      }
      if (!hasSssDoc && (resolved.sss_number === '03-9876543-2' || resolved.sss_number === '04-8765432-1')) {
        resolved.sss_number = '';
      }
    }

    if ((!resolved.first_name || !resolved.last_name) && !isGenericTitle) {
      const parsed = parseNameParts(resolved.display_name);
      setDraftProfile({
        ...resolved,
        first_name: resolved.first_name || parsed.first_name,
        middle_name: resolved.middle_name || parsed.middle_name,
        last_name: resolved.last_name || parsed.last_name,
        suffix: resolved.suffix || parsed.suffix,
      });
    } else {
      setDraftProfile(resolved);
    }
  }, [applicant, savedFiles]);

  const handleFieldChange = (key: keyof ApplicantProfile, val: string) => {
    const next: ApplicantProfile = {
      ...draftProfile,
      [key]: val,
      initials: key === 'display_name' ? computeInitials(val) : draftProfile.initials,
    };
    setDraftProfile(next);
    onUpdateApplicant(next);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);

    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'GOVGUIDE_MY_DETAILS_UPDATED', applicant: next }, '*');
    }
  };

  const handleNamePartChange = (
    part: 'first_name' | 'middle_name' | 'last_name' | 'suffix',
    val: string,
  ) => {
    const updated = {
      ...draftProfile,
      [part]: val,
    };
    const fullName = formatFullName(
      part === 'first_name' ? val : updated.first_name,
      part === 'middle_name' ? val : updated.middle_name,
      part === 'last_name' ? val : updated.last_name,
      part === 'suffix' ? val : updated.suffix,
    );
    updated.display_name = fullName;
    updated.initials = computeInitials(fullName);

    setDraftProfile(updated);
    onUpdateApplicant(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);

    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'GOVGUIDE_MY_DETAILS_UPDATED', applicant: updated }, '*');
    }
  };

  const filteredInspections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inspections.filter((r) => {
      if (filter === 'issues' && r.overall_status !== 'issues_found') return false;
      if (filter === 'expired' && r.summary_counts.expired === 0) return false;
      if (filter === 'ready' && r.overall_status !== 'counter_ready') return false;
      if (!q) return true;
      return (
        r.document_title.toLowerCase().includes(q) ||
        r.service_name.toLowerCase().includes(q) ||
        r.file_name.toLowerCase().includes(q) ||
        r.issues.some((i) => i.title.toLowerCase().includes(q))
      );
    });
  }, [inspections, filter, search]);

  const checklistSections = CHECKLIST_SECTIONS;

  const isJobseekerDemo = applicant.role === 'jobseeker' && (applicant.display_name || '').toLowerCase().includes('juan');
  const isMarriedDemo = applicant.role === 'married_applicant';
  const isDemoAccount = isJobseekerDemo || isMarriedDemo;

  const hasPhilsysDoc = isDemoAccount || savedFiles.some((f) =>
    /philsys|national[- ]id|pambansang|ephilid/i.test(`${f.document_type || ''} ${f.name || ''}`)
  );
  const hasPhilhealthDoc = isDemoAccount || savedFiles.some((f) =>
    /philhealth|pmrf|mdr/i.test(`${f.document_type || ''} ${f.name || ''}`)
  );
  const hasTinDoc = isDemoAccount || savedFiles.some((f) =>
    /tin|bir|orus|1901|1902|1904/i.test(`${f.document_type || ''} ${f.name || ''}`)
  );
  const hasSssDoc = isDemoAccount || savedFiles.some((f) =>
    /sss|umid|crn|e-1/i.test(`${f.document_type || ''} ${f.name || ''}`)
  );

  const [isAdditionalInfoCollapsed, setIsAdditionalInfoCollapsed] = useState(true);
  const [isChecklistsCollapsed, setIsChecklistsCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    NBI_CLEARANCE: true,
    PSA_BIRTH_CERT: true,
    DFA_PASSPORT: true,
    PHILHEALTH_REGISTRATION: true,
    DPWH_PROJECTS: true,
  });

  const toggleSection = (code: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const allSectionsCollapsed = useMemo(() => {
    return checklistSections.length > 0 && checklistSections.every((sec) => Boolean(collapsedSections[sec.code]));
  }, [checklistSections, collapsedSections]);

  const toggleAllSections = () => {
    const nextState = !allSectionsCollapsed;
    const nextMap: Record<string, boolean> = {};
    checklistSections.forEach((sec) => {
      nextMap[sec.code] = nextState;
    });
    setCollapsedSections(nextMap);
  };

  const showRequests = sectionTab === 'all' || sectionTab === 'requests';
  const showProfileAndFiles = sectionTab === 'all' || sectionTab === 'profile_files';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1104px] px-8 pt-10 pb-16">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[var(--hairline)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
                Aking Detalye
              </h1>
              {savedNotice && (
                <span className="pop text-[12px] font-medium text-[var(--brand)]">
                  ✓ Naka-save
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Sub-section Switcher */}
        <div className="py-5">
          <div className="w-full sm:w-[420px]">
            <SegmentedControl
              label="My Details sections"
              value={sectionTab}
              onChange={setSectionTab}
              options={[
                { value: 'all', label: 'Lahat' },
                { value: 'profile_files', label: 'Profile & Vault' },
                { value: 'requests', label: 'Requests' },
              ]}
            />
          </div>
        </div>

        {/* 1. Personal Details & Saved Files Vault */}
        {showProfileAndFiles && (
          <div className="enter space-y-6 pb-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] items-start">
              {/* Left Card: Personal Identity Profile */}
              <CardBox className="p-5">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--fg)] text-[13px] font-semibold text-white">
                      {draftProfile.initials || '—'}
                    </span>
                    <div>
                      <h2 className="text-[15px] font-semibold text-slate-900">
                        Personal Information
                      </h2>
                    </div>
                  </div>
                  <span className="tag bg-[var(--fill)] text-[var(--label-2)]">Saved</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {/* Dedicated Name Fields: First, Middle, Last, Suffix */}
                  <label className="block sm:col-span-1">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      First Name
                    </span>
                    <input
                      type="text"
                      value={draftProfile.first_name || ''}
                      onChange={(e) => handleNamePartChange('first_name', e.target.value)}
                      placeholder="e.g. Juan"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Middle Name
                    </span>
                    <input
                      type="text"
                      value={draftProfile.middle_name || ''}
                      onChange={(e) => handleNamePartChange('middle_name', e.target.value)}
                      placeholder="e.g. Santos"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Last Name
                    </span>
                    <input
                      type="text"
                      value={draftProfile.last_name || ''}
                      onChange={(e) => handleNamePartChange('last_name', e.target.value)}
                      placeholder="e.g. Dela Cruz"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Suffix
                    </span>
                    <input
                      type="text"
                      value={draftProfile.suffix || ''}
                      onChange={(e) => handleNamePartChange('suffix', e.target.value)}
                      placeholder="e.g. Jr., Sr., III"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>
                </div>

                {/* Collapsible Additional Details Container with Smooth CSS Grid Transition */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isAdditionalInfoCollapsed
                      ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      : 'grid-rows-[1fr] opacity-100'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t border-[var(--hairline)] grid gap-3 sm:grid-cols-2">

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Date of Birth
                    </span>
                    <input
                      type="date"
                      value={draftProfile.birth_date}
                      onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Sex / Gender
                    </span>
                    <select
                      value={draftProfile.gender || ''}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="field h-9 w-full px-3 text-[13px]"
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Civil Status
                    </span>
                    <select
                      value={draftProfile.civil_status}
                      onChange={(e) => handleFieldChange('civil_status', e.target.value)}
                      className="field h-9 w-full px-3 text-[13px]"
                    >
                      <option value="">Select Civil Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Place of Birth
                    </span>
                    <input
                      type="text"
                      value={draftProfile.place_of_birth || ''}
                      onChange={(e) => handleFieldChange('place_of_birth', e.target.value)}
                      placeholder="e.g. Lipa City, Batangas"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Maiden Name
                    </span>
                    <input
                      type="text"
                      value={draftProfile.maiden_name || ''}
                      onChange={(e) => handleFieldChange('maiden_name', e.target.value)}
                      placeholder="Enter maiden name"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  {/* Freeform Category Input Learned by AI */}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Category
                    </span>
                    <input
                      type="text"
                      value={draftProfile.title || ''}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      placeholder="e.g. Solo Parent, Jobseeker, Student, PWD"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Barangay
                    </span>
                    <input
                      type="text"
                      value={draftProfile.barangay}
                      onChange={(e) => handleFieldChange('barangay', e.target.value)}
                      placeholder="e.g. Brgy. San Isidro"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      City / Municipality
                    </span>
                    <input
                      type="text"
                      value={draftProfile.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="e.g. Quezon City"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Email
                    </span>
                    <input
                      type="email"
                      value={draftProfile.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="citizen@example.ph"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Mobile Number
                    </span>
                    <input
                      type="text"
                      value={draftProfile.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      placeholder="0917-XXX-XXXX"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  {/* Extended Address Fields for Delivery & Civil Registry */}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      House No. &amp; Street Address
                    </span>
                    <input
                      type="text"
                      value={draftProfile.street_address || draftProfile.residential_address || ''}
                      onChange={(e) => {
                        handleFieldChange('street_address', e.target.value);
                        handleFieldChange('residential_address', e.target.value);
                      }}
                      placeholder="e.g. 1024 General Luna Street"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Province / Region
                    </span>
                    <input
                      type="text"
                      value={draftProfile.province || ''}
                      onChange={(e) => handleFieldChange('province', e.target.value)}
                      placeholder="e.g. Metro Manila"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--label-2)]">
                      Zip Code
                    </span>
                    <input
                      type="text"
                      value={draftProfile.zip_code || ''}
                      onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                      placeholder="e.g. 1100"
                      className="field h-9 w-full px-3 text-[13px]"
                    />
                  </label>

                  {/* Father Details (Vital for PSA & NBI) */}
                  <div className="sm:col-span-2 mt-2 pt-2 border-t border-[var(--hairline)]">
                    <span className="text-[12px] font-bold text-slate-800 block mb-2">
                      Father&apos;s Name
                    </span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[var(--label-2)]">Father First Name</span>
                        <input
                          type="text"
                          value={draftProfile.father_first_name || ''}
                          onChange={(e) => handleFieldChange('father_first_name', e.target.value)}
                          placeholder="e.g. Roberto"
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[var(--label-2)]">Father Middle Name</span>
                        <input
                          type="text"
                          value={draftProfile.father_middle_name || ''}
                          onChange={(e) => handleFieldChange('father_middle_name', e.target.value)}
                          placeholder="e.g. Mendoza"
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[var(--label-2)]">Father Last Name</span>
                        <input
                          type="text"
                          value={draftProfile.father_last_name || ''}
                          onChange={(e) => handleFieldChange('father_last_name', e.target.value)}
                          placeholder="e.g. Dela Cruz"
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Mother's Maiden Name (Vital for PSA & NBI) */}
                  <div className="sm:col-span-2 mt-2 pt-2 border-t border-[var(--hairline)]">
                    <span className="text-[12px] font-bold text-slate-800 block mb-2">
                      Mother&apos;s Maiden Name
                    </span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[var(--label-2)]">Mother First Name</span>
                        <input
                          type="text"
                          value={draftProfile.mother_first_name || ''}
                          onChange={(e) => handleFieldChange('mother_first_name', e.target.value)}
                          placeholder="e.g. Maria"
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[var(--label-2)]">Mother Middle Name</span>
                        <input
                          type="text"
                          value={draftProfile.mother_middle_name || ''}
                          onChange={(e) => handleFieldChange('mother_middle_name', e.target.value)}
                          placeholder="e.g. Gomez"
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[var(--label-2)]">Mother Maiden Last Name</span>
                        <input
                          type="text"
                          value={draftProfile.mother_last_name || ''}
                          onChange={(e) => handleFieldChange('mother_last_name', e.target.value)}
                          placeholder="e.g. Santos"
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Philippine Government Identifiers */}
                  <div className="sm:col-span-2 mt-2 pt-2 border-t border-[var(--hairline)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-slate-800">
                        Government IDs
                      </span>
                      <span className="text-[11px] text-[var(--label-2)]">
                        {hasPhilsysDoc || hasPhilhealthDoc || hasTinDoc || hasSssDoc
                          ? 'Grounded sa verified documents'
                          : 'I-upload ang ID upang maitala'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 flex items-center justify-between text-[11px] text-[var(--label-2)]">
                          <span>PhilSys (National ID / ePhilID)</span>
                          {hasPhilsysDoc ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Na-verify</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Walang doc</span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={draftProfile.philsys_id || draftProfile.philsys_card_number || ''}
                          onChange={(e) => {
                            handleFieldChange('philsys_id', e.target.value);
                            handleFieldChange('philsys_card_number', e.target.value);
                          }}
                          placeholder={hasPhilsysDoc ? "2631-2509-8106-8349" : "Walang na-upload na ID"}
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center justify-between text-[11px] text-[var(--label-2)]">
                          <span>PhilHealth PIN</span>
                          {hasPhilhealthDoc ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Na-verify</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Walang doc</span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={draftProfile.philhealth_number || ''}
                          onChange={(e) => handleFieldChange('philhealth_number', e.target.value)}
                          placeholder={hasPhilhealthDoc ? "12-345678901-2" : "Walang na-upload na ID"}
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center justify-between text-[11px] text-[var(--label-2)]">
                          <span>BIR TIN</span>
                          {hasTinDoc ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Na-verify</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Walang doc</span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={draftProfile.tin || draftProfile.tin_number || ''}
                          onChange={(e) => {
                            handleFieldChange('tin', e.target.value);
                            handleFieldChange('tin_number', e.target.value);
                          }}
                          placeholder={hasTinDoc ? "123-456-789-000" : "Walang na-upload na ID"}
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center justify-between text-[11px] text-[var(--label-2)]">
                          <span>SSS CRN</span>
                          {hasSssDoc ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Na-verify</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Walang doc</span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={draftProfile.sss_number || ''}
                          onChange={(e) => handleFieldChange('sss_number', e.target.value)}
                          placeholder={hasSssDoc ? "03-9876543-2" : "Walang na-upload na ID"}
                          className="field h-8 w-full px-2.5 text-[12px]"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dropdown Toggle Button at the Bottom */}
            <div className="mt-3 pt-2 border-t border-[var(--hairline)] flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsAdditionalInfoCollapsed((prev) => !prev)}
                className="flex w-full items-center justify-center rounded-lg border border-[var(--hairline)] bg-slate-50/70 py-2 hover:bg-slate-100 transition-colors press text-slate-500 hover:text-slate-800"
                aria-expanded={!isAdditionalInfoCollapsed}
                aria-label={isAdditionalInfoCollapsed ? "Expand details" : "Collapse details"}
                title={isAdditionalInfoCollapsed ? "Expand" : "Collapse"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-300 ease-in-out ${
                    isAdditionalInfoCollapsed ? '' : 'rotate-180'
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </CardBox>

              {/* Right Card: Saved Documents Vault */}
              <CardBox
                className={`flex flex-col p-5 max-h-[560px] ${
                  savedFiles.length === 0 ? 'min-h-[160px]' : 'min-h-[220px]'
                }`}
              >
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-3">
                    <div>
                      <h2 className="text-[15px] font-semibold text-slate-900">Saved Documents</h2>
                    </div>
                    <span className="tag bg-[var(--fill)] text-slate-700 font-semibold">
                      {savedFiles.length} Saved
                    </span>
                  </div>

                  {/* Upload New File to Vault Bar */}
                  <div className="mt-3 rounded-xl bg-slate-50/70 p-3 border border-slate-200">
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <select
                        value={newFileDocType}
                        onChange={(e) => setNewFileDocType(e.target.value)}
                        aria-label="Uri ng Dokumento"
                        className="field h-8 px-2.5 text-[12px]"
                      >
                        <option value="Primary Government ID">Primary Government ID</option>
                        <option value="Barangay Jobseeker Certificate (RA 11261)">
                          Barangay Certificate (RA 11261)
                        </option>
                        <option value="PSA Birth / Marriage Certificate">
                          PSA Certificate
                        </option>
                        <option value="PhilHealth PMRF Form">PhilHealth Form</option>
                      </select>
                      <select
                        value={newFileService}
                        onChange={(e) => setNewFileService(e.target.value)}
                        aria-label="Target na Serbisyo"
                        className="field h-8 px-2.5 text-[12px]"
                      >
                        <option value="DFA_PASSPORT">DFA Passport</option>
                        <option value="DPWH_PROJECTS">DPWH Infrastructure</option>
                        <option value="PSA_BIRTH_CERT">PSA Birth Cert</option>
                        <option value="PHILHEALTH_REGISTRATION">PhilHealth</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => vaultFileInputRef.current?.click()}
                        className="btn btn-primary btn-sm press"
                      >
                        {Icons.upload}
                        <span>Magdagdag</span>
                      </button>
                    </div>
                    <input
                      ref={vaultFileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => {
                        const list = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        if (list.length) {
                          onAddVaultFiles(list, newFileDocType, newFileService);
                        }
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Stored Files List */}
                  {savedFiles.length === 0 ? (
                    <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-4 px-3 text-center min-h-[88px]">
                      <span className="text-slate-400">{Icons.docLg}</span>
                      <p className="mt-1 text-[12.5px] font-medium text-slate-600">No saved documents</p>
                    </div>
                  ) : (
                    <ul className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {savedFiles.map((f) => {
                        const isReady = f.status === 'counter_ready';
                        const isFlagged = f.status === 'issues_found';
                        const isInspecting = f.status === 'inspecting';
                        return (
                          <li
                            key={f.id}
                            className="rounded-xl bg-white p-3.5 shadow-[0_0_0_1px_var(--hairline)] transition-all"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                {f.preview_url ? (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewImage(f.preview_url!, f.name)}
                                    className="press h-14 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-[var(--fill)] shadow-[0_0_0_1px_var(--hairline)]"
                                    title={`Preview ${f.name}`}
                                  >
                                    <img
                                      src={f.preview_url}
                                      alt={f.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-[var(--fill)] text-[var(--label-2)]">
                                    {Icons.docLg}
                                  </span>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-[13px] font-semibold text-slate-900">
                                      {f.document_type}
                                    </span>
                                    {isInspecting ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200 animate-pulse">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                                        AI Checking...
                                      </span>
                                    ) : isReady ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                                        ✓ All goods
                                      </span>
                                    ) : isFlagged ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200">
                                        ⚠ Discrepancy Found
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                        Uninspected
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                                    {f.name} · {f.size_label}
                                    {f.expiry_date ? ` · Validity: ${f.expiry_date}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isFlagged) {
                                      openRemediationBranch({
                                        category: f.issue_summary?.toLowerCase().includes('expired')
                                          ? 'expired'
                                          : 'missing',
                                        title: f.document_type,
                                        documentTitle: f.document_type,
                                        detail: f.discrepancy_what || f.issue_summary || 'May natukoy na isyu sa dokumentong ito.',
                                        requirementName: f.document_type,
                                        filePreviewUrl: f.preview_url,
                                      });
                                    } else {
                                      onInspectVaultFile(f);
                                    }
                                  }}
                                  className={`chip-btn press text-[12px] ${isFlagged ? 'text-amber-900 bg-amber-50 border-amber-300' : ''}`}
                                  title="Open and inspect document in chat using your My Details profile"
                                >
                                  {Icons.chat}
                                  <span>Open in chat</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveVaultFile(f.id)}
                                  aria-label={`Remove ${f.name}`}
                                  className="btn-icon press h-7 w-7 text-slate-400 hover:text-slate-700"
                                >
                                  {Icons.trash}
                                </button>
                              </div>
                            </div>

                            {/* AI Inspection Verdict: All goods vs Discrepancy (What & How to fix) */}
                            {isInspecting ? (
                              <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-[12px] text-blue-800">
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                                <span>AI analyzing document...</span>
                              </div>
                            ) : isReady ? (
                              <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[12px] text-emerald-900">
                                <span className="text-[14px] font-bold text-emerald-600 shrink-0">✓</span>
                                <span className="font-semibold text-emerald-800">All goods</span>
                              </div>
                            ) : isFlagged ? (
                              <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[12px] space-y-2">
                                <div className="flex items-start gap-1.5 text-amber-950">
                                  <span className="font-bold text-amber-900 shrink-0">⚠ Discrepancy:</span>
                                  <span className="leading-relaxed font-medium">{f.discrepancy_what || f.issue_summary || 'Discrepancy detected against Citizen’s Charter standards.'}</span>
                                </div>
                                <div className="flex items-start gap-1.5 rounded-md border border-emerald-300 bg-white/95 p-2 text-emerald-950 shadow-sm">
                                  <span className="font-bold text-emerald-700 shrink-0">💡 Fix:</span>
                                  <span className="leading-relaxed">{f.discrepancy_how_to_fix || 'Renew or update your document, or bring an alternative unexpired Primary ID (e.g. PhilSys National ID or DFA Passport).'}</span>
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </CardBox>
            </div>
          </div>
        )}

        {/* 2. Service Requests & Real-Time Status Bar (Agency Chrome Extension Sync) */}
        {showRequests && (
          <div className="enter pb-8">
            <RequestStatusSection citizenId={applicant.id} onAskInChat={onAskInChat} />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Slide-Over Official Charter Source Drawer (`tb` panel)                    */
/* -------------------------------------------------------------------------- */

function SourceDrawer({
  open,
  sourceId,
  onClose,
}: {
  open: boolean;
  sourceId: string | null;
  onClose: () => void;
}) {
  const doc: CharterSourceDoc | undefined = sourceId ? CHARTER_SOURCES[sourceId] : undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <aside
      role="dialog"
      aria-labelledby="source-title"
      inert={!open ? true : undefined}
      data-open={open}
      className="panel absolute inset-y-0 right-0 z-30 flex w-[440px] max-w-full flex-col bg-white shadow-[-1px_0_0_var(--hairline),-24px_0_48px_rgba(0,0,0,0.06)]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-5">
        <h2 id="source-title" className="truncate text-[15px] font-medium">
          {doc?.title ?? 'Citizen’s Charter Source'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="btn-icon press row-btn"
          aria-label="Close source"
        >
          {Icons.close}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {doc && (
          <div className="enter">
            <p className="text-[13px] text-[var(--label-2)]">
              Official Citizen&apos;s Charter · {doc.agency} · Updated {doc.recorded_at}
            </p>
            <div className="mt-4 rounded-xl bg-[#fcfcfc] p-6 font-mono text-[13px] shadow-[0_0_0_1px_var(--hairline),0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="text-center">
                <p className="text-[11px] tracking-[0.12em] text-[var(--label-2)]">
                  REPUBLIC OF THE PHILIPPINES
                </p>
                <p className="mt-1 font-medium">{doc.agency}</p>
                <p className="mt-0.5 text-[12px] text-[var(--label-2)]">{doc.title}</p>
              </div>
              <div className="mt-6 space-y-2">
                {doc.rows.map((row) => (
                  <div
                    key={row.label}
                    className={`flex flex-col gap-1 rounded-md px-2.5 py-2 ${row.cited
                      ? 'bg-[var(--accent-soft)] shadow-[inset_3px_0_0_var(--accent)]'
                      : ''
                      }`}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase ${row.cited ? 'text-[var(--accent-ink)]' : 'text-[var(--label-2)]'
                        }`}
                    >
                      {row.label}
                    </span>
                    <span className="text-[12px] leading-snug text-[var(--fg)]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[13px] text-[var(--label-2)]">
              Highlighted provisions are the exact rules used by GovGuidePH to flag expired,
              mismatched, or missing information.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*  Guided Spotlight Tour (`e_` Tour Overlay)                                 */
/* -------------------------------------------------------------------------- */

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to GovGuidePH',
    body: 'An AI assistant that prepares your Philippine government requirements checklist and inspects your IDs & documents for expired dates, mismatched details, and missing fields before you queue.',
  },
  {
    id: 'composer',
    target: 'composer',
    placement: 'top',
    title: 'Ask or send your requirements',
    body: 'Type what government service you need in English, Filipino, or Taglish, or paste/upload your document details for an instant AI pre-flight check.',
  },
  {
    id: 'pills',
    target: 'pills',
    placement: 'top',
    title: 'One-tap checklists & demos',
    body: 'Generate an official checklist or test how the AI catches an expired ID, birth date mismatch, or incomplete Barangay Certificate.',
  },
  {
    id: 'attach',
    target: 'attach',
    placement: 'top',
    title: 'Upload IDs, forms, or try a Demo Specimen',
    body: 'Attach photos or PDFs of your requirements—or pick one of the built-in Demo IDs—to see the AI highlight expired, mismatched, and missing information.',
  },
  {
    id: 'details',
    target: 'nav-details',
    placement: 'right',
    title: 'My Details (Supabase Cloud Vault)',
    body: 'Store your personal details, IDs, requirements checklists, and AI inspection scorecards securely in Supabase Cloud Vault under RA 10173 privacy rules.',
  },
  {
    id: 'account',
    target: 'account',
    placement: 'right',
    title: 'Switch Applicant Persona',
    body: 'Test how the AI cross-checks documents for a First-Time Jobseeker vs. a Married Applicant with maiden/married surname rules.',
  },
];

function TourOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = TOUR_STEPS[Math.min(stepIdx, TOUR_STEPS.length - 1)];
  const isLast = stepIdx >= TOUR_STEPS.length - 1;

  if (!open) return null;

  return (
    <div
      className="tour-root fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      data-open={open}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="tour-card relative w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-[0_0_0_1px_var(--hairline),0_16px_48px_rgba(0,0,0,0.18)]"
      >
        <div className="tour-step">
          <div className="flex items-center justify-between gap-3">
            {step.id === 'welcome' ? (
              <LogoMark size={32} />
            ) : (
              <span className="text-[12px] font-medium text-[var(--label-2)] tabular-nums">
                {stepIdx} of {TOUR_STEPS.length - 1}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStepIdx(0);
                onClose();
              }}
              className="press text-[13px] text-[var(--label-2)] hover:text-[var(--fg)]"
            >
              {isLast ? 'Close' : 'Skip tour'}
            </button>
          </div>
          <h2 id="tour-title" className="mt-3 text-[17px] leading-snug font-semibold tracking-tight">
            {step.title}
          </h2>
          <p id="tour-body" className="mt-1.5 text-[14px] leading-relaxed text-[var(--label-2)]">
            {step.body}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-1" aria-hidden="true">
            {TOUR_STEPS.map((s, idx) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === stepIdx
                  ? 'w-4 bg-[var(--brand)]'
                  : idx < stepIdx
                    ? 'w-1.5 bg-[var(--brand)]/40'
                    : 'w-1.5 bg-[var(--fill-2)]'
                  }`}
              />
            ))}
          </div>
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              className="btn btn-ghost press btn-sm"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                setStepIdx(0);
                onClose();
              } else {
                setStepIdx((i) => i + 1);
              }
            }}
            className="btn btn-primary press btn-sm"
          >
            <span>{stepIdx === 0 ? 'Show me around' : isLast ? 'Get started' : 'Next'}</span>
            {!isLast && Icons.chevronRight}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chat Message Types & Shortcut Pills                                       */
/* -------------------------------------------------------------------------- */

interface ChatCardPayload {
  kind: 'inspection_report' | 'checklist_card' | 'guardrail_notice' | 'expense_receipt' | 'online_application';
  report?: InspectionReport;
  guardrail?: GuardrailCardData;
  checklist?: {
    service_code: string;
    service_name: string;
    agency_name: string;
    processing_fee: number;
    convenience_fee?: number;
    counter_tips: string[];
    items: ChecklistRequirementItem[];
  };
  serviceCode?: string;
  onlineApplication?: OnlineApplicationData;
}

interface ChatMessage {
  id: number | string;
  from: 'user' | 'agent';
  text?: string;
  files?: string[];
  previews?: (string | null)[];
  phase?: 'booting' | 'working' | 'done';
  steps?: StepItem[];
  reply?: {
    text: string;
    cards: ChatCardPayload[];
    next: NextActionItem[];
  };
  error?: string;
}

interface ConversationThread {
  id: string;
  title: string;
  messages: ChatMessage[];
}

const SHORTCUT_PILLS = [
  {
    id: 'nbi_checklist',
    label: 'Prepare NBI Checklist',
    icon: Icons.tasks,
  },
  {
    id: 'psa_helpline',
    label: 'PSA Helpline Doorstep Delivery',
    icon: Icons.doc,
  },
  {
    id: 'demo_expired_id',
    label: 'Check Expired/Mismatch ID',
    icon: Icons.upload,
  },
  {
    id: 'demo_brgy',
    label: 'Inspect Brgy. Certificate',
    icon: Icons.docLg,
  },
];

function FileThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!url) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-[7px] bg-white text-[var(--label-2)] shadow-[0_0_0_1px_var(--hairline)]">
        {Icons.docLg}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={file.name}
      className="h-10 w-10 rounded-[7px] object-cover shadow-[0_0_0_1px_var(--hairline)]"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Main CitizenChatPage (GovGuide PH Shell + ChatGPT UI/UX)                  */
/* -------------------------------------------------------------------------- */

const subscribeNoop = () => () => { };

export default function CitizenChatPage() {
  const [role, setRole] = useState<'jobseeker' | 'married_applicant' | 'new_citizen'>('new_citizen');
  const [view, setView] = useState<
    'chat' | 'details' | 'referrals' | 'tasks' | 'notifications'
  >('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState<'Auto' | 'English' | 'Filipino'>('Auto');
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);
  const [deleteDialogThread, setDeleteDialogThread] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [applicant, setApplicant] = useState<ApplicantProfile>(() => PROFILES.new_citizen);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [savedFiles, setSavedFiles] = useState<SavedVaultFile[]>([]);
  const [checklistItems, setChecklistItems] =
    useState<ChecklistRequirementItem[]>(createCleanChecklists);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(createInitialAuditLogs);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Agency Milestone Bridge States (Chrome Extension Live Sync)
  const [agencyMilestones, setAgencyMilestones] = useState<CitizenServiceRequest[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('govguide_read_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const unreadMilestonesCount = useMemo(() => {
    return agencyMilestones.filter((m) => !readNotificationIds.includes(m.id)).length;
  }, [agencyMilestones, readNotificationIds]);
  const lastSeenRequestStateRef = useRef<Map<string, { step: number; status: string; notes: string }>>(new Map());

  const [sourceDrawerId, setSourceDrawerId] = useState<string | null>(null);
  const [branchDrawerData, setBranchDrawerData] = useState<RemediationBranchData | null>(null);
  const [isPsaFormOpen, setIsPsaFormOpen] = useState(false);
  const [isDfaModalOpen, setIsDfaModalOpen] = useState(false);
  const [isDpwhModalOpen, setIsDpwhModalOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestPromptTurnIdRef = useRef<string | null>(null);
  const preventBottomScrollRef = useRef(false);
  const composerWrapRef = useRef<HTMLDivElement>(null);
  const lastComposerTopRef = useRef<number | null>(null);
  const msgCounterRef = useRef(1);

  // Hydrate My Details (profile, files, checklists, inspections, chat threads) directly from Supabase
  useEffect(() => {
    let isMounted = true;

    async function hydrateFromSupabase() {
      try {
        // 0. Check Supabase auth session
        const { data: authData } = await supabase.auth.getUser();

        if (!authData?.user) {
          // Guest Mode: temporary session — do not load or persist any threads or profile details
          if (isMounted) {
            setAuthUser(null);
            setApplicant(PROFILES.new_citizen);
            setThreads([]);
            setActiveThreadId(null);
            setSavedFiles([]);
            setChecklistItems(createCleanChecklists());
            setInspections([]);
          }
          return;
        }

        if (authData?.user && isMounted) {
          const user = authData.user;
          setAuthUser(user);
          const targetCitizenId = user.id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && isMounted) {
            let agencyObj: { id: string; code: string; name: string } | null = null;
            if (profile.agency_id) {
              const { data: ag } = await supabase
                .from('agencies')
                .select('id, code, name')
                .eq('id', profile.agency_id)
                .maybeSingle();
              if (ag) agencyObj = ag;
            }
            if (!agencyObj) {
              if (user.email?.includes('psa')) agencyObj = { id: 'psa', code: 'PSA', name: 'Philippine Statistics Authority' };
              else if (user.email?.includes('dfa')) agencyObj = { id: 'dfa', code: 'DFA', name: 'Department of Foreign Affairs' };
              else if (user.email?.includes('dpwh')) agencyObj = { id: 'dpwh', code: 'DPWH', name: 'Department of Public Works and Highways' };
            }

            const isAgency = profile.role === 'agency_admin' || !!profile.agency_id || !!agencyObj || (user.email ? user.email.endsWith('.gov.ph') : false);

            const displayName = isAgency && agencyObj
              ? `${agencyObj.name} (${agencyObj.code})`
              : (profile.full_name || profile.first_name || user.email?.split('@')[0] || 'Citizen Applicant');

            const initials = isAgency && agencyObj
              ? agencyObj.code
              : ((profile.full_name || user.email || 'CA').slice(0, 2).toUpperCase());

            const title = isAgency && agencyObj
              ? `${agencyObj.code} · Official Agency Account`
              : 'Verified Account';

            setApplicant((prev) => ({
              ...prev,
              id: profile.id,
              role: isAgency ? 'agency_admin' : 'citizen',
              display_name: displayName,
              first_name: isAgency && agencyObj ? agencyObj.name : (profile.first_name || undefined),
              middle_name: profile.middle_name || undefined,
              last_name: isAgency && agencyObj ? `(${agencyObj.code})` : (profile.last_name || undefined),
              suffix: profile.suffix || undefined,
              birth_date: profile.birth_date || '',
              civil_status: profile.civil_status || '',
              barangay: profile.barangay || '',
              city: profile.city || '',
              phone: profile.phone || '',
              email: profile.email || user.email || '',
              initials,
              title,
            }));
          }

          // 1. Fetch citizen profile, vault documents, checklists, inspections from Supabase
          const detailsRes = await fetch(`/api/citizen/details?citizenId=${encodeURIComponent(targetCitizenId)}`);
          if (detailsRes.ok && isMounted) {
            const { data } = await safeResponseJson(detailsRes);
            if (data?.ok && data.applicant) {
              setApplicant((prev) => ({ ...prev, ...data.applicant }));
              if (Array.isArray(data.savedFiles)) setSavedFiles(data.savedFiles);
              if (Array.isArray(data.checklistItems)) setChecklistItems(data.checklistItems);
              if (Array.isArray(data.inspections)) setInspections(data.inspections);
            }
          }

          // 2. Fetch chat threads directly from Supabase for this authenticated citizen only
          const threadsRes = await fetch(`/api/chat/threads?citizenId=${encodeURIComponent(targetCitizenId)}`);
          if (threadsRes.ok && isMounted) {
            const { data } = await safeResponseJson(threadsRes);
            if (data?.ok && Array.isArray(data.threads)) {
              setThreads(data.threads);
              // Keep activeThreadId as null on load/refresh so it returns to create another chat
            }
          }
        }
      } catch {
        // Safe ignore
      } finally {
        if (isMounted) setSupabaseReady(true);
      }
    }

    void hydrateFromSupabase();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        setAuthUser(session.user);
      } else if (!session && isMounted) {
        setAuthUser(null);
        setApplicant(PROFILES.new_citizen);
        setThreads([]);
        setActiveThreadId(null);
        setSavedFiles([]);
        setChecklistItems(createCleanChecklists());
        setInspections([]);
      }
    });

    return () => {
      isMounted = false;
      authSub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time synchronization with Chrome Extension & Agency Officer updates (Authenticated only)
  useEffect(() => {
    if (!authUser || applicant.id === PROFILES.new_citizen.id) return;
    let isMounted = true;

    async function checkAgencyUpdates() {
      try {
        const res = await fetch(`/api/citizen/requests?citizenId=${encodeURIComponent(applicant.id)}`);
        if (!res.ok) return;
        const { data: json } = await safeResponseJson(res);
        if (!json || !json.success || !Array.isArray(json.data) || !isMounted) return;

        const currentList: CitizenServiceRequest[] = json.data;
        setAgencyMilestones(currentList);

        const prevMap = lastSeenRequestStateRef.current;
        if (prevMap.size === 0) {
          currentList.forEach((r) => {
            prevMap.set(r.id, { step: r.currentStep, status: r.status, notes: r.officerNotes });
          });
          return;
        }

        for (const req of currentList) {
          const prev = prevMap.get(req.id);
          if (
            prev &&
            (prev.step !== req.currentStep || prev.status !== req.status || prev.notes !== req.officerNotes)
          ) {
            // Milestone updated by Agency Chrome Extension!
            prevMap.set(req.id, { step: req.currentStep, status: req.status, notes: req.officerNotes });
            setReadNotificationIds((prevIds) => {
              const nextIds = prevIds.filter((id) => id !== req.id);
              try {
                localStorage.setItem('govguide_read_notifications', JSON.stringify(nextIds));
              } catch {}
              return nextIds;
            });

            const milestoneMsg: ChatMessage = {
              id: `agency-milestone-${Date.now()}`,
              from: 'agent',
              text:
                `🏛️ **Live Agency Update: ${req.agencyName}**\n\n` +
                `**Service:** ${req.serviceTitle} (Ref \`#${req.referenceNumber}\`)\n` +
                `**Milestone:** Step ${req.currentStep} of ${req.totalSteps} — **${req.statusLabel}**\n` +
                `**Reviewing Officer:** ${req.officerName} (${req.officerRole})\n` +
                (req.officerNotes ? `**Counter Directive:** *"${req.officerNotes}"*\n` : '') +
                (req.appointmentSchedule ? `🗓️ **Counter Schedule:** ${req.appointmentSchedule}\n` : '') +
                `\n*This milestone was advanced live by the agency counter officer via GovGuide Chrome Extension.*`,
              phase: 'done',
              reply: {
                text: `Your ${req.serviceTitle} is now marked as **${req.statusLabel}**. Review the directive above or select an option below:`,
                cards: [],
                next: [
                  {
                    id: 'claim_checklist',
                    label: `📋 Checklist for ${req.agencyCode} Pickup`,
                    action: 'message',
                    text: `What are the exact documents and IDs I need to bring for my ${req.serviceTitle} pickup at ${req.agencyCode}?`,
                  },
                  {
                    id: 'branch_directions',
                    label: `📍 Directions & Counter Hours`,
                    action: 'message',
                    text: `What are the operating hours and location for ${req.location}?`,
                  },
                ],
              },
            };

            setThreads((prevThreads) => {
              if (prevThreads.length === 0) {
                const newThread: ConversationThread = {
                  id: `thread-${Date.now()}`,
                  title: `${req.agencyCode} Application Status`,
                  messages: [milestoneMsg],
                };
                setActiveThreadId(newThread.id);
                return [newThread];
              }
              return prevThreads.map((t) => {
                if (t.id === (activeThreadId || prevThreads[0].id)) {
                  return { ...t, messages: [...t.messages, milestoneMsg] };
                }
                return t;
              });
            });
          } else if (!prev) {
            prevMap.set(req.id, { step: req.currentStep, status: req.status, notes: req.officerNotes });
          }
        }
      } catch {
        // Safe ignore transient polling errors
      }
    }

    const interval = setInterval(checkAgencyUpdates, 3500);
    window.addEventListener('focus', checkAgencyUpdates);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', checkAgencyUpdates);
    };
  }, [authUser, applicant.id, activeThreadId]);

  // Persist Citizen Details & Broadcast to Chrome Extension in real-time (Authenticated only)
  useEffect(() => {
    if (!authUser || applicant.id === PROFILES.new_citizen.id) return;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('govguide_active_applicant', JSON.stringify(applicant));
        localStorage.setItem('govguide_active_citizen_id', applicant.id);
        window.postMessage(
          {
            type: 'GOVGUIDE_MY_DETAILS_UPDATED',
            applicant,
            citizenId: applicant.id,
            timestamp: Date.now(),
          },
          '*'
        );
      } catch {
        // Safe ignore
      }
    }

    const timer = setTimeout(() => {
      void fetch('/api/citizen/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId: applicant.id,
          applicant,
          savedFiles,
          checklistItems,
          inspections,
        }),
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [authUser, applicant, savedFiles, checklistItems, inspections]);

  const syncThreadToSupabase = useCallback(
    async (thread: ConversationThread) => {
      // Guest Mode chats are strictly temporary and must never be saved
      if (!authUser || applicant.id === PROFILES.new_citizen.id) return;
      try {
        await fetch('/api/chat/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: thread.id,
            citizenId: applicant.id,
            title: thread.title,
            applicantName: applicant.display_name,
            messages: thread.messages,
            isGuest: false,
          }),
        });
      } catch {
        // Non-blocking sync
      }
    },
    [authUser, applicant.id, applicant.display_name],
  );

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messages = useMemo(() => activeThread?.messages ?? [], [activeThread]);
  const isEmptyChat = messages.length === 0;

  const activeServiceCode = useMemo(() => {
    const lastMsgWithCard = [...messages].reverse().find((m) => m.reply?.cards?.length);
    const chkCard = lastMsgWithCard?.reply?.cards?.find(
      (c) => c.kind === 'checklist_card' && c.checklist,
    );
    if (chkCard?.checklist?.service_code) return chkCard.checklist.service_code;
    const inspCard = lastMsgWithCard?.reply?.cards?.find(
      (c) => c.kind === 'inspection_report' && c.report,
    );
    if (inspCard?.report?.service_code) return inspCard.report.service_code;
    return 'NBI_CLEARANCE';
  }, [messages]);

  const greeting = useSyncExternalStore(
    subscribeNoop,
    () => {
      const h = new Date().getHours();
      return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : 'Good evening';
    },
    () => 'Hello',
  );

  // Smooth FLIP transition on composer when moving from empty state to active chat (smooth spring feel)
  useLayoutEffect(() => {
    const el = composerWrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const prevTop = lastComposerTopRef.current;
    lastComposerTopRef.current = top;
    if (prevTop === null) return;
    const delta = prevTop - top;
    if (Math.abs(delta) >= 2 && typeof el.animate === 'function') {
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
        duration: 520,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      });
    }
  }, [isEmptyChat]);

  useEffect(() => {
    const sc = scrollContainerRef.current;
    if (!sc || isEmptyChat) return;

    if (preventBottomScrollRef.current) {
      preventBottomScrollRef.current = false;
      return;
    }

    if (latestPromptTurnIdRef.current) {
      const el = document.getElementById(`msg-${latestPromptTurnIdRef.current}`);
      if (el) {
        const scRect = sc.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetScrollTop = elRect.top - scRect.top + sc.scrollTop;
        sc.scrollTo({
          top: Math.max(0, targetScrollTop - 16),
          behavior: 'smooth',
        });
      }
    }
  }, [messages, isEmptyChat]);

  useEffect(() => {
    if (view === 'chat') {
      preventBottomScrollRef.current = false;
    }
  }, [view]);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      // If not an image or already under 1.2MB, read directly
      if (!file.type.startsWith('image/') || file.size < 1.2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      // Downsample large images (>1.2MB) to prevent Next.js 413 payload errors or Gemini timeouts
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          resolve('');
          return;
        }
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          resolve(result);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 1600;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.88));
              return;
            }
          } catch {
            // ignore canvas error and fall back to raw data URL
          }
          resolve(result);
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

  const sendTurn = useCallback(
    async (
      customText?: string,
      customFiles?: File[],
      serviceOverride?: string,
      fromOpenInChat = false,
    ) => {
      const filesToSend = customFiles ?? attachedFiles;
      const textToSend = (customText ?? inputText).trim();
      if (busy || (!textToSend && filesToSend.length === 0)) return;

      const safeDisplayText = redactSecrets(textToSend);
      const isFirstTurnInChat =
        activeThreadId === null ||
        (threads.find((t) => t.id === activeThreadId)?.messages.length ?? 0) === 0;
      const isSimpleFirstGreeting =
        isFirstTurnInChat &&
        filesToSend.length === 0 &&
        /^(hi|hello|hey|good\s+(morning|afternoon|evening)|kumusta|kamusta)(\s+(po|govguide|govguideph|there|friend)|\s*[!?.])*$/i.test(
          textToSend,
        );

      let threadId = activeThreadId;
      if (threadId === null) {
        threadId = `chat-${Date.now()}`;
        const rawTitle = filesToSend.length
          ? filesToSend.length === 1
            ? filesToSend[0].name.slice(0, 34)
            : `${filesToSend.length} uploaded documents`
          : safeDisplayText.length > 34
            ? `${safeDisplayText.slice(0, 34)}...`
            : safeDisplayText;
        setThreads((prev) => [{ id: threadId!, title: rawTitle, messages: [] }, ...prev]);
        setActiveThreadId(threadId);
      }

      if (isSimpleFirstGreeting) {
        const userMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const agentMsgId = `agt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        latestPromptTurnIdRef.current = String(userMsgId);

        const isFilGreeting =
          language === 'Filipino' || /^(kumusta|kamusta)\b/i.test(textToSend);
        const greetingReplyText = isFilGreeting
          ? 'Magandang araw! Ako ang **GovGuide PH**. Maaari kitang tulungan sa iyong **PSA Birth Certificate**, **NBI Clearance**, at **Barangay Certificate**. Alin sa mga ito ang kailangan mo ngayon?'
          : 'Hello! I am **GovGuide PH**. I can help you with your **PSA Birth Certificate**, **NBI Clearance**, and **Barangay Certificate** requirements. Which one would you like to start with?';

        const greetingUserMsg: ChatMessage = {
          id: userMsgId,
          from: 'user',
          text: safeDisplayText,
        };
        const greetingAgentMsg: ChatMessage = {
          id: agentMsgId,
          from: 'agent',
          phase: 'done',
          reply: {
            text: greetingReplyText,
            cards: [],
            next: [
              {
                id: 'offer_psa',
                label: 'PSA Birth Certificate',
                hint: isFilGreeting
                  ? 'Requirements, doorstep delivery (₱365), o walk-in CRS (₱155)'
                  : 'Requirements, doorstep delivery (₱365), or walk-in CRS (₱155)',
                action: 'message',
                text: isFilGreeting
                  ? 'Paano kumuha ng PSA Birth Certificate at ano ang mga requirements?'
                  : 'How do I get a PSA Birth Certificate and what are the requirements?',
              },
              {
                id: 'offer_nbi',
                label: 'NBI Clearance',
                hint: isFilGreeting
                  ? 'Requirements checklist, valid IDs, at RA 11261 First-Time Jobseeker'
                  : 'Requirements checklist, valid IDs, and RA 11261 First-Time Jobseeker',
                action: 'message',
                text: isFilGreeting
                  ? 'Ano ang mga requirements at hakbang sa pagkuha ng NBI Clearance?'
                  : 'What are the requirements and steps to get an NBI Clearance?',
              },
              {
                id: 'offer_brgy',
                label: 'Barangay Certificate',
                hint: isFilGreeting
                  ? 'RA 11261 First-Time Jobseeker, 90-day validity, dry seal, at Oath of Undertaking'
                  : 'RA 11261 First-Time Jobseeker, 90-day validity, dry seal, and Oath of Undertaking',
                action: 'message',
                text: isFilGreeting
                  ? 'Paano kumuha ng Barangay Certificate (RA 11261) at ano ang dapat bantayan?'
                  : 'How do I get a Barangay Certificate (RA 11261) and what should I check?',
              },
            ],
          },
        };

        setThreads((prev) => {
          const next = prev.map((t) =>
            t.id === threadId
              ? { ...t, messages: [...t.messages, greetingUserMsg, greetingAgentMsg] }
              : t,
          );
          const currentT = next.find((t) => t.id === threadId);
          if (currentT) {
            void syncThreadToSupabase(currentT);
          }
          return next;
        });
        setInputText('');
        setAttachedFiles([]);
        return;
      }

      const previews = filesToSend.map((f) =>
        f.type.startsWith('image/') || f.type === 'application/pdf'
          ? URL.createObjectURL(f)
          : null,
      );

      const userMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const agentMsgId = `agt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      latestPromptTurnIdRef.current = String(userMsgId);

      const isExpensePrompt =
        /\b(magkano|bayad|bayarin|gastusin|fee|fees|cost|price|presyo|resibo|receipt|rates?|breakdown|waiver|libre)\b/i.test(
          textToSend,
        );

      const userMsg: ChatMessage = {
        id: userMsgId,
        from: 'user',
        text: safeDisplayText || 'Attached requirements for AI inspection',
        files: filesToSend.length ? filesToSend.map((f) => f.name) : undefined,
        previews: filesToSend.length ? previews : undefined,
      };

      const isInspection = filesToSend.length > 0;
      const lower = textToSend.toLowerCase();
      const isJobseeker = /\b(jobseeker|job\s*seeking|unang\s*trabaho|naghahanap\s*ng\s*trabaho|ra\s*11261)\b/i.test(lower);
      const isPsa = /\b(psa|helpline|birth\s*cert|marriage\s*cert|delivery|courier)\b/i.test(lower);
      const isNbi = /\b(nbi|clearance|hit|fingerprint|biometrics)\b/i.test(lower);
      const isPhilhealth = /\b(philhealth|pmrf|mdr|pin|member)\b/i.test(lower);
      const isDfa = /\b(dfa|passport|epassport|consular|aseana)\b/i.test(lower);
      const isDpwh = /\b(dpwh|infrastructure|kalsada|tulay|highway|contract)\b/i.test(lower);

      const initialAgentMsg: ChatMessage = {
        id: agentMsgId,
        from: 'agent',
        phase: 'working',
      };

      setThreads((prev) => {
        const next = prev.map((t) =>
          t.id === threadId
            ? { ...t, messages: [...t.messages, userMsg, initialAgentMsg] }
            : t,
        );
        const currentT = next.find((t) => t.id === threadId);
        if (currentT) {
          void syncThreadToSupabase(currentT);
        }
        return next;
      });
      setInputText('');
      setAttachedFiles([]);
      setBusy(true);

      preventBottomScrollRef.current = false;
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${userMsgId}`);
          if (el && scrollContainerRef.current) {
            const sc = scrollContainerRef.current;
            const scRect = sc.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const targetScrollTop = elRect.top - scRect.top + sc.scrollTop;
            sc.scrollTo({
              top: Math.max(0, targetScrollTop - 16),
              behavior: 'smooth',
            });
          }
        });
      }


      try {
        const encodedAttachments = await Promise.all(
          filesToSend.map(async (f) => ({
            name: f.name,
            type: f.type,
            dataUrl: f.type.startsWith('image/') ? await fileToDataUrl(f) : undefined,
          })),
        );

        // Call inspection API directly and wait naturally for processing to finish
        const res = await fetch('/api/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSend,
            attachments: encodedAttachments,
            applicant,
            savedFiles,
            language,
            serviceCode: serviceOverride,
          }),
        });
        const data = await parseResponseJson(res);
        if (!data || !data.ok) {
          throw new Error(data?.message || 'Inspection request failed');
        }

        // Learn personal details from chat and update My Details profile in real-time
        if (data.learnedDetails && Object.keys(data.learnedDetails).length > 0) {
          setApplicant((prev) => {
            const hasExistingName = Boolean(
              prev.display_name &&
              prev.display_name !== 'Guest Account' &&
              prev.display_name !== 'Citizen Account' &&
              prev.role !== 'new_citizen'
            );
            const sanitized = { ...data.learnedDetails };
            if (hasExistingName) {
              delete sanitized.display_name;
              delete sanitized.first_name;
              delete sanitized.middle_name;
              delete sanitized.last_name;
            }
            return {
              ...prev,
              ...sanitized,
            };
          });
        }

        // Sync any newly created service process from inquiry into agencyMilestones
        if (data.createdRequest) {
          setAgencyMilestones((prev) => {
            const exists = prev.some((r) => r.id === data.createdRequest.id);
            return exists ? prev : [data.createdRequest, ...prev];
          });
        }

        // Open official PSA, DFA, or DPWH forms/reviews modal if requested by citizen
        const lowerPromptText = textToSend.toLowerCase();
        if (
          /\b(psa\s*form|birth\s*cert(ificate)?\s*form|crs\s*form|fill\s*out\s*psa)\b/i.test(
            lowerPromptText,
          )
        ) {
          setIsPsaFormOpen(true);
        }
        if (
          /\b(book\s*dfa|dfa\s*form|dfa\s*appointment\s*scheduler|open\s*dfa\s*scheduler|schedule\s*passport)\b/i.test(
            lowerPromptText,
          )
        ) {
          setIsDfaModalOpen(true);
        }
        if (
          /\b(open\s*dpwh|view\s*dpwh\s*reviews|write\s*dpwh\s*review|dpwh\s*modal)\b/i.test(
            lowerPromptText,
          )
        ) {
          setIsDpwhModalOpen(true);
        }

        // Append Gastusin Receipt Card at the end if cost/fee inquiry was asked
        let finalCards: ChatCardPayload[] = data.cards ? [...data.cards] : [];
        const isCivicExpenseService =
          Boolean(serviceOverride) ||
          isPsa ||
          isPhilhealth ||
          isDpwh ||
          /\b(nbi|clearance)\b/i.test(lower);

        if (isExpensePrompt && !data.blocked && isCivicExpenseService) {
          const hasReceipt = finalCards.some((c) => c.kind === 'expense_receipt');
          if (!hasReceipt) {
            const detectedService =
              serviceOverride ||
              (isPsa
                ? 'PSA_HELPLINE'
                : isPhilhealth
                  ? 'PHILHEALTH'
                  : isDpwh
                    ? 'DPWH'
                    : 'NBI');
            finalCards.push({
              kind: 'expense_receipt',
              serviceCode: detectedService,
            });
          }
        }

        // Append Online Application Readiness Card if service can/cannot be processed online
        const hasOnlineAppCard = finalCards.some((c) => c.kind === 'online_application');
        if (!hasOnlineAppCard && !data.blocked) {
          const detectedOnlineService =
            serviceOverride ||
            (isPsa
              ? 'PSA_BIRTH_CERT'
              : /\b(nbi|clearance)\b/i.test(lower)
                ? 'NBI_CLEARANCE'
                : /\b(dfa|passport)\b/i.test(lower)
                  ? 'DFA_PASSPORT'
                  : undefined);
          const onlineReadiness = evaluateOnlineReadiness(
            detectedOnlineService,
            textToSend,
            applicant,
            savedFiles,
          );
          if (onlineReadiness) {
            finalCards.push({
              kind: 'online_application',
              serviceCode: detectedOnlineService || onlineReadiness.serviceCode,
              onlineApplication: onlineReadiness,
            });
          }
        }

        // Update global inspections, checklists, and audit logs if an inspection or guardrail event occurred
        const guardrailCard = (data.cards || []).find(
          (c: ChatCardPayload) => c.kind === 'guardrail_notice' && c.guardrail,
        );
        if (guardrailCard?.guardrail) {
          const gr: GuardrailCardData = guardrailCard.guardrail;
          setAuditLogs((prev) => {
            const prevHash = prev[0]?.hash ?? null;
            const newId = `log-${String(prev.length + 1).padStart(4, '0')}`;
            const ts = new Date().toISOString();
            const action = `Guardrail Blocked: ${gr.title}`;
            const hash = computeHash(`${prevHash}|${newId}|${ts}|${action}`);
            return [
              {
                id: newId,
                ts,
                user_name: applicant.display_name,
                role: 'Citizen',
                action,
                tool: 'evaluate_guardrails',
                document_name: gr.policy_code,
                reason: `${gr.badge} · ${gr.law_citation}`,
                outcome: 'flagged_issue',
                flagged: true,
                prev_hash: prevHash,
                hash,
              },
              ...prev,
            ];
          });
        }

        const reportCard = (data.cards || []).find(
          (c: ChatCardPayload) => c.kind === 'inspection_report' && c.report,
        );
        if (reportCard?.report) {
          const rep: InspectionReport = reportCard.report;
          setInspections((prev) => [rep, ...prev.filter((p) => p.file_name !== rep.file_name)]);

          // Also sync or upsert the inspected document into My Details savedFiles vault
          const totalIssuesCount =
            rep.summary_counts.expired +
            rep.summary_counts.mismatch +
            rep.summary_counts.missing;
          const summaryNote =
            totalIssuesCount > 0
              ? rep.issues[0]?.title || `${totalIssuesCount} issue(s) flagged`
              : 'Verified 100% Counter-Ready against My Details';
          const uploadedDataUrl = encodedAttachments[0]?.dataUrl;

          setSavedFiles((prev) => {
            const existingIdx = prev.findIndex((f) => f.name === rep.file_name);
            if (existingIdx !== -1) {
              return prev.map((f, idx) =>
                idx === existingIdx
                  ? {
                    ...f,
                    document_type: rep.document_title,
                    status: rep.overall_status === 'counter_ready' ? 'counter_ready' : 'issues_found',
                    issue_summary: summaryNote,
                  }
                  : f,
              );
            }
            const newVaultEntry: SavedVaultFile = {
              id: `vault-${Date.now()}`,
              name: rep.file_name,
              document_type: rep.document_title,
              service_code: rep.service_code || 'NBI_CLEARANCE',
              size_label: '150 KB',
              mime_type: encodedAttachments[0]?.type || 'image/png',
              preview_url: uploadedDataUrl || `/demo/${rep.file_name}`,
              uploaded_at: new Date().toISOString(),
              status: rep.overall_status === 'counter_ready' ? 'counter_ready' : 'issues_found',
              issue_summary: summaryNote,
              extracted_name:
                rep.fields.find((f) => f.key === 'full_name')?.value ||
                (applicant.role === 'new_citizen' ? 'Extracted from Document' : applicant.display_name),
              extracted_dob:
                rep.fields.find((f) => f.key === 'birth_date')?.value ||
                (applicant.role === 'new_citizen' ? 'Extracted from Document' : applicant.birth_date),
            };
            return [newVaultEntry, ...prev];
          });

          // Sync checklist status
          const checklistCard = (data.cards || []).find(
            (c: ChatCardPayload) => c.kind === 'checklist_card' && c.checklist,
          );
          if (checklistCard?.checklist?.items) {
            setChecklistItems((prev) => {
              const updatedMap = new Map<string, ChecklistRequirementItem>(
                checklistCard.checklist.items.map((i: ChecklistRequirementItem) => [i.id, i]),
              );
              return prev.map((item) => updatedMap.get(item.id) || item);
            });
          }

          // Append hash-chained audit entry
          setAuditLogs((prev) => {
            const prevHash = prev[0]?.hash ?? null;
            const newId = `log-${String(prev.length + 1).padStart(4, '0')}`;
            const ts = new Date().toISOString();
            const action = `Inspected ${rep.document_title}`;
            const hash = computeHash(`${prevHash}|${newId}|${ts}|${action}`);
            const totalIssues =
              rep.summary_counts.expired +
              rep.summary_counts.mismatch +
              rep.summary_counts.missing;
            return [
              {
                id: newId,
                ts,
                user_name: applicant.display_name,
                role: 'Citizen',
                action,
                tool: 'inspect_document',
                document_name: rep.file_name,
                reason:
                  totalIssues > 0
                    ? `Flagged: ${rep.summary_counts.expired} expired, ${rep.summary_counts.mismatch} mismatched, ${rep.summary_counts.missing} missing`
                    : 'Verified 100% Counter-Ready',
                outcome: totalIssues > 0 ? 'flagged_issue' : 'counter_ready',
                flagged: totalIssues > 0,
                prev_hash: prevHash,
                hash,
              },
              ...prev,
            ];
          });
        }

        setThreads((prev) => {
          const next = prev.map((t) =>
            t.id !== threadId
              ? t
              : {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === agentMsgId
                    ? {
                      ...m,
                      phase: 'done' as const,
                      reply: {
                        text: data.text,
                        cards: finalCards,
                        next: data.next || [],
                      },
                    }
                    : m,
                ),
              },
          );
          const currentT = next.find((t) => t.id === threadId);
          if (currentT) {
            void syncThreadToSupabase(currentT);
          }
          return next;
        });
      } catch {
        setThreads((prev) =>
          prev.map((t) =>
            t.id !== threadId
              ? t
              : {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === agentMsgId
                    ? {
                      ...m,
                      phase: 'done' as const,
                      steps: [],
                      error: 'Something went wrong while inspecting. Please try again.',
                    }
                    : m,
                ),
              },
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [attachedFiles, inputText, busy, activeThreadId, applicant, savedFiles, language, syncThreadToSupabase],
  );

  const loadDemoAndSend = useCallback(
    async (
      path: string,
      name: string,
      type: string,
      promptText: string,
      fromOpenInChat = false,
    ) => {
      if (busy) return;
      if (fromOpenInChat) {
        preventBottomScrollRef.current = true;
      }
      try {
        const res = await fetch(path);
        const blob = await res.blob();
        const file = new File([blob], name, { type });
        setView('chat');
        await sendTurn(promptText, [file], undefined, fromOpenInChat);
      } catch {
        setView('chat');
        await sendTurn(promptText, undefined, undefined, fromOpenInChat);
      }
    },
    [busy, sendTurn],
  );

  const handleAddVaultFiles = useCallback(
    async (files: File[], docTypeOverride?: string, serviceCodeOverride?: string) => {
      const initialEntries: SavedVaultFile[] = await Promise.all(
        files.map(async (f, idx) => {
          const dataUrl = f.type.startsWith('image/') ? await fileToDataUrl(f) : undefined;
          const lower = f.name.toLowerCase();
          const docType =
            docTypeOverride ||
            (lower.includes('cert') || lower.includes('brgy') || lower.includes('psa')
              ? 'Official Certificate / Form'
              : lower.includes('id') || lower.includes('passport') || lower.includes('philsys')
                ? 'Primary Government ID'
                : 'Supporting Requirement');
          const kb = Math.max(12, Math.round(f.size / 1024));
          return {
            id: `vault-${Date.now()}-${idx}`,
            name: f.name,
            document_type: `${f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')} (${docType})`,
            service_code: serviceCodeOverride || 'NBI_CLEARANCE',
            size_label: `${kb} KB`,
            mime_type: f.type || 'image/png',
            preview_url: dataUrl,
            uploaded_at: new Date().toISOString(),
            status: 'inspecting' as const,
            issue_summary: 'AI checking document...',
          };
        }),
      );

      // Add to vault immediately with inspecting state
      setSavedFiles((prev) => [...initialEntries, ...prev]);

      // Automatically inspect each file with the AI
      for (const entry of initialEntries) {
        try {
          const res = await fetch('/api/inspect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `Inspect uploaded document ${entry.name}`,
              serviceCode: entry.service_code,
              language: 'English',
              applicant,
              attachments: [
                {
                  name: entry.name,
                  type: entry.mime_type,
                  dataUrl: entry.preview_url,
                },
              ],
            }),
          });

          if (res.ok) {
            const { data } = await safeResponseJson(res);
            if (data?.learnedDetails && Object.keys(data.learnedDetails).length > 0) {
              setApplicant((prev) => {
                const hasExistingName = Boolean(
                  prev.display_name &&
                  prev.display_name !== 'Guest Account' &&
                  prev.display_name !== 'Citizen Account' &&
                  prev.role !== 'new_citizen'
                );
                const sanitized = { ...data.learnedDetails };
                if (hasExistingName) {
                  delete sanitized.display_name;
                  delete sanitized.first_name;
                  delete sanitized.middle_name;
                  delete sanitized.last_name;
                }
                return {
                  ...prev,
                  ...sanitized,
                };
              });
            }

            const report: InspectionReport | undefined =
              data?.inspection || data?.cards?.find((c: any) => c.kind === 'inspection_report')?.report;

            if (report) {
              setInspections((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);

              const isProfileBlank =
                !applicant.display_name?.trim() ||
                applicant.display_name === 'Guest Account' ||
                applicant.display_name === 'Citizen Account' ||
                applicant.role === 'new_citizen' ||
                !applicant.birth_date;

              const realIssues = report.issues.filter((iss) => {
                if (iss.category === 'valid') return false;
                const text = `${iss.title || ''} ${iss.detail || ''}`.toLowerCase();
                // Suppress demo name mismatch on non-jobseeker accounts
                if (applicant.role !== 'jobseeker' && text.includes('juan santos dela cruz')) {
                  return false;
                }
                if (
                  isProfileBlank &&
                  (text.includes('profile does not specify') ||
                    text.includes('full name not provided') ||
                    text.includes('applicant full name') ||
                    text.includes('update your applicant profile') ||
                    text.includes('profile is empty') ||
                    text.includes('name mismatch') ||
                    text.includes('does not match the applicant profile'))
                ) {
                  return false;
                }
                return true;
              });

              const counts = report.summary_counts || { expired: 0, mismatch: 0, missing: 0 };
              const hasIssues =
                (report.overall_status === 'issues_found' && realIssues.length > 0) ||
                (counts.expired > 0 && !entry.name.toLowerCase().includes('psa') && !entry.name.toLowerCase().includes('birth'));

              if (hasIssues) {
                const criticalIssue =
                  realIssues[0] || report.issues.find((i) => i.category !== 'valid') || report.issues[0];
                const what = criticalIssue
                  ? `${criticalIssue.title}: ${criticalIssue.detail}`
                  : 'Document discrepancies flagged against Citizen’s Charter standards.';
                const howToFix =
                  criticalIssue?.how_to_fix ||
                  criticalIssue?.remediation ||
                  'Renew or update your document, or upload an alternative unexpired Primary ID.';

                setSavedFiles((prev) => {
                  const next = prev.map((item) =>
                    item.id === entry.id
                      ? {
                        ...item,
                        status: 'issues_found' as const,
                        document_type: report.document_title || item.document_type,
                        issue_summary: criticalIssue?.title || 'Discrepancy Detected',
                        discrepancy_what: what,
                        discrepancy_how_to_fix: howToFix,
                      }
                      : item,
                  );
                  setChecklistItems((prevChk) =>
                    reconcileChecklistWithVault(prevChk, applicant, next, [report, ...inspections]),
                  );
                  return next;
                });
              } else {
                // Document is valid and counter-ready: establish / confirm personal information
                if (report.fields && Array.isArray(report.fields)) {
                  const updatedInfo: Partial<ApplicantProfile> = {};

                  for (const f of report.fields) {
                    if (!f.value || typeof f.value !== 'string' || !f.value.trim() || f.value === 'Not specified') continue;
                    const val = f.value.trim();
                    const k = (f.key || '').toLowerCase();
                    const lbl = (f.label || '').toLowerCase();

                    if (
                      (k === 'full_name' || k === 'name' || /full\s*name/i.test(lbl)) &&
                      val !== 'CITIZEN APPLICANT'
                    ) {
                      updatedInfo.display_name = val;
                      const parts = parseNameParts(val);
                      updatedInfo.first_name = parts.first_name;
                      updatedInfo.middle_name = parts.middle_name;
                      updatedInfo.last_name = parts.last_name;
                      updatedInfo.suffix = parts.suffix;
                      updatedInfo.initials = computeInitials(val);
                    }

                    if (
                      (k === 'birth_date' || k === 'dob' || /birth/i.test(lbl)) &&
                      val !== 'Foundational Identity Record'
                    ) {
                      updatedInfo.birth_date = val;
                    }

                    if ((k === 'gender' || k === 'sex' || /gender|sex/i.test(lbl)) && !updatedInfo.gender) {
                      updatedInfo.gender = /f/i.test(val) ? 'Female' : 'Male';
                    }

                    if (k === 'father_name' || /father.*name/i.test(lbl)) {
                      updatedInfo.father_name = val;
                      const fParts = parseNameParts(val);
                      if (!updatedInfo.father_first_name) updatedInfo.father_first_name = fParts.first_name;
                      if (!updatedInfo.father_middle_name) updatedInfo.father_middle_name = fParts.middle_name;
                      if (!updatedInfo.father_last_name) updatedInfo.father_last_name = fParts.last_name;
                    }
                    if (k === 'father_first_name') updatedInfo.father_first_name = val;
                    if (k === 'father_middle_name') updatedInfo.father_middle_name = val;
                    if (k === 'father_last_name') updatedInfo.father_last_name = val;

                    if (k === 'mother_maiden_name' || k === 'mother_name' || /mother.*name/i.test(lbl)) {
                      updatedInfo.mother_maiden_name = val;
                      const mParts = parseNameParts(val);
                      if (!updatedInfo.mother_first_name) updatedInfo.mother_first_name = mParts.first_name;
                      if (!updatedInfo.mother_middle_name) updatedInfo.mother_middle_name = mParts.middle_name;
                      if (!updatedInfo.mother_last_name) updatedInfo.mother_last_name = mParts.last_name;
                    }
                    if (k === 'mother_first_name') updatedInfo.mother_first_name = val;
                    if (k === 'mother_middle_name') updatedInfo.mother_middle_name = val;
                    if (k === 'mother_last_name') updatedInfo.mother_last_name = val;

                    if (k === 'barangay' || /barangay/i.test(lbl)) updatedInfo.barangay = val;
                    if (k === 'city' || /city|municipality/i.test(lbl)) updatedInfo.city = val;
                    if (k === 'province' || /province/i.test(lbl)) updatedInfo.province = val;
                    if (k === 'place_of_birth' || /place of birth/i.test(lbl)) updatedInfo.place_of_birth = val;
                    if (k === 'street_address' || /street/i.test(lbl)) updatedInfo.street_address = val;
                    if (k === 'residential_address' || /residential|address/i.test(lbl)) updatedInfo.residential_address = val;
                    if ((k === 'philsys_id' || k === 'id_number' || /philsys|national id/i.test(lbl)) && /\d{4}/.test(val) && !val.includes('••••')) {
                      updatedInfo.philsys_id = val;
                      updatedInfo.philsys_card_number = val;
                    }
                  }

                  if (updatedInfo.residential_address && (!updatedInfo.barangay || !updatedInfo.city)) {
                    const addr = parseAddressParts(updatedInfo.residential_address);
                    if (!updatedInfo.street_address && addr.street) updatedInfo.street_address = addr.street;
                    if (!updatedInfo.barangay && addr.barangay) updatedInfo.barangay = addr.barangay;
                    if (!updatedInfo.city && addr.city) updatedInfo.city = addr.city;
                    if (!updatedInfo.province && addr.province) updatedInfo.province = addr.province;
                  }
                  if (updatedInfo.place_of_birth && (!updatedInfo.city || !updatedInfo.province)) {
                    const pob = parseAddressParts(updatedInfo.place_of_birth);
                    if (!updatedInfo.city && pob.city) updatedInfo.city = pob.city;
                    if (!updatedInfo.province && pob.province) updatedInfo.province = pob.province;
                  }

                  if (Object.keys(updatedInfo).length > 0) {
                    setApplicant((prev) => ({ ...prev, ...updatedInfo }));
                  }
                }

                setSavedFiles((prev) => {
                  const next = prev.map((item) =>
                    item.id === entry.id
                      ? {
                        ...item,
                        status: 'counter_ready' as const,
                        document_type: report.document_title || item.document_type,
                        issue_summary: 'All goods',
                        discrepancy_what: undefined,
                        discrepancy_how_to_fix: undefined,
                      }
                      : item,
                  );
                  setChecklistItems((prevChk) =>
                    reconcileChecklistWithVault(prevChk, applicant, next, [report, ...inspections]),
                  );
                  return next;
                });
              }
              continue;
            }
          }
        } catch (err) {
          console.error('[handleAddVaultFiles] AI Inspection failed for file:', entry.name, err);
        }

        // Fallback if inspection API was unreachable
        setSavedFiles((prev) => {
          const next = prev.map((item) =>
            item.id === entry.id
              ? {
                ...item,
                status: 'counter_ready' as const,
                issue_summary: 'All goods',
              }
              : item,
          );
          setChecklistItems((prevChk) =>
            reconcileChecklistWithVault(prevChk, applicant, next, inspections),
          );
          return next;
        });
      }
    },
    [applicant, inspections],
  );

  const handleRemoveVaultFile = useCallback((id: string) => {
    setSavedFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== id);
      setChecklistItems((prevChk) =>
        reconcileChecklistWithVault(prevChk, applicant, remaining, inspections),
      );
      return remaining;
    });
  }, [applicant, inspections]);

  const handleInspectVaultFile = useCallback(
    async (vaultFile: SavedVaultFile) => {
      if (busy) return;
      preventBottomScrollRef.current = true;
      const prompt = `Please inspect my saved document "${vaultFile.document_type}" (${vaultFile.name}) and cross-check every field against my My Details profile (${applicant.display_name}, DOB ${applicant.birth_date}) for expired, mismatched, or missing info.`;
      if (vaultFile.preview_url) {
        await loadDemoAndSend(vaultFile.preview_url, vaultFile.name, vaultFile.mime_type, prompt, true);
      } else {
        setView('chat');
        await sendTurn(prompt, undefined, undefined, true);
      }
    },
    [busy, applicant, loadDemoAndSend, sendTurn],
  );

  const handleResetMyDetailsToDemo = useCallback(() => {
    const defaultProfile = PROFILES.new_citizen;
    setApplicant(defaultProfile);
    setSavedFiles([]);
    setChecklistItems(createCleanChecklists());
    setInspections([]);
    void fetch(`/api/citizen/details?citizenId=${encodeURIComponent(defaultProfile.id)}`, {
      method: 'DELETE',
    });
  }, []);

  const openFilePicker = (kind: 'any' | 'image' | 'pdf' = 'any') => {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept =
      kind === 'pdf'
        ? 'application/pdf'
        : kind === 'image'
          ? 'image/jpeg,image/png,image/webp'
          : 'image/jpeg,image/png,image/webp,application/pdf';
    input.click();
  };

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            status: item.status === 'verified' ? 'pending' : 'verified',
            issue_note:
              item.status === 'verified' ? undefined : 'Marked ready by applicant',
          }
          : item,
      ),
    );
  }, []);

  const toggleSkipChecklistItem = useCallback((id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            status: item.status === 'skipped' ? 'pending' : 'skipped',
            issue_note:
              item.status === 'skipped'
                ? undefined
                : 'Marked skipped by applicant (Not needed)',
          }
          : item,
      ),
    );
  }, []);

  const confirmInspectionFields = useCallback(
    (reportId: string, updatedFields: ExtractedField[]) => {
      let targetFileName = '';
      setInspections((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            targetFileName = r.file_name;
            return {
              ...r,
              overall_status: 'counter_ready',
              summary_counts: {
                expired: 0,
                mismatch: 0,
                missing: 0,
                valid: updatedFields.length,
              },
              fields: updatedFields,
            };
          }
          return r;
        }),
      );
      if (targetFileName) {
        setSavedFiles((prev) => {
          const nextFiles = prev.map((f) =>
            f.name === targetFileName
              ? {
                ...f,
                status: 'counter_ready' as const,
                issue_summary: 'Reviewed & confirmed by applicant in My Details',
                discrepancy_what: undefined,
              }
              : f,
          );
          setChecklistItems((prevChk) =>
            reconcileChecklistWithVault(prevChk, applicant, nextFiles, inspections),
          );
          return nextFiles;
        });
      }
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.status === 'issue'
            ? {
              ...item,
              status: 'verified',
              issue_note: 'Reviewed & confirmed by applicant',
            }
            : item,
        ),
      );
    },
    [applicant, inspections],
  );

  const triggerInspectForService = useCallback(
    (serviceCode: string, reqName: string) => {
      preventBottomScrollRef.current = false;
      setView('chat');
      const lower = reqName.toLowerCase();
      if (lower.includes('barangay') || lower.includes('oath')) {
        void loadDemoAndSend(
          '/demo/incomplete-brgy-cert.png',
          'incomplete-brgy-cert.png',
          'image/png',
          `Please inspect my ${reqName} for ${serviceCode} and check for expired, mismatched, or missing info.`,
          true,
        );
      } else {
        void loadDemoAndSend(
          '/demo/expired-postal-id.png',
          'expired-postal-id.png',
          'image/png',
          `Please inspect my ${reqName} for ${serviceCode} and check for expired, mismatched, or missing info.`,
          true,
        );
      }
    },
    [loadDemoAndSend],
  );

  const handleResolveBranch = useCallback(
    (requirementName: string, resolutionNote: string, replacementFileName?: string) => {
      // 1. Update checklist items
      setChecklistItems((prev) =>
        prev.map((item) => {
          const match =
            item.name.toLowerCase().includes(requirementName.toLowerCase()) ||
            requirementName.toLowerCase().includes(item.name.toLowerCase());
          if (match) {
            return {
              ...item,
              status: 'verified',
              issue_note: resolutionNote,
            };
          }
          return item;
        }),
      );

      // 2. Log to audit logs with SHA-256 hash
      const nowTs = new Date().toISOString();
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          ts: nowTs,
          user_name: applicant.display_name,
          role: applicant.role === 'jobseeker' ? 'First-Time Jobseeker' : 'Citizen',
          action: `Remediation Resolved: ${requirementName}`,
          tool: 'remediation_subchat',
          document_name: requirementName,
          reason: resolutionNote,
          outcome: 'verified',
          flagged: false,
          prev_hash: prev[0]?.hash ?? null,
          hash: computeHash(`${nowTs}:${requirementName}:${resolutionNote}`),
        },
        ...prev,
      ]);

      // 3. Post system notice in active conversation thread
      const systemNotice: ChatMessage = {
        id: Date.now(),
        from: 'agent',
        phase: 'done',
        reply: {
          text: `### Naresolba: ${requirementName}\n\n**Aksyon:** ${resolutionNote}\n\n*Opisyal na Update:* Na-update ang iyong **Service Checklist**. Handa na ito para sa biometrics capture at counter verification alinsunod sa Citizen's Charter standards.`,
          cards: [],
          next: [],
        },
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId ? { ...t, messages: [...t.messages, systemNotice] } : t,
        ),
      );
    },
    [activeThreadId, applicant.display_name, applicant.role],
  );

  const ctxValue = useMemo<AppContextValue>(
    () => ({
      applicant,
      openSource: (id: string) => setSourceDrawerId(id),
      checklistItems,
      toggleChecklistItem,
      toggleSkipChecklistItem,
      confirmInspectionFields,
      triggerInspectForService,
      openRemediationBranch: (data: RemediationBranchData) => setBranchDrawerData(data),
    }),
    [
      applicant,
      checklistItems,
      toggleChecklistItem,
      toggleSkipChecklistItem,
      confirmInspectionFields,
      triggerInspectForService,
    ],
  );

  const openChecklistCount = checklistItems.filter(
    (i) => i.status !== 'verified' && i.status !== 'skipped',
  ).length;
  const flaggedInspectionsCount = inspections.filter(
    (i) => i.overall_status === 'issues_found',
  ).length;
  const isMyDetailsActive = view === 'details' || view === 'referrals' || view === 'tasks';
  const lastMsg = messages.at(-1);
  const isGuest = !authUser;

  const nextActions =
    !busy && lastMsg?.from === 'agent' && lastMsg.phase === 'done'
      ? (lastMsg.reply?.next ?? [])
      : [];

  return (
    <AppContext.Provider value={ctxValue}>
      <div
        className="shell h-dvh bg-white"
        data-collapsed={isGuest ? 'true' : sidebarCollapsed}
        style={isGuest ? { gridTemplateColumns: '1fr' } : undefined}
      >
        {/* Left Sidebar (Only for authenticated users; removed on guest mode) */}
        {!isGuest && (
          <aside
          className="sidebar bg-[var(--sidebar)]"
          data-mobile-open={mobileMenuOpen}
          aria-label="Sidebar"
        >
          <div className="sidebar-inner flex h-full flex-col">
            <div className="flex h-12 items-center gap-2 px-3">
              <LogoMark size={26} />
              <span className="flex-1 text-[14px] font-semibold tracking-tight">GovGuidePH</span>
              <button
                type="button"
                className="btn-icon press"
                onClick={() => {
                  if (window.innerWidth >= 768) setSidebarCollapsed(true);
                  else setMobileMenuOpen(false);
                }}
                aria-label="Hide sidebar"
              >
                {Icons.sidebar}
              </button>
            </div>

            <nav className="grid gap-0.5 px-2 pt-1" aria-label="Primary">
              <button
                type="button"
                aria-current={view === 'chat' && activeThreadId === null ? 'page' : undefined}
                onClick={() => {
                  setActiveThreadId(null);
                  setView('chat');
                  setMobileMenuOpen(false);
                }}
                className={`row-btn press flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[14px] ${view === 'chat' && activeThreadId === null ? 'bg-[var(--fill-2)] font-medium' : ''
                  }`}
              >
                <span
                  className={
                    view === 'chat' && activeThreadId === null
                      ? 'text-[var(--brand)]'
                      : 'text-[var(--label-2)]'
                  }
                >
                  {Icons.chat}
                </span>
                <span className="flex-1">New chat</span>
              </button>

              <button
                type="button"
                data-tour="nav-details"
                aria-current={isMyDetailsActive ? 'page' : undefined}
                onClick={() => {
                  setView('details');
                  setMobileMenuOpen(false);
                }}
                className={`row-btn press flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[14px] ${isMyDetailsActive ? 'bg-[var(--fill-2)] font-medium' : ''
                  }`}
              >
                <span
                  className={
                    isMyDetailsActive ? 'text-[var(--brand)]' : 'text-[var(--label-2)]'
                  }
                >
                  {Icons.user}
                </span>
                <span className="flex-1">My Details</span>
                {(flaggedInspectionsCount > 0 || openChecklistCount > 0) && (
                  <span className="text-[12px] text-[var(--label-2)] tabular-nums">
                    {flaggedInspectionsCount + openChecklistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                data-tour="notifications"
                aria-current={view === 'notifications' ? 'page' : undefined}
                onClick={() => {
                  setView('notifications');
                  const allIds = Array.from(new Set([...readNotificationIds, ...agencyMilestones.map((m) => m.id)]));
                  setReadNotificationIds(allIds);
                  try {
                    localStorage.setItem('govguide_read_notifications', JSON.stringify(allIds));
                  } catch {}
                  setMobileMenuOpen(false);
                }}
                className={`row-btn press flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[14px] ${
                  view === 'notifications' ? 'bg-[var(--fill-2)] font-medium text-[var(--fg)]' : ''
                }`}
              >
                <span
                  className={
                    view === 'notifications' ? 'text-[var(--brand)]' : 'text-[var(--label-2)]'
                  }
                >
                  {Icons.bell}
                </span>
                <span className="flex-1">Notifications</span>
                {unreadMilestonesCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-2xs">
                    {unreadMilestonesCount}
                  </span>
                )}
              </button>
            </nav>

            <div className="mx-4 my-3 h-px bg-[var(--hairline)]" aria-hidden="true" />

            <div className="flex items-center justify-between px-4 pb-1">
              <span className="text-[12px] font-medium text-[var(--label-2)]">Recents</span>
              <button
                type="button"
                onClick={() => {
                  setActiveThreadId(null);
                  setView('chat');
                  setMobileMenuOpen(false);
                }}
                className="btn-icon press h-6 w-6"
                aria-label="New chat"
              >
                {Icons.plus}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {threads.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[13px] text-[var(--label-3)]">No chats yet</p>
              ) : (
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
                  {threads.map((t, tIdx) => {
                    const isActive = view === 'chat' && activeThreadId === t.id;
                    return (
                      <li key={`${t.id}-${tIdx}`} className="enter min-w-0">
                        <div
                          className={`row-btn flex h-8 min-w-0 items-center gap-1 rounded-[8px] pr-1.5 ${isActive ? 'bg-[var(--fill-2)]' : ''
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveThreadId(t.id);
                              setView('chat');
                              setMobileMenuOpen(false);
                            }}
                            title={t.title}
                            className={`flex h-full min-w-0 flex-1 items-center rounded-[8px] pl-2.5 text-left text-[13px] ${isActive ? 'font-medium' : ''
                              }`}
                          >
                            <span className="truncate">{t.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteDialogThread({ id: t.id, title: t.title })}
                            aria-label={`Delete chat "${t.title}"`}
                            className="press flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[var(--label-3)] hover:bg-[var(--fill-2)] hover:text-[var(--fg)]"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Bottom Account / Persona Switcher */}
            <div className="px-2 pb-2">
              <div className="mb-2 h-px bg-[var(--hairline)]" aria-hidden="true" />
              <Popover
                label="Account"
                placement="top-start"
                className="w-[254px]"
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    data-tour="account"
                    onClick={toggle}
                    aria-expanded={open}
                    className="row-btn press flex h-auto w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[14px]"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xs ${
                      applicant.role === 'agency_admin' ? 'bg-blue-600' : 'bg-[var(--fg)]'
                    }`}>
                      {authUser
                        ? (applicant.initials || 'CA')
                        : 'GA'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {authUser
                          ? (applicant.display_name || authUser.email || 'Citizen Account')
                          : 'Guest Citizen'}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--label-2)]">
                        {authUser
                          ? (applicant.role === 'agency_admin' ? `Official Agency · ${authUser.email}` : (authUser.email || 'Verified Account'))
                          : 'Not signed in'}
                      </span>
                    </span>
                    <span className="text-[var(--label-3)]">{Icons.chevronDown}</span>
                  </button>
                )}
              >
                {(close) => (
                  <div role="menu" aria-label="Account Settings & Presets">
                    {authUser ? (
                      <div>
                        <div className="px-2.5 py-2 border-b border-[var(--hairline)] bg-slate-50/50">
                          {applicant.role === 'agency_admin' ? (
                            <>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Government Agency</p>
                              </div>
                              <p className="text-[13px] font-bold text-slate-900 truncate">{applicant.display_name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{authUser.email}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[11px] font-medium text-slate-500">Signed In As</p>
                              <p className="text-[13px] font-semibold text-slate-900 truncate">{authUser.email}</p>
                            </>
                          )}
                        </div>
                        <div className="py-1">
                          {applicant.role === 'agency_admin' && (
                            <Link
                              href="/agency/dashboard"
                              onClick={close}
                              className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-semibold text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span>Agency Admin Dashboard</span>
                            </Link>
                          )}
                          <MenuItemRadio
                            onSelect={() => {
                              close();
                              setView('details');
                            }}
                          >
                            {applicant.role === 'agency_admin' ? 'View Agency Profile & Services' : 'Edit My Details & Files'}
                          </MenuItemRadio>
                          <MenuItemRadio
                            onSelect={() => {
                              close();
                              setTourOpen(true);
                            }}
                          >
                            Take the tour
                          </MenuItemRadio>
                        </div>
                        <div className="my-1 h-px bg-[var(--hairline)]" aria-hidden="true" />
                        <MenuItemRadio
                          onSelect={async () => {
                            close();
                            await supabase.auth.signOut();
                            setAuthUser(null);
                            setApplicant(PROFILES.new_citizen);
                            setRole('new_citizen');
                            setSavedFiles([]);
                            setChecklistItems(createCleanChecklists());
                            setInspections([]);
                          }}
                        >
                          Sign Out
                        </MenuItemRadio>
                      </div>
                    ) : (
                      <div>
                        <div className="px-2.5 py-2 border-b border-[var(--hairline)]">
                          <p className="text-[11px] font-medium text-slate-500">Account</p>
                          <p className="text-[13px] font-semibold text-slate-900">Guest Citizen</p>
                          <p className="text-[11px] text-slate-500">Not signed in</p>
                        </div>
                        <div className="py-1">
                          <MenuItemRadio
                            onSelect={() => {
                              close();
                              setView('details');
                            }}
                          >
                            Edit My Details &amp; Files
                          </MenuItemRadio>
                          <MenuItemRadio
                            onSelect={() => {
                              close();
                              setTourOpen(true);
                            }}
                          >
                            Take the tour
                          </MenuItemRadio>
                        </div>
                        <div className="my-1 h-px bg-[var(--hairline)]" aria-hidden="true" />
                        <Link
                          href="/login"
                          onClick={close}
                          className="block px-2.5 py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-slate-50 rounded"
                        >
                          Sign In / Register
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </Popover>
            </div>
          </div>
        </aside>
        )}

        {/* Mobile Backdrop */}
        {!isGuest && (
        <div
          className="mobile-backdrop"
          data-open={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
        )}

        {/* Main Content Area */}
        <main className="relative flex min-w-0 flex-col overflow-hidden">
          {/* Guest Mode Header */}
          {isGuest && (
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--hairline)] px-4 bg-white select-none z-20">
              <div className="flex items-center gap-2.5">
                <LogoMark size={26} priority />
                <span className="text-[14px] font-semibold tracking-tight text-slate-900">GovGuide PH</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/60">
                  Guest Mode · Temporary Chat
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveThreadId(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Start a fresh temporary chat"
                >
                  {Icons.plus}
                  <span>New chat</span>
                </button>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            </header>
          )}

          {/* Floating Sidebar Toggle Button for Collapsed State or Mobile (Authenticated Only) */}
          {!isGuest && (sidebarCollapsed || !mobileMenuOpen) && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                  setSidebarCollapsed(false);
                } else {
                  setMobileMenuOpen(true);
                }
              }}
              className={`absolute top-3.5 left-3.5 z-30 h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white/90 text-slate-700 shadow-xs backdrop-blur-sm hover:bg-slate-50 transition-all ${
                sidebarCollapsed ? 'flex' : 'md:hidden flex'
              }`}
              aria-label="Toggle navigation sidebar"
              title="Toggle navigation sidebar"
            >
              {Icons.sidebar}
            </button>
          )}

          {/* Active View Router */}
          {isMyDetailsActive && (
            <MyDetailsView
              applicant={applicant}
              onUpdateApplicant={(next) => {
                setApplicant(next);
                setChecklistItems((prevChk) =>
                  reconcileChecklistWithVault(prevChk, next, savedFiles, inspections),
                );
              }}
              onResetAllToDemo={handleResetMyDetailsToDemo}
              savedFiles={savedFiles}
              onAddVaultFiles={handleAddVaultFiles}
              onRemoveVaultFile={handleRemoveVaultFile}
              onInspectVaultFile={(f) => void handleInspectVaultFile(f)}
              inspections={inspections}
              onAskInChat={(prompt, demoFile) => {
                preventBottomScrollRef.current = false;
                setView('chat');
                if (demoFile) {
                  void loadDemoAndSend(demoFile.path, demoFile.name, demoFile.type, prompt, true);
                } else {
                  void sendTurn(prompt, undefined, undefined, true);
                }
              }}
              onCheckInChat={(serviceCode, reqName) =>
                triggerInspectForService(serviceCode, reqName)
              }
              onPreviewImage={(src, name) => setLightbox({ src, name })}
            />
          )}

          {view === 'notifications' && (
            <GmailNotificationsView
              agencyMilestones={agencyMilestones}
              readNotificationIds={readNotificationIds}
              onMarkAsRead={(id: string) => {
                setReadNotificationIds((prev) => {
                  if (prev.includes(id)) return prev;
                  const next = [...prev, id];
                  try {
                    localStorage.setItem('govguide_read_notifications', JSON.stringify(next));
                  } catch {}
                  return next;
                });
              }}
              onMarkAllAsRead={() => {
                const allIds = Array.from(new Set([...readNotificationIds, ...agencyMilestones.map((m) => m.id)]));
                setReadNotificationIds(allIds);
                try {
                  localStorage.setItem('govguide_read_notifications', JSON.stringify(allIds));
                } catch {}
              }}
              inspections={inspections}
              applicantName={applicant.display_name}
              onAskInChat={(prompt) => {
                preventBottomScrollRef.current = false;
                setView('chat');
                void sendTurn(prompt, undefined, undefined, true);
              }}
              onViewTasks={() => setView('tasks')}
              onViewDetails={() => setView('details')}
              onBackToChat={() => setView('chat')}
            />
          )}

          {view === 'chat' && (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Main Chat Column */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Welcoming Citizen Landing (on Empty Chat) */}
                {isEmptyChat && (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center select-none overflow-y-auto">
                    <div className="relative mb-3 flex items-center justify-center">
                      <div className="absolute -inset-2 rounded-full bg-slate-200/50 blur-lg" aria-hidden="true" />
                      <LogoMark size={56} priority />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 max-w-xl">
                      {isGuest
                        ? 'Kumusta! Paano kita matutulungan?'
                        : applicant.role === 'agency_admin'
                        ? applicant.display_name
                        : !applicant.display_name
                        ? 'Mangyaring punan muna ang form sa My Details bago makipag-chat.'
                        : `Kumusta, ${applicant.first_name || applicant.display_name.split(' ')[0]}!`}
                    </h1>
                    <p className="mt-2 text-[13px] text-slate-500 max-w-md">
                      {isGuest
                        ? 'Mabilis at opisyal na gabay sa mga serbisyo at dokumento ng gobyerno. Magtanong o pumili sa ibaba.'
                        : applicant.role === 'agency_admin'
                        ? 'Opisyal na Portal ng Ahensya · Subaybayan ang mga transaksyon, counter requirements, at Citizen’s Charter.'
                        : !applicant.display_name
                        ? 'Punan ang inyong impormasyon sa My Details bago makipag-chat.'
                        : 'Mabilis at opisyal na gabay sa mga serbisyo at dokumento ng gobyerno. Magtanong o pumili sa ibaba.'}
                    </p>
                    {!isGuest && !applicant.display_name && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setView('details')}
                          className="press inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
                        >
                          {Icons.user}
                          <span>Punan ang My Details</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Chat Scroll Area (When messages exist) */}
                {!isEmptyChat && (
                  <div
                    ref={scrollContainerRef}
                    className="min-h-0 flex-1 overflow-y-auto"
                  >
                    <div
                      role="log"
                      aria-live="polite"
                      className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 pt-2 pb-6"
                    >
                      {messages.map((msg, msgIdx) => {
                        const uniqueMsgKey = msg.id ? `msg-${msg.id}-${msgIdx}` : `msg-idx-${msgIdx}`;
                        return msg.from === 'user' ? (
                          <div key={uniqueMsgKey} id={`msg-${msg.id}`} className="enter flex flex-col items-end gap-1.5 scroll-mt-4">
                            {msg.files && (
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {msg.files.map((fName, idx) => {
                                  const prevUrl = msg.previews?.[idx];
                                  return prevUrl ? (
                                    <button
                                      key={`${fName}-${idx}`}
                                      type="button"
                                      onClick={() => setLightbox({ src: prevUrl, name: fName })}
                                      title={fName}
                                      className="press block cursor-zoom-in overflow-hidden rounded-[14px] bg-white shadow-[0_0_0_1px_var(--hairline)]"
                                    >
                                      <img
                                        src={prevUrl}
                                        alt={`Preview of ${fName}`}
                                        className="block max-h-[220px] max-w-[260px] object-cover max-sm:max-w-[200px]"
                                      />
                                    </button>
                                  ) : (
                                    <span
                                      key={`${fName}-${idx}`}
                                      className="inline-flex items-center gap-1.5 rounded-[10px] bg-white px-2.5 py-1.5 text-[12px] shadow-[0_0_0_1px_var(--hairline)]"
                                    >
                                      {Icons.docLg}
                                      {fName}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            <p className="max-w-[80%] rounded-[18px] bg-[var(--fill-2)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--fg)]">
                              {msg.text}
                            </p>
                          </div>
                        ) : (
                          <div key={uniqueMsgKey} id={`msg-${msg.id}`} className="enter-card flex gap-3 scroll-mt-4">
                            <LogoMark size={24} className="mt-0.5 shrink-0" />
                            <div className="flex min-w-0 flex-1 flex-col gap-3">
                              {msg.phase !== 'done' ? (
                                <div className="enter flex items-center py-2" role="status" aria-label="Loading">
                                  <Spinner
                                    variant="main"
                                    size={24}
                                    label="GovGuidePH is working"
                                  />
                                </div>
                              ) : (
                                msg.reply && (
                                  <div className="enter-card flex flex-col gap-3">
                                      <AgentResponseView
                                        text={
                                          msg.reply.text === 'Out of scope.' ||
                                          msg.reply.text.startsWith('[Scope Guardrail:')
                                            ? 'I do not understand it, please clarify your request/question'
                                            : msg.reply.text
                                        }
                                        onOpenSource={(id) => setSourceDrawerId(id)}
                                        cards={
                                          msg.reply.cards && msg.reply.cards.length > 0 ? (
                                            <div className="space-y-3">
                                              {msg.reply.cards.map((c, cIdx) => {
                                                if (c.kind === 'guardrail_notice' && c.guardrail) {
                                                  if (
                                                    c.guardrail.category === 'OUT_OF_SCOPE' ||
                                                    c.guardrail.policy_code === 'GRD-SCP-004'
                                                  ) {
                                                    return null;
                                                  }
                                                  return (
                                                    <GuardrailAlertCard
                                                      key={`grd-${cIdx}`}
                                                      guardrail={c.guardrail}
                                                    />
                                                  );
                                                }
                                                if (c.kind === 'inspection_report' && c.report) {
                                                  return (
                                                    <InspectionReportCard
                                                      key={`rep-${cIdx}`}
                                                      report={c.report}
                                                    />
                                                  );
                                                }
                                                if (c.kind === 'checklist_card' && c.checklist) {
                                                  return (
                                                    <InteractiveChecklistCard
                                                      key={`chk-${cIdx}`}
                                                      checklist={c.checklist}
                                                    />
                                                  );
                                                }
                                                if (c.kind === 'expense_receipt') {
                                                  return (
                                                    <div key={`rec-${cIdx}`} className="w-full max-w-md pt-1">
                                                      <ExpenseReceiptCard
                                                        initialService={
                                                          c.serviceCode?.startsWith('PSA')
                                                            ? 'PSA_HELPLINE'
                                                            : c.serviceCode?.startsWith('PHILHEALTH')
                                                              ? 'PHILHEALTH'
                                                              : c.serviceCode?.startsWith('DFA')
                                                                ? 'DFA'
                                                                : c.serviceCode?.startsWith('DPWH')
                                                                  ? 'DPWH'
                                                                  : 'NBI'
                                                        }
                                                        isFirstTimeJobseeker={applicant.role === 'jobseeker'}
                                                        applicantName={applicant.display_name}
                                                        onAskInChat={(p) => void sendTurn(p)}
                                                      />
                                                    </div>
                                                  );
                                                }
                                                if (c.kind === 'online_application' && c.onlineApplication) {
                                                  return (
                                                    <div key={`online-${cIdx}`} className="w-full pt-1">
                                                      <OnlineApplicationCard
                                                        data={c.onlineApplication}
                                                        onOpenPsaForm={() => setIsPsaFormOpen(true)}
                                                        onOpenDfaScheduler={() => setIsDfaModalOpen(true)}
                                                        onAskInChat={(p) => void sendTurn(p)}
                                                      />
                                                    </div>
                                                  );
                                                }
                                                return null;
                                              })}

                                              {/* In-chat interactive action triggers for DFA, DPWH, and PSA */}
                                              {(/\b(dfa|passport|consular)\b/i.test(msg.reply.text || '') ||
                                                /\b(dpwh|infrastructure|public works|pothole|road review)\b/i.test(msg.reply.text || '') ||
                                                /\b(psa|birth cert|secpa|psahelpline)\b/i.test(msg.reply.text || '')) && (
                                                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                                    {/\b(dfa|passport|consular)\b/i.test(msg.reply.text || '') && (
                                                      <button
                                                        type="button"
                                                        onClick={() => setIsDfaModalOpen(true)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs hover:bg-slate-50 transition"
                                                      >
                                                        {Icons.passport}
                                                        <span>Open DFA Appointment Scheduler</span>
                                                      </button>
                                                    )}
                                                    {/\b(dpwh|infrastructure|public works|pothole|road review)\b/i.test(msg.reply.text || '') && (
                                                      <button
                                                        type="button"
                                                        onClick={() => setIsDpwhModalOpen(true)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs hover:bg-slate-50 transition"
                                                      >
                                                        {Icons.construction}
                                                        <span>View DPWH Projects &amp; Reviews</span>
                                                      </button>
                                                    )}
                                                    {/\b(psa|birth cert|secpa|psahelpline)\b/i.test(msg.reply.text || '') && (
                                                      <button
                                                        type="button"
                                                        onClick={() => setIsPsaFormOpen(true)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs hover:bg-slate-50 transition"
                                                      >
                                                        {Icons.doc}
                                                        <span>Open Official PSA Application Form</span>
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                          ) : null
                                        }
                                        nextActions={
                                          msg.id === lastMsg?.id && nextActions.length > 0 ? (
                                            <NextActionsCard
                                              items={nextActions}
                                              onPick={(item) => {
                                                if (item.action === 'message' && item.text) {
                                                  void sendTurn(item.text);
                                                } else if (item.action === 'attach') {
                                                  openFilePicker('any');
                                                } else if (item.action === 'demo_file' && item.file) {
                                                  void loadDemoAndSend(
                                                    item.file.path,
                                                    item.file.name,
                                                    item.file.type,
                                                    item.text || 'Please inspect this document.',
                                                  );
                                                } else if (item.action === 'view' && item.view) {
                                                  setView(item.view);
                                                }
                                              }}
                                            />
                                          ) : null
                                        }
                                      />
                                    </div>
                                  )
                                )}
                              {msg.error && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                                  {msg.error}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4 Shortcut Pills on Empty Chat (at the bottom part above composer) */}
                {isEmptyChat && (
                  <div
                    data-tour="pills"
                    className="mx-auto mb-2.5 grid w-full max-w-[760px] shrink-0 grid-cols-2 gap-2 px-4 sm:grid-cols-4"
                  >
                    {SHORTCUT_PILLS.map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (pill.id === 'nbi_checklist') {
                            void sendTurn(
                              'Prepare my NBI Clearance requirements checklist and tell me what to watch out for.',
                              [],
                              'NBI_CLEARANCE',
                            );
                          } else if (pill.id === 'psa_helpline') {
                            void sendTurn(
                              'How do I order my PSA Birth Certificate via PSAHelpline.ph for nationwide doorstep delivery, and what are the fees and receiving requirements?',
                              [],
                              'PSA_HELPLINE',
                            );
                          } else if (pill.id === 'demo_expired_id') {
                            void loadDemoAndSend(
                              '/demo/expired-postal-id.png',
                              'expired-postal-id.png',
                              'image/png',
                              'Here is my Postal ID for my government application. Please check if there is any expired, mismatched, or missing information.',
                            );
                          } else if (pill.id === 'demo_brgy') {
                            void loadDemoAndSend(
                              '/demo/incomplete-brgy-cert.png',
                              'incomplete-brgy-cert.png',
                              'image/png',
                              'Inspect my Barangay Certificate for missing seal, signature, or expiry.',
                            );
                          }
                        }}
                        className="pill press row-btn flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-2.5 text-[12px] font-medium shadow-[0_0_0_1px_var(--hairline),0_1px_2px_rgba(0,0,0,0.04)] hover:bg-slate-50 transition-all disabled:opacity-40 [&_svg]:size-3.5"
                      >
                        <span className="shrink-0 text-[var(--brand)]">{pill.icon}</span>
                        <span className="truncate">{pill.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Composer (`.composer` card - slim) */}
                <div ref={composerWrapRef} className="mx-auto w-full max-w-[760px] shrink-0 px-4 pb-6">
                  <div data-tour="composer" className="composer relative rounded-[16px] bg-white">
                    {attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                        {attachedFiles.map((f, idx) => (
                          <span
                            key={`${f.name}-${idx}`}
                            className="pop inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--fill)] py-0.5 pr-1 pl-1 text-[11px]"
                          >
                            <FileThumb file={f} />
                            <span className="max-w-[150px] truncate">{f.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="btn-icon press row-btn h-5 w-5 rounded-full"
                              aria-label={`Remove ${f.name}`}
                            >
                              {Icons.close}
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => {
                        const list = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        if (list.length) {
                          setAttachedFiles((prev) => [...prev, ...list].slice(0, 10));
                          textareaRef.current?.focus();
                        }
                      }}
                      className="hidden"
                      tabIndex={-1}
                      aria-hidden="true"
                    />

                    <label htmlFor="composer" className="sr-only">
                      Message GovGuidePH
                    </label>
                    <textarea
                      id="composer"
                      ref={textareaRef}
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          void sendTurn();
                        }
                      }}
                      placeholder={
                        !isGuest && (!applicant.display_name || applicant.role === 'new_citizen')
                          ? 'Mangyaring punan muna ang form sa My Details bago makipag-chat...'
                          : 'Magtanong tungkol sa serbisyo ng gobyerno o mag-upload ng ID para masuri...'
                      }
                      className={`block min-h-[42px] max-h-[160px] w-full resize-none bg-transparent px-3.5 pb-1 text-[14px] leading-relaxed outline-none placeholder:text-[13px] placeholder:text-[var(--label-3)] ${attachedFiles.length > 0 ? 'pt-1.5' : 'pt-3'}`}
                    />

                    <div className="flex items-center gap-1 px-2 pb-2 pt-0.5">
                      {/* Attach Menu Popover */}
                      <Popover
                        label="Attach"
                        placement="top-start"
                        className="w-[260px]"
                        trigger={({ open, toggle }) => (
                          <button
                            type="button"
                            data-tour="attach"
                            onClick={toggle}
                            aria-expanded={open}
                            aria-haspopup="menu"
                            className="btn-icon press row-btn flex items-center justify-center text-slate-600 hover:text-slate-900"
                            aria-label="Maglakip ng files"
                            title="Mag-upload ng ID o subukan ang demo"
                          >
                            {Icons.plus}
                          </button>
                        )}
                      >
                        {(close) => (
                          <div role="menu" aria-label="Attach">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close();
                                openFilePicker('image');
                              }}
                              className="row-btn flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px]"
                            >
                              <span className="text-[var(--label-2)]">{Icons.image}</span>
                              Mag-upload ng Litrato o ID
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close();
                                openFilePicker('pdf');
                              }}
                              className="row-btn flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px]"
                            >
                              <span className="text-[var(--label-2)]">{Icons.docLg}</span>
                              Mag-upload ng PDF File
                            </button>

                            <div className="my-1 h-px bg-[var(--fill-2)]" role="separator" />
                            <p className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Subukan ang Halimbawa (Demo)
                            </p>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close();
                                void loadDemoAndSend(
                                  '/demo/expired-postal-id.png',
                                  'expired-postal-id.png',
                                  'image/png',
                                  'Here is my Postal ID for my government application. Please check if there is any expired, mismatched, or missing information.',
                                );
                              }}
                              className="row-btn flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px]"
                            >
                              <span className="text-[var(--label-2)]">{Icons.image}</span>
                              Expired at May Mismatch na ID
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close();
                                void loadDemoAndSend(
                                  '/demo/incomplete-brgy-cert.png',
                                  'incomplete-brgy-cert.png',
                                  'image/png',
                                  'Inspect my Barangay Certificate for missing seal, signature, or expiry.',
                                );
                              }}
                              className="row-btn flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px]"
                            >
                              <span className="text-[var(--label-2)]">{Icons.docLg}</span>
                              Kulang na Barangay Certificate
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close();
                                void loadDemoAndSend(
                                  '/demo/valid-philsys-id.png',
                                  'valid-philsys-id.png',
                                  'image/png',
                                  'Check my PhilSys National ID for Counter-Ready verification.',
                                );
                              }}
                              className="row-btn flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px]"
                            >
                              <span className="text-[var(--brand)]">{Icons.check}</span>
                              Valid na PhilSys National ID
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close();
                                void sendTurn(
                                  'Explain how to order a PSA Birth Certificate or CENOMAR via PSAHelpline.ph for doorstep delivery, the fees, and courier receiving requirements.',
                                  [],
                                  'PSA_HELPLINE',
                                );
                              }}
                              className="row-btn flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px]"
                            >
                              <span className="text-[var(--brand)]">{Icons.doc}</span>
                              PSA Helpline Delivery Guide
                            </button>
                          </div>
                        )}
                      </Popover>

                      <div className="flex-1" />

                      {/* Language Popover */}
                      <Popover
                        label="Language"
                        placement="top-end"
                        className="w-[180px]"
                        trigger={({ open, toggle }) => (
                          <button
                            type="button"
                            onClick={toggle}
                            aria-expanded={open}
                            className="row-btn press flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[13px] font-medium"
                          >
                            {language} {Icons.chevronDown}
                          </button>
                        )}
                      >
                        {(close) => (
                          <div role="menu" aria-label="Reply language">
                            {(['Auto', 'English', 'Filipino'] as const).map((lang) => (
                              <MenuItemRadio
                                key={lang}
                                checked={language === lang}
                                onSelect={() => {
                                  setLanguage(lang);
                                  close();
                                }}
                              >
                                {lang === 'Auto' ? 'Auto-detect' : lang}
                              </MenuItemRadio>
                            ))}
                          </div>
                        )}
                      </Popover>

                                            {/* Hands-Free Voice Input Microphone Button with Automatic 2-Second Silence Submission */}
                      <VoiceInputButton
                        language={language}
                        disabled={busy}
                        initialText={inputText}
                        onTranscript={(transcript) => {
                          if (transcript.trim()) {
                            setInputText(transcript);
                          }
                        }}
                        onAutoSubmit={(finalMessage) => {
                          if (finalMessage.trim() && !busy) {
                            void sendTurn(finalMessage.trim());
                          }
                        }}
                      />

                      {/* Send Button */}
                      <button
                        type="button"
                        onClick={() => void sendTurn()}
                        disabled={busy || (!inputText.trim() && attachedFiles.length === 0)}
                        aria-label={busy ? 'GovGuidePH is working' : 'Send'}
                        className="btn-primary press flex h-8 w-8 items-center justify-center rounded-[9px] disabled:bg-[var(--fill-2)] disabled:text-[var(--label-3)]"
                      >
                        {busy ? <Spinner /> : Icons.send}
                      </button>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Right Slide-Over Source Drawer */}
          <SourceDrawer
            open={sourceDrawerId !== null}
            sourceId={sourceDrawerId}
            onClose={() => setSourceDrawerId(null)}
          />

          {/* Right Slide-Over Remediation Sub-Chat Branch Drawer */}
          <RemediationBranchDrawer
            open={branchDrawerData !== null}
            data={branchDrawerData}
            onClose={() => setBranchDrawerData(null)}
            onResolve={handleResolveBranch}
            onOpenSource={(id) => setSourceDrawerId(id)}
          />
        </main>
      </div>

      {/* Lightbox Image Preview Modal */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.name}
          onClick={() => setLightbox(null)}
          className="enter fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close preview"
            className="press absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:text-white [&_svg]:size-5"
          >
            {Icons.close}
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      {/* Delete Chat Confirmation Dialog (`ea` dialog) */}
      <div
        className="dialog-root fixed inset-0 z-[80] flex items-center justify-center p-6"
        data-open={deleteDialogThread !== null}
        inert={deleteDialogThread === null ? true : undefined}
      >
        <div
          className="dialog-backdrop absolute inset-0 bg-black/15 backdrop-blur-[2px]"
          onClick={() => setDeleteDialogThread(null)}
          aria-hidden="true"
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-body"
          className="dialog-panel relative w-full max-w-[320px] rounded-[20px] bg-white/90 px-6 pt-6 pb-4 text-center shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_20px_50px_rgba(0,0,0,0.14)] backdrop-blur-xl"
        >
          <h2 id="confirm-title" className="text-[16px] font-semibold tracking-tight">
            Delete this chat?
          </h2>
          <p id="confirm-body" className="mt-1.5 text-[13px] leading-snug text-[var(--label-2)]">
            <span className="line-clamp-1 font-medium text-[var(--fg)]">
              {deleteDialogThread?.title ?? 'This chat'}
            </span>
            Saved checklists are not affected.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeleteDialogThread(null)}
              className="press h-10 rounded-[12px] bg-[var(--fill)] text-[14px] font-medium hover:bg-[var(--fill-2)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteDialogThread) {
                  const id = deleteDialogThread.id;
                  setThreads((prev) => prev.filter((t) => t.id !== id));
                  if (activeThreadId === id) {
                    setActiveThreadId(null);
                  }
                  void fetch(`/api/chat/threads?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
                  setDeleteDialogThread(null);
                }
              }}
              className="press h-10 rounded-[12px] bg-[var(--fg)] text-[14px] font-medium text-white hover:bg-[#262626]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Official PSA Birth Certificate Form Modal */}
      <OfficialPsaBirthCertForm
        applicant={applicant}
        isOpen={isPsaFormOpen}
        onClose={() => setIsPsaFormOpen(false)}
      />

      {/* Official DFA Passport Appointment Modal */}
      {isDfaModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Official DFA Passport Appointment Scheduler"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 -mt-2 mb-4 flex items-center justify-between border-b border-slate-200 bg-white/95 pb-3 pt-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs">
                  DFA
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">DFA Passport Appointment Scheduler</h3>
                  <p className="text-[11px] text-slate-500">Official Consular Slots &amp; RA 8239 Citizen Priority Scheduling</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDfaModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                {Icons.close}
              </button>
            </div>
            <DfaAppointmentView
              initialApplicant={{
                fullName: applicant.display_name,
                birthDate: applicant.birth_date,
                email: applicant.email,
                mobileNumber: applicant.phone,
                address: `${applicant.barangay}, ${applicant.city}`,
              }}
              onAskInChat={(p) => {
                setIsDfaModalOpen(false);
                void sendTurn(p);
              }}
            />
          </div>
        </div>
      )}

      {/* Official DPWH Projects & Community Reviews Modal */}
      {isDpwhModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Official DPWH Projects & Citizen Reviews"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 -mt-2 mb-4 flex items-center justify-between border-b border-slate-200 bg-white/95 pb-3 pt-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs">
                  DPWH
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">DPWH Infrastructure Projects &amp; Citizen Reviews</h3>
                  <p className="text-[11px] text-slate-500">Official Public Works Tracker with Citizen Google Reviews &amp; Redress</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDpwhModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                {Icons.close}
              </button>
            </div>
            <DpwhProjectsView
              citizenName={applicant.display_name}
              onAskInChat={(p) => {
                setIsDpwhModalOpen(false);
                void sendTurn(p);
              }}
            />
          </div>
        </div>
      )}

      {/* Tour Overlay */}
      <TourOverlay open={tourOpen} onClose={() => setTourOpen(false)} />
    </AppContext.Provider>
  );
}
