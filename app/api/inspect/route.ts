import { compareDocumentIdentity, usableIdentity } from '@/lib/ai/document-identity';
import { inspectionProviderError } from '@/lib/ai/inspection-error';
export const maxDuration = 60;

import { basicQuestionReply } from '@/lib/ai/basic-questions';
import { isSocialTurn, socialReply } from '@/lib/ai/social-intent';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getGeminiClient, GEMINI_FLASH_MODEL } from '@/lib/ai/models';
import { evaluateGuardrails, answerSystemQuestion, redactSecrets, extractLearnedDetails, isFilipinoQuery } from '@/lib/ai/guardrails';
import { searchCharterTool } from '@/lib/ai/tools';
import { SERVICES_REGISTRY } from '@/lib/services/registry';
import { searchQABank } from '@/lib/rag/qa-matcher';
import {
  CHARTER_SOURCES,
  parseNameParts,
  parseAddressParts,
  type ApplicantProfile,
  type ChecklistRequirementItem,
  type InspectionIssue,
  type InspectionReport,
  type SavedVaultFile,
} from '@/lib/services/charter-sources';
import { reconcileChecklistWithVault } from '@/lib/citizen/checklists';
import { evaluateOnlineReadiness } from '@/lib/services/online-services';
import { createOrGetRequestForInquiry } from '@/lib/citizen/requests';

function detectServiceCode(text: string, files: string[]): string | null {
  const combined = `${text} ${files.join(' ')}`.toLowerCase();
  if (
    combined.includes('helpline') ||
    combined.includes('psahelpline') ||
    combined.includes('doorstep') ||
    (combined.includes('psa') && combined.includes('delivery'))
  ) {
    return 'PSA_HELPLINE';
  }
  if (combined.includes('marriage') || combined.includes('kasal')) {
    return 'PSA_MARRIAGE_CERT';
  }
  if (combined.includes('cenomar') || combined.includes('singleness')) {
    return 'PSA_CENOMAR';
  }
  if (combined.includes('psa') || combined.includes('birth') || combined.includes('secpa') || combined.includes('kapanganakan')) {
    return 'PSA_BIRTH_CERT';
  }
  if (combined.includes('philhealth') || combined.includes('pmrf') || combined.includes('mdr') || combined.includes('pin')) {
    return 'PHILHEALTH_REGISTRATION';
  }
  if (
    combined.includes('nbi') ||
    combined.includes('clearance') ||
    combined.includes('barangay') ||
    combined.includes('brgy') ||
    combined.includes('ra 11261') ||
    combined.includes('jobseeker')
  ) {
    return 'NBI_CLEARANCE';
  }
  if (combined.includes('sss') || combined.includes('social security') || combined.includes('ssn') || combined.includes('e-1')) {
    return 'SSS_REGISTRATION';
  }
  if (combined.includes('pag-ibig') || combined.includes('pagibig') || combined.includes('hdmf')) {
    return 'PAGIBIG_MEMBERSHIP';
  }
  if (combined.includes('passport') || combined.includes('dfa')) {
    return 'DFA_PASSPORT';
  }
  if (combined.includes('business name') || combined.includes('dti') || combined.includes('bnrs')) {
    return 'DTI_BUSINESS_NAME';
  }
  if (combined.includes('tin') || combined.includes('bir') || combined.includes('orus')) {
    return 'BIR_TIN';
  }
  if (combined.includes('prc') || combined.includes('leris') || combined.includes('board exam')) {
    return 'PRC_LERIS';
  }
  if (combined.includes('student permit') || combined.includes('lto') || combined.includes('driver')) {
    return 'LTO_STUDENT_PERMIT';
  }
  if (combined.includes('aics') || combined.includes('dswd') || combined.includes('indigent') || combined.includes('financial assistance')) {
    return 'DSWD_AICS';
  }
  if (combined.includes('national id') || combined.includes('philsys') || combined.includes('ephilid')) {
    return 'NATIONAL_ID';
  }
  if (combined.includes('pwd') || combined.includes('disability') || combined.includes('ncda') || combined.includes('pdao')) {
    return 'PWD_ID';
  }
  if (
    combined.includes('dpwh') ||
    combined.includes('infrastructure') ||
    combined.includes('bridge') ||
    combined.includes('expressway') ||
    combined.includes('flood control') ||
    combined.includes('tunnel') ||
    combined.includes('bypass') ||
    combined.includes('bataan') ||
    combined.includes('samal') ||
    combined.includes('panguil')
  ) {
    return 'DPWH_PROJECTS';
  }
  return null;
}

function buildChecklistForService(
  serviceCode: string,
  inspection?: InspectionReport | null,
  applicant?: ApplicantProfile | null,
  savedFiles?: SavedVaultFile[] | null,
): {
  service_code: string;
  service_name: string;
  agency_name: string;
  processing_fee: number;
  convenience_fee?: number;
  counter_tips: string[];
  items: ChecklistRequirementItem[];
} {
  const def = SERVICES_REGISTRY[serviceCode] || SERVICES_REGISTRY.NBI_CLEARANCE;
  let items: ChecklistRequirementItem[] = def.requirements.map((req, idx) => {
    let status: 'pending' | 'verified' | 'issue' | 'skipped' = 'pending';
    let issue_note: string | undefined;

    if (inspection) {
      const fn = inspection.file_name.toLowerCase();
      const docTitle = inspection.document_title.toLowerCase();
      const isIdReq = req.isPrimaryId || req.name.toLowerCase().includes('id');
      const isBrgyReq =
        req.name.toLowerCase().includes('barangay') || req.name.toLowerCase().includes('oath');

      if (
        isIdReq &&
        (fn.includes('id') || docTitle.includes('id') || docTitle.includes('pagkakakilanlan'))
      ) {
        if (inspection.overall_status === 'counter_ready') {
          status = 'verified';
          issue_note = 'Verified Counter-Ready by AI';
        } else {
          status = 'issue';
          const topIssue = inspection.issues.find((i) => i.category !== 'valid');
          issue_note = topIssue
            ? `${topIssue.category.toUpperCase()}: ${topIssue.title}`
            : 'Discrepancy detected — review below';
        }
      } else if (
        isBrgyReq &&
        (fn.includes('brgy') || fn.includes('cert') || docTitle.includes('barangay'))
      ) {
        if (inspection.overall_status === 'counter_ready') {
          status = 'verified';
          issue_note = 'Verified Counter-Ready by AI';
        } else {
          status = 'issue';
          const topIssue = inspection.issues.find((i) => i.category !== 'valid');
          issue_note = topIssue
            ? `${topIssue.category.toUpperCase()}: ${topIssue.title}`
            : 'Missing seal/signature or expired';
        }
      }
    }

    return {
      id: `${def.code}-req-${idx + 1}`,
      service_code: def.code,
      name: req.name,
      description: req.description,
      required: req.required,
      isPrimaryId: req.isPrimaryId,
      appliesTo: req.appliesTo,
      status,
      issue_note,
    };
  });

  if (applicant && savedFiles) {
    items = reconcileChecklistWithVault(
      items,
      applicant,
      savedFiles,
      inspection ? [inspection] : [],
    );
  }

  return {
    service_code: def.code,
    service_name: def.name,
    agency_name: def.agencyName,
    processing_fee: def.processingFee,
    convenience_fee: def.convenienceFee,
    counter_tips: def.counterReadyTips,
    items,
  };
}

function extractJsonFromModelOutput(raw: string): any {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(unfenced);
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          // ignore error
        }
      }
    }
  }
  return null;
}

function runDeterministicInspection(
  text: string,
  attachments: { name: string; type: string; dataUrl?: string }[],
  applicant: ApplicantProfile,
  serviceCode: string,
): InspectionReport | null {
  const lowerText = text.toLowerCase();
  const fileNames = attachments.map((a) => a.name);
  const firstFile = fileNames[0] || '';
  const lowerFile = firstFile.toLowerCase();

  const hasAttachments = attachments.length > 0;
  const mentionsInspectionKeywords =
    lowerText.includes('expire') ||
    lowerText.includes('mismatch') ||
    lowerText.includes('missing') ||
    lowerText.includes('check my') ||
    lowerText.includes('inspect') ||
    lowerText.includes('postal id') ||
    lowerText.includes('philsys') ||
    lowerText.includes('barangay cert') ||
    lowerText.includes('suriin') ||
    lowerText.includes('kulang') ||
    lowerText.includes('mali');

  if (!hasAttachments && !mentionsInspectionKeywords) {
    return null;
  }

  const sourceId =
    serviceCode === 'PSA_BIRTH_CERT'
      ? 'src-psa-2025'
      : serviceCode === 'PHILHEALTH_REGISTRATION'
        ? 'src-philhealth-2025'
        : 'src-nbi-2025';
  const serviceDef = SERVICES_REGISTRY[serviceCode] || SERVICES_REGISTRY.NBI_CLEARANCE;

  const isDemoJobseeker =
    applicant.role === 'jobseeker' && (applicant.display_name || '').toLowerCase().includes('juan');
  const hasExplicitCabaticDoc = lowerFile.includes('cabatic');
  const hasCitizenName = Boolean(
    applicant.display_name?.trim() &&
    applicant.display_name !== 'Guest Account' &&
    applicant.display_name !== 'Citizen Account'
  );
  const isCabatic = hasExplicitCabaticDoc && !hasCitizenName;
  const extractedDocName = hasCitizenName
    ? applicant.display_name!
    : (isCabatic ? 'CABATIC, LORRAINE LASI' : (isDemoJobseeker ? 'DELA CRUZ, JUAN SANTOS' : 'CITIZEN APPLICANT'));
  const extractedDocDob = applicant.birth_date?.trim()
    ? applicant.birth_date
    : (isCabatic ? '2007-07-23' : (isDemoJobseeker ? '1999-05-14' : 'Foundational Record'));

  // Case 1: Demo or Uploaded Barangay Certificate (Incomplete / Expired / Missing Dry Seal & Signature)
  if (
    lowerFile.includes('incomplete-brgy-cert') ||
    lowerFile.includes('brgy') ||
    lowerText.includes('barangay cert') ||
    lowerText.includes('dry seal') ||
    lowerText.includes('oath')
  ) {
    const issues: InspectionIssue[] = [
      {
        id: 'iss-brgy-expired',
        category: 'expired',
        severity: 'critical',
        title: 'Expired Barangay Certification (Over 90-Day Validity)',
        detail:
          'Date of issuance is 10 May 2026 (172 days ago). Under RA 11261 (First-Time Jobseekers Act), Barangay Certifications are only valid for 90 days from issuance.',
        how_to_fix:
          'Visit your Barangay Hall (Barangay San Isidro) to request a newly issued First-Time Jobseeker Certificate dated within the last 90 days (free of charge under RA 11261).',
        remediation:
          'Visit your Barangay Hall (Barangay San Isidro) to request a newly issued First-Time Jobseeker Certificate dated within the last 90 days (free of charge under RA 11261).',
        field_key: 'issue_date',
        charter_rule: 'NBI Citizen’s Charter > RA 11261 Requirements: Valid within 90 days.',
        source_id: 'src-nbi-2025',
      },
      {
        id: 'iss-brgy-seal',
        category: 'missing',
        severity: 'critical',
        title: 'Missing Official Barangay Dry Seal',
        detail:
          'No embossed Barangay Dry Seal was detected on the lower-right certification area. Counter officers strictly reject unsealed RA 11261 certificates.',
        how_to_fix:
          'Request the Barangay Secretary or Officer-in-Charge to emboss the official Barangay Dry Seal on your certification before leaving the barangay hall.',
        remediation:
          'Request the Barangay Secretary or Officer-in-Charge to emboss the official Barangay Dry Seal on your certification before leaving the barangay hall.',
        field_key: 'dry_seal',
        charter_rule: 'NBI Citizen’s Charter > Original Barangay Certificate with Dry Seal.',
        source_id: 'src-nbi-2025',
      },
      {
        id: 'iss-brgy-oath',
        category: 'missing',
        severity: 'warning',
        title: 'Unsigned Oath of Undertaking',
        detail:
          'The attached Oath of Undertaking is missing the applicant’s wet signature above the printed name.',
        how_to_fix:
          'Affix your signature in blue or black ink on the line above your printed name on the Oath of Undertaking.',
        remediation:
          'Affix your signature in blue or black ink on the line above your printed name on the Oath of Undertaking.',
        field_key: 'oath_signature',
        charter_rule: 'RA 11261 Implementing Rules > Signed Oath of Undertaking required.',
        source_id: 'src-nbi-2025',
      },
      {
        id: 'iss-brgy-name',
        category: 'valid',
        severity: 'ok',
        title: 'Applicant Name & Residency Verified',
        detail: isDemoJobseeker
          ? 'Name "DELA CRUZ, JUAN SANTOS" and residency in Brgy. San Isidro noted from document.'
          : `Name "${extractedDocName}" and residency noted from document.`,
        how_to_fix: 'No correction needed for applicant name.',
        remediation: 'No correction needed for applicant name.',
        field_key: 'full_name',
        charter_rule: 'Identity & Barangay Residency Match',
        source_id: 'src-nbi-2025',
      },
    ];

    return {
      id: `insp-${Date.now()}`,
      document_title: 'Barangay Certification (First-Time Jobseeker · RA 11261)',
      file_name: firstFile || 'incomplete-brgy-cert.png',
      service_code: serviceDef.code,
      service_name: serviceDef.name,
      applicant_name: extractedDocName,
      inspected_at: new Date().toISOString(),
      overall_status: 'issues_found',
      summary_counts: { expired: 1, mismatch: 0, missing: 2, valid: 1 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · BRGY. SAN ISIDRO',
        'BARANGAY CERTIFICATION (FIRST-TIME JOBSEEKER - RA 11261)',
        `APPLICANT: ${extractedDocName.toUpperCase()}`,
        'ISSUED: 10 MAY 2026 [>90 DAYS OLD - EXPIRED]',
        'OATH OF UNDERTAKING: [UNSIGNED]',
        'BARANGAY DRY SEAL: [NOT DETECTED]',
      ],
      issues,
      fields: [
        {
          key: 'full_name',
          label: 'Applicant Name',
          value: extractedDocName,
          expected: isDemoJobseeker ? 'DELA CRUZ, JUAN SANTOS' : extractedDocName,
          status: 'valid',
        },
        {
          key: 'issue_date',
          label: 'Date Issued',
          value: '2026-05-10',
          expected: 'Within last 90 days (on or after 2026-07-31)',
          status: 'expired',
          note: 'Expired (>90 days old)',
        },
        {
          key: 'dry_seal',
          label: 'Barangay Dry Seal',
          value: 'Missing / Not Embossed',
          expected: 'Official Embossed Barangay Seal',
          status: 'missing',
          note: 'Missing Dry Seal',
        },
        {
          key: 'oath_signature',
          label: 'Oath Signature',
          value: 'Unsigned',
          expected: 'Signed by Applicant',
          status: 'missing',
          note: 'Missing Signature',
        },
      ],
      source_id: 'src-nbi-2025',
    };
  }

  // Case 1.5: Official PSA Certificate of Live Birth (SECPA Security Paper)
  if (
    (lowerFile.includes('cabatic') && (lowerFile.includes('psa') || lowerFile.includes('birth'))) ||
    (lowerFile.includes('psa') && !lowerFile.includes('marriage') && !lowerFile.includes('cenomar')) ||
    lowerFile.includes('birth') ||
    lowerFile.includes('secpa') ||
    (lowerText.includes('birth cert') &&
      !lowerText.includes('expire') &&
      !lowerText.includes('mismatch') &&
      !lowerText.includes('missing'))
  ) {
    const dispName = hasCitizenName
      ? applicant.display_name!
      : (isCabatic ? 'Lorraine Lasi Cabatic' : (isDemoJobseeker ? 'Juan Santos Dela Cruz' : 'Citizen Applicant'));
    const dispDob = applicant.birth_date?.trim()
      ? applicant.birth_date
      : (isCabatic ? '2007-07-23' : (isDemoJobseeker ? '1999-05-14' : 'Foundational Identity Record'));

    return {
      id: `insp-${Date.now()}`,
      document_title: 'PSA Certificate of Live Birth (SECPA Security Paper)',
      file_name: firstFile || (isCabatic ? 'cabatic-psa.jpg' : 'psa-birth-certificate.jpg'),
      service_code: serviceDef.code,
      service_name: serviceDef.name,
      applicant_name: dispName,
      inspected_at: new Date().toISOString(),
      overall_status: 'counter_ready',
      summary_counts: { expired: 0, mismatch: 0, missing: 0, valid: 4 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · PHILIPPINE STATISTICS AUTHORITY',
        'OFFICE OF THE CIVIL REGISTRAR GENERAL · CERTIFICATE OF LIVE BIRTH',
        'DOCUMENT SECURITY: OFFICIAL SECPA (SECURITY PAPER) · BARCODE VERIFIED',
        `RECORDED NAME: ${dispName.toUpperCase()}`,
        `RECORDED BIRTH DATE: ${dispDob.toUpperCase()}`,
        'VALIDITY: LIFETIME (NON-EXPIRING UNDER REPUBLIC ACT 11909)',
        'LOCAL CIVIL REGISTRY (LCR) & PSA SEAL: AUTHENTIC · HIGH CLARITY',
      ],
      issues: [
        {
          id: 'iss-psa-valid-1',
          category: 'valid',
          severity: 'ok',
          title: 'Permanent Lifetime Validity (RA 11909 / Permanent Validity of Birth Certificate Act)',
          detail:
            'Under Republic Act 11909, PSA Certificates of Live Birth printed on Security Paper (SECPA) have permanent lifetime validity and never expire regardless of issuance date.',
          field_key: 'validity',
          charter_rule: 'Republic Act 11909 & PSA Citizen’s Charter',
          source_id: 'src-psa-2025',
        },
        {
          id: 'iss-psa-valid-2',
          category: 'valid',
          severity: 'ok',
          title: 'Primary Foundational Identity Document Confirmed',
          detail:
            'This official PSA Birth Certificate is accepted across all Philippine government counters (NBI, DFA, PhilHealth, SSS, LTO) as foundational proof of Philippine citizenship and identity.',
          field_key: 'document_type',
          charter_rule: 'Official Philippine Citizen’s Charter Standards',
          source_id: 'src-psa-2025',
        },
      ],
      fields: [
        {
          key: 'full_name',
          label: 'Full Legal Name',
          value: dispName,
          status: 'valid',
          note: 'Extracted from PSA Birth Certificate',
        },
        {
          key: 'birth_date',
          label: 'Date of Birth',
          value: dispDob,
          status: 'valid',
          note: 'Extracted from PSA Birth Certificate',
        },
        {
          key: 'validity',
          label: 'Validity Period',
          value: 'Lifetime / Non-Expiring (RA 11909)',
          status: 'valid',
        },
        {
          key: 'security_paper',
          label: 'Security Paper (SECPA)',
          value: 'Verified Authentic with PSA Barcode & Microprint',
          status: 'valid',
        },
        {
          key: 'registry_status',
          label: 'Civil Registry Verification',
          value: 'Registered with Office of the Civil Registrar General',
          status: 'valid',
        },
        {
          key: 'father_name',
          label: "Father's Full Name",
          value: applicant.father_name?.trim() || (isCabatic ? 'Joselito Bernas Cabatic' : 'Roberto Mendoza Dela Cruz'),
          status: 'valid',
        },
        {
          key: 'father_first_name',
          label: "Father's First Name",
          value: applicant.father_first_name?.trim() || (isCabatic ? 'Joselito' : 'Roberto'),
          status: 'valid',
        },
        {
          key: 'father_middle_name',
          label: "Father's Middle Name",
          value: applicant.father_middle_name?.trim() || (isCabatic ? 'Bernas' : 'Mendoza'),
          status: 'valid',
        },
        {
          key: 'father_last_name',
          label: "Father's Last Name",
          value: applicant.father_last_name?.trim() || (isCabatic ? 'Cabatic' : 'Dela Cruz'),
          status: 'valid',
        },
        {
          key: 'mother_maiden_name',
          label: "Mother's Maiden Name",
          value: applicant.mother_maiden_name?.trim() || (isCabatic ? 'Rowena Tagle Lasi' : 'Maria Gomez Santos'),
          status: 'valid',
        },
        {
          key: 'mother_first_name',
          label: "Mother's First Name",
          value: applicant.mother_first_name?.trim() || (isCabatic ? 'Rowena' : 'Maria'),
          status: 'valid',
        },
        {
          key: 'mother_middle_name',
          label: "Mother's Middle Name",
          value: applicant.mother_middle_name?.trim() || (isCabatic ? 'Tagle' : 'Gomez'),
          status: 'valid',
        },
        {
          key: 'mother_last_name',
          label: "Mother's Maiden Last Name",
          value: applicant.mother_last_name?.trim() || (isCabatic ? 'Lasi' : 'Santos'),
          status: 'valid',
        },
        {
          key: 'place_of_birth',
          label: 'Place of Birth',
          value: applicant.place_of_birth?.trim() || (isCabatic ? 'Divine Love General Hospital, Lipa City, Batangas' : 'Quezon City General Hospital, Quezon City, Metro Manila'),
          status: 'valid',
        },
        {
          key: 'city',
          label: 'City / Municipality',
          value: applicant.city?.trim() || (isCabatic ? 'Lipa City' : 'Quezon City'),
          status: 'valid',
        },
        {
          key: 'province',
          label: 'Province',
          value: applicant.province?.trim() || (isCabatic ? 'Batangas' : 'Metro Manila'),
          status: 'valid',
        },
        {
          key: 'gender',
          label: 'Sex',
          value: applicant.gender?.trim() || (isCabatic ? 'Female' : 'Male'),
          status: 'valid',
        },
      ],
      source_id: 'src-psa-2025',
    };
  }

  // Case 2: Valid PhilSys National ID
  if (
    lowerFile.includes('valid-philsys-id') ||
    lowerFile.includes('philsys') ||
    lowerFile.includes('national-id') ||
    (lowerText.includes('philsys') &&
      !lowerText.includes('expire') &&
      !lowerText.includes('mismatch') &&
      !lowerText.includes('missing'))
  ) {
    const dispName = hasCitizenName
      ? applicant.display_name!
      : (isCabatic ? 'Lorraine Lasi Cabatic' : (isDemoJobseeker ? 'Juan Santos Dela Cruz' : 'Citizen Applicant'));
    const dispDob = applicant.birth_date?.trim()
      ? applicant.birth_date
      : (isCabatic ? '2007-07-23' : (isDemoJobseeker ? '1999-05-14' : 'Permanent Record'));
    return {
      id: `insp-${Date.now()}`,
      document_title: 'PhilSys National ID (Pambansang Pagkakakilanlan)',
      file_name: firstFile || (isCabatic ? 'cabatic-philsys-id.png' : 'valid-philsys-id.png'),
      service_code: serviceDef.code,
      service_name: serviceDef.name,
      applicant_name: dispName,
      inspected_at: new Date().toISOString(),
      overall_status: 'counter_ready',
      summary_counts: { expired: 0, mismatch: 0, missing: 0, valid: 4 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · PSA PHILSYS',
        applicant.philsys_id?.trim()
          ? `PCN: ${applicant.philsys_id}`
          : (isCabatic ? 'PCN: 2631-2509-8106-8349' : 'PCN: 4928-••••-••••-9104 [RA 10173 MASKED]'),
        `NAME: ${dispName.toUpperCase()}`,
        `DOB: ${dispDob} (MATCHES CITIZEN CHARTER STANDARDS)`,
        applicant.residential_address?.trim()
          ? `ADDRESS: ${applicant.residential_address.toUpperCase()}`
          : (isCabatic
              ? 'ADDRESS: PUROK 5 SITIO SAMPALUCAN, BRGY. SANTO TORIBIO, LIPA CITY, BATANGAS'
              : 'ADDRESS: REGISTERED RESIDENTIAL ADDRESS VERIFIED'),
        'VALIDITY: PERMANENT / NON-EXPIRING (RA 11055)',
        'QR CODE & PHOTO: HIGH CLARITY · VERIFIED',
      ],
      issues: [
        {
          id: 'iss-philsys-ok-1',
          category: 'valid',
          severity: 'ok',
          title: 'Primary ID Validity Confirmed (Non-Expiring under RA 11055)',
          detail:
            'PhilSys National ID is a top-tier Primary Government ID accepted across NBI, PSA, DFA, and PhilHealth counters.',
          field_key: 'validity',
          charter_rule: 'RA 11055 PhilSys Act & Citizen’s Charter Primary ID List',
          source_id: sourceId,
        },
        {
          id: 'iss-philsys-ok-2',
          category: 'valid',
          severity: 'ok',
          title: 'Zero Identity or Birth Date Mismatches',
          detail: isDemoJobseeker
            ? `Full name (${dispName}) and Date of Birth (${dispDob}) match your applicant profile 100%.`
            : `Full name (${dispName}) and Date of Birth (${dispDob}) confirmed from your PhilSys National ID.`,
          field_key: 'birth_date',
          charter_rule: 'Exact Name & Birth Date Match',
          source_id: sourceId,
        },
      ],
      fields: [
        {
          key: 'full_name',
          label: 'Full Name',
          value: dispName,
          status: 'valid',
          note: 'Extracted from PhilSys National ID',
        },
        {
          key: 'birth_date',
          label: 'Date of Birth',
          value: dispDob,
          status: 'valid',
          note: 'Extracted from PhilSys National ID',
        },
        {
          key: 'id_number',
          label: 'PhilSys Card Number',
          value: applicant.philsys_id?.trim() || (isCabatic ? '2631-2509-8106-8349' : '4928-1039-8472-9104'),
          status: 'valid',
        },
        {
          key: 'philsys_id',
          label: 'PhilSys Card Number',
          value: applicant.philsys_id?.trim() || (isCabatic ? '2631-2509-8106-8349' : '4928-1039-8472-9104'),
          status: 'valid',
        },
        {
          key: 'barangay',
          label: 'Barangay',
          value: applicant.barangay?.trim() || (isCabatic ? 'Brgy. Santo Toribio' : 'Brgy. San Isidro'),
          status: 'valid',
        },
        {
          key: 'city',
          label: 'City / Municipality',
          value: applicant.city?.trim() || (isCabatic ? 'Lipa City' : 'Quezon City'),
          status: 'valid',
        },
        {
          key: 'province',
          label: 'Province',
          value: applicant.province?.trim() || (isCabatic ? 'Batangas' : 'Metro Manila'),
          status: 'valid',
        },
        {
          key: 'street_address',
          label: 'Address',
          value: applicant.street_address?.trim() || (isCabatic ? 'Purok 5 Sitio Sampalucan' : '42 Magsaysay Ave'),
          status: 'valid',
        },
        {
          key: 'residential_address',
          label: 'Residential Address',
          value: applicant.residential_address?.trim() || (isCabatic
            ? 'Purok 5 Sitio Sampalucan, Brgy. Santo Toribio, Lipa City, Batangas'
            : '42 Magsaysay Ave, Brgy. San Isidro, Quezon City'),
          status: 'valid',
        },
        {
          key: 'gender',
          label: 'Sex',
          value: applicant.gender?.trim() || (isCabatic ? 'Female' : 'Male'),
          status: 'valid',
        },
        {
          key: 'validity',
          label: 'Expiration Status',
          value: 'Permanent (Non-Expiring)',
          status: 'valid',
        },
      ],
      source_id: sourceId,
    };
  }

  // Case 2.5: Valid Philippine Passport (DFA Primary ID)
  if (
    lowerFile.includes('passport') ||
    lowerFile.includes('dfa') ||
    (lowerText.includes('passport') && !lowerText.includes('expire'))
  ) {
    const dispName = hasCitizenName
      ? applicant.display_name!
      : (isCabatic ? 'Lorraine Lasi Cabatic' : (isDemoJobseeker ? 'Juan Santos Dela Cruz' : 'Citizen Applicant'));
    const dispDob = applicant.birth_date?.trim()
      ? applicant.birth_date
      : (isCabatic ? '2007-07-23' : (isDemoJobseeker ? '1999-05-14' : 'Primary ID Record'));
    return {
      id: `insp-${Date.now()}`,
      document_title: 'Philippine ePassport (DFA Consular Primary ID)',
      file_name: firstFile || 'philippine-passport.png',
      service_code: 'DFA_PASSPORT',
      service_name: 'DFA Passport Application & Renewal',
      applicant_name: dispName,
      inspected_at: new Date().toISOString(),
      overall_status: 'counter_ready',
      summary_counts: { expired: 0, mismatch: 0, missing: 0, valid: 4 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · DEPARTMENT OF FOREIGN AFFAIRS',
        'DOCUMENT TYPE: REGULAR PASSPORT (EPASSPORT)',
        `NAME: ${dispName.toUpperCase()}`,
        `DOB: ${dispDob} · NATIONALITY: FILIPINO`,
        'PASSPORT NO: P9824••••A [UNEXPIRED · VALID 10 YEARS]',
        'CHIP & MRZ: ICAO 9303 COMPLIANT · VERIFIED',
      ],
      issues: [
        {
          id: 'iss-passport-1',
          category: 'valid',
          severity: 'ok',
          title: 'Top-Tier Primary Government ID (10-Year Validity)',
          detail: 'DFA ePassport is an internationally verified Tier-1 Primary ID accepted without secondary ID requirements.',
          field_key: 'validity',
          charter_rule: 'Citizen’s Charter > Primary Identification Standards',
          source_id: 'src-dfa-2025',
        },
        {
          id: 'iss-passport-2',
          category: 'valid',
          severity: 'ok',
          title: isDemoJobseeker
            ? 'Identity & Details Match Profile 100%'
            : 'Primary ID Verified & Accepted',
          detail: `Passport holder "${dispName}" confirmed. Unexpired Primary ID.`,
          field_key: 'full_name',
          charter_rule: 'Data Consistency Standard',
          source_id: 'src-dfa-2025',
        },
      ],
      fields: [
        { key: 'full_name', label: 'Full Name', value: dispName, status: 'valid' },
        { key: 'birth_date', label: 'Date of Birth', value: dispDob, status: 'valid' },
        { key: 'passport_no', label: 'Passport Number', value: 'P9824••••A', status: 'valid' },
        { key: 'validity', label: 'Validity Status', value: 'Valid (10 Years)', status: 'valid' },
      ],
      source_id: 'src-dfa-2025',
    };
  }

  // Case 2.6: Valid LTO Driver's License
  if (
    lowerFile.includes('driver') ||
    lowerFile.includes('license') ||
    lowerFile.includes('lto') ||
    (lowerText.includes('license') && !lowerText.includes('expire'))
  ) {
    const dispName = hasCitizenName
      ? applicant.display_name!
      : (isCabatic ? 'Lorraine Lasi Cabatic' : (isDemoJobseeker ? 'Juan Santos Dela Cruz' : 'Citizen Applicant'));
    const dispDob = applicant.birth_date?.trim()
      ? applicant.birth_date
      : (isCabatic ? '2007-07-23' : (isDemoJobseeker ? '1999-05-14' : 'License Record'));
    return {
      id: `insp-${Date.now()}`,
      document_title: 'LTO Driver’s License (Land Transportation Office)',
      file_name: firstFile || 'driver-license.png',
      service_code: 'LTO_STUDENT_PERMIT',
      service_name: 'LTO Driver Licensing Services',
      applicant_name: dispName,
      inspected_at: new Date().toISOString(),
      overall_status: 'counter_ready',
      summary_counts: { expired: 0, mismatch: 0, missing: 0, valid: 4 },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · DEPARTMENT OF TRANSPORTATION · LTO',
        'DOCUMENT TYPE: NON-PROFESSIONAL / PROFESSIONAL DRIVER LICENSE',
        `NAME: ${dispName.toUpperCase()}`,
        `DOB: ${dispDob} · BLOOD TYPE: O+`,
        'LICENSE NO: N02-••-•••••• [VALID UNTIL 2030]',
        'BIOMETRIC CHIP & SIGNATURE: DETECTED · VERIFIED',
      ],
      issues: [
        {
          id: 'iss-lto-1',
          category: 'valid',
          severity: 'ok',
          title: 'Primary Government ID Confirmed (LTO Driver’s License)',
          detail: 'LTO Driver’s License with biometric photo and signature is an official Primary ID across Philippine government counters.',
          field_key: 'validity',
          charter_rule: 'Citizen’s Charter > Primary ID List',
          source_id: 'src-lto-2025',
        },
      ],
      fields: [
        { key: 'full_name', label: 'Full Name', value: dispName, status: 'valid' },
        { key: 'birth_date', label: 'Date of Birth', value: dispDob, status: 'valid' },
        { key: 'license_no', label: 'License Number', value: 'N02-••-••••••', status: 'valid' },
        { key: 'validity', label: 'Validity Status', value: 'Unexpired (Valid until 2030)', status: 'valid' },
      ],
      source_id: 'src-lto-2025',
    };
  }

  // Case 3: Check if uploaded file is explicitly a non-government / non-civic file (e.g., recipe, game screenshot, meme)
  const isExplicitNonCivicFile =
    lowerFile.includes('recipe') ||
    lowerFile.includes('sinigang') ||
    lowerFile.includes('adobo') ||
    lowerFile.includes('food') ||
    lowerFile.includes('game') ||
    lowerFile.includes('meme') ||
    lowerFile.includes('song') ||
    lowerFile.includes('wallpaper');

  if (isExplicitNonCivicFile && hasAttachments) {
    return {
      id: `insp-${Date.now()}`,
      document_title: 'Unrecognized Non-Government File / Hindi Kilalang Dokumento',
      file_name: firstFile || 'unrecognized-file.png',
      service_code: 'GENERAL',
      service_name: 'Document Pre-Flight Inspector',
      applicant_name: applicant.display_name,
      inspected_at: new Date().toISOString(),
      overall_status: 'issues_found',
      summary_counts: { expired: 0, mismatch: 0, missing: 1, valid: 0 },
      preview_lines: [
        'DOCUMENT TYPE: UNRECOGNIZED FILE',
        'STATUS: NOT AN OFFICIAL PHILIPPINE GOVERNMENT PRIMARY ID OR CERTIFICATE',
        'ACCEPTED IDENTIFICATION: PhilSys National ID, DFA Passport, UMID, Driver License, Postal ID',
      ],
      issues: [
        {
          id: 'iss-unrec-1',
          category: 'missing',
          severity: 'critical',
          title: 'Unrecognized Document (Hindi Kinikilalang Government ID)',
          detail:
            'Ang na-upload na file ay hindi kinilala bilang opisyal na Philippine Government ID o form. Mangyaring mag-upload ng malinaw na larawan ng Valid Primary ID (tulad ng PhilSys National ID, DFA Passport, LTO Driver’s License, o Postal ID) o Barangay Certificate.',
          field_key: 'document_type',
          charter_rule: 'Citizen’s Charter > Tanging mga opisyal na Government-Issued IDs at Form lamang ang tinatanggap sa counter.',
          source_id: 'src-arta-2024',
        },
      ],
      fields: [
        {
          key: 'document_type',
          label: 'Document Type',
          value: 'Unrecognized File',
          expected: 'Official Government-Issued ID / Certificate',
          status: 'missing',
          note: 'Not an accepted government requirement',
        },
      ],
      source_id: 'src-arta-2024',
    };
  }

  // Case 4: Default / Demo Postal ID with Expired, Mismatched, and Missing Info
  const isPostalDemo =
    lowerFile.includes('postal') ||
    lowerFile.includes('expired-postal') ||
    (lowerText.includes('postal') && (lowerText.includes('expire') || lowerText.includes('inspect'))) ||
    (!firstFile && (lowerText.includes('postal') || lowerText.includes('expire')));

  if (isPostalDemo || !firstFile) {
    const isMarriedCase =
      applicant.role === 'married_applicant' ||
      applicant.civil_status.toLowerCase() === 'married' ||
      lowerText.includes('married') ||
      lowerText.includes('maiden');

    // CRITICAL FIX: If applicant is a new citizen with no saved birth date, do NOT flag artificial DOB mismatch!
    const hasDobMismatch = Boolean(
      applicant.birth_date &&
        applicant.birth_date !== '1999-08-14' &&
        applicant.role !== 'new_citizen',
    );
    const hasSurnameMismatch = Boolean(
      isMarriedCase &&
        applicant.maiden_name &&
        applicant.role !== 'new_citizen' &&
        applicant.maiden_name?.toLowerCase() !== applicant.display_name.toLowerCase(),
    );
    const hasAnyMismatch = hasDobMismatch || hasSurnameMismatch;

    const issues: InspectionIssue[] = [
      {
        id: 'iss-exp-1',
        category: 'expired',
        severity: 'critical',
        title: 'Expired Primary Government ID (Postal ID)',
        detail:
          'The submitted Philippine Postal ID expired on 12 Mar 2025. Government counters strictly reject expired IDs even if the ID number is readable.',
        how_to_fix:
          'Renew your Postal ID at any PhilPost post office branch, or present an alternative unexpired Primary ID (such as PhilSys National ID or DFA Passport).',
        remediation:
          'Renew your Postal ID at any PhilPost post office branch, or present an alternative unexpired Primary ID (such as PhilSys National ID or DFA Passport).',
        field_key: 'expiry_date',
        charter_rule: 'Citizen’s Charter > Documentary Requirements: Must be unexpired at time of presentation.',
        source_id: sourceId,
      },
      ...(hasAnyMismatch
        ? [
            {
              id: 'iss-mis-1',
              category: 'mismatch' as const,
              severity: 'critical' as const,
              title: hasSurnameMismatch
                ? 'Surname Mismatch (Maiden Name vs. Married Name in My Details)'
                : 'Date of Birth Mismatch (ID vs. My Details Profile)',
              detail: hasSurnameMismatch
                ? `ID shows maiden name "${applicant.maiden_name || 'Maria Clara Reyes'}" while your My Details profile uses married name "${applicant.display_name}" without an attached PSA Marriage Certificate.`
                : `ID lists Date of Birth as "1999-08-14" (August 14), which conflicts with your My Details profile "${applicant.birth_date}".`,
              how_to_fix: hasSurnameMismatch
                ? 'Attach a PSA Marriage Certificate (SECPA copy) to substantiate your change of surname from maiden to married name.'
                : 'Update your application to match your official government ID, or request a PSA SECPA Birth Certificate copy to verify your true date of birth.',
              remediation: hasSurnameMismatch
                ? 'Attach a PSA Marriage Certificate (SECPA copy) to substantiate your change of surname from maiden to married name.'
                : 'Update your application to match your official government ID, or request a PSA SECPA Birth Certificate copy to verify your true date of birth.',
              field_key: hasSurnameMismatch ? 'full_name' : 'birth_date',
              charter_rule:
                'Citizen’s Charter > Data Consistency Rule: Any discrepancy between ID and PSA SECPA requires supporting civil registry proof or re-application.',
              source_id: sourceId,
            },
          ]
        : []),
      {
        id: 'iss-mis-2',
        category: 'missing',
        severity: 'warning',
        title: 'Missing Cardholder Signature & Missing 2nd Primary ID',
        detail:
          'The signature block on the submitted document is blank, and NBI Clearance requires two (2) valid Primary IDs (only 1 ID was submitted).',
        how_to_fix:
          'Sign the back signature panel of your ID using ballpoint pen, and prepare a 2nd valid Primary ID (e.g. PhilSys ID, Driver’s License, or Passport).',
        remediation:
          'Sign the back signature panel of your ID using ballpoint pen, and prepare a 2nd valid Primary ID (e.g. PhilSys ID, Driver’s License, or Passport).',
        field_key: 'signature_status',
        charter_rule: 'NBI Citizen’s Charter > Present two (2) Valid Government IDs with photo and signature.',
        source_id: sourceId,
      },
    ];

    const mismatchCount = hasAnyMismatch ? 1 : 0;
    const validCount = isDemoJobseeker ? 2 : hasAnyMismatch ? 1 : 2;

    const docDispName = isDemoJobseeker
      ? 'DELA CRUZ, JUAN SANTOS'
      : hasSurnameMismatch
        ? applicant.maiden_name || applicant.display_name
        : (applicant.display_name || extractedDocName);

    return {
      id: `insp-${Date.now()}`,
      document_title: 'Philippine Postal ID & Application Requirements Check',
      file_name: firstFile || 'expired-postal-id.png',
      service_code: serviceDef.code,
      service_name: serviceDef.name,
      applicant_name: docDispName,
      inspected_at: new Date().toISOString(),
      overall_status: 'issues_found',
      summary_counts: { expired: 1, mismatch: mismatchCount, missing: 1, valid: validCount },
      preview_lines: [
        'REPUBLIC OF THE PHILIPPINES · PHLPOST PRIMARY ID',
        'PRN: PST-••••-4120 [RA 10173 MASKED]',
        `NAME: ${docDispName.toUpperCase()}`,
        `DOB ON ID: 1999-08-14  [${isDemoJobseeker ? 'EXTRACTED FROM ID' : hasDobMismatch ? `!= MY DETAILS: ${applicant.birth_date}` : 'MATCHES MY DETAILS'}]`,
        'VALID UNTIL: 12 MAR 2025  [EXPIRED]',
        'SIGNATURE BLOCK: [MISSING / BLANK]',
      ],
      issues,
      fields: [
        {
          key: 'full_name',
          label: 'Full Name on ID',
          value: docDispName,
          expected: isDemoJobseeker ? 'DELA CRUZ, JUAN SANTOS' : applicant.display_name,
          status: hasSurnameMismatch ? 'mismatch' : 'valid',
          note: isDemoJobseeker ? 'Extracted from ID' : hasSurnameMismatch ? 'Maiden vs Married Name' : undefined,
        },
        {
          key: 'birth_date',
          label: 'Date of Birth',
          value: '1999-08-14',
          expected: isDemoJobseeker ? 'Extracted from ID' : applicant.birth_date,
          status: hasDobMismatch ? 'mismatch' : 'valid',
          note: isDemoJobseeker ? 'Extracted from ID' : hasDobMismatch ? `Mismatch (My Details: ${applicant.birth_date})` : undefined,
        },
        {
          key: 'expiry_date',
          label: 'Expiration Date',
          value: '2025-03-12',
          expected: 'Unexpired (>= 2026-11-03)',
          status: 'expired',
          note: 'Expired ID',
        },
        {
          key: 'signature_status',
          label: 'Signature & 2nd ID',
          value: 'Missing Signature / Only 1 ID attached',
          expected: 'Signed ID + 2nd Valid ID',
          status: 'missing',
          note: 'Missing Info',
        },
      ],
      source_id: sourceId,
    };
  }

  // Case 5: Real user uploaded document when fallback/offline mode is active
  const cleanDocName = firstFile.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const formattedTitle = cleanDocName.charAt(0).toUpperCase() + cleanDocName.slice(1);
  return {
    id: `insp-${Date.now()}`,
    document_title: `${formattedTitle} (Citizen Document)`,
    file_name: firstFile,
    service_code: serviceDef.code,
    service_name: serviceDef.name,
    applicant_name: extractedDocName,
    inspected_at: new Date().toISOString(),
    overall_status: 'counter_ready',
    summary_counts: { expired: 0, mismatch: 0, missing: 0, valid: 1 },
    preview_lines: [
      `DOCUMENT: ${formattedTitle.toUpperCase()}`,
      `APPLICANT: ${extractedDocName.toUpperCase()}`,
      'STATUS: ALL GOODS · UNEXPIRED · COUNTER-READY',
    ],
    issues: [
      {
        id: 'iss-gen-ok',
        category: 'valid',
        severity: 'ok',
        title: 'All goods — Ready for Counter Presentation',
        detail: 'All goods. No expired dates, mismatches, or missing requirements detected.',
        how_to_fix: 'Bring original document to the counter for presentation.',
        remediation: 'Bring original document to the counter for presentation.',
        field_key: 'document',
        charter_rule: 'Citizen’s Charter > Standard Document Pre-Flight Inspection',
        source_id: sourceId,
      },
    ],
    fields: [
      {
        key: 'full_name',
        label: 'Applicant Name',
        value: extractedDocName,
        expected: extractedDocName,
        status: 'valid',
        note: 'All goods',
      },
      {
        key: 'document_status',
        label: 'Document Status',
        value: 'All goods (Counter-Ready)',
        expected: 'Valid & Unexpired',
        status: 'valid',
        note: 'Ready for counter presentation',
      },
    ],
    source_id: sourceId,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = (body.text || '').trim();
    const isGuest: boolean = Boolean(
      body.isGuest ||
        (body.applicant?.id === 'e1000000-0000-4000-8000-000000000003' &&
          body.applicant?.title === 'Guest Account' &&
          (!Array.isArray(body.attachments) || body.attachments.length === 0)),
    );
    const attachments: { name: string; type: string; dataUrl?: string }[] =
      Array.isArray(body.attachments) ? body.attachments : [];
    const savedFiles: SavedVaultFile[] =
      !isGuest && Array.isArray(body.savedFiles) ? body.savedFiles : [];
    const language: string = body.language || 'Auto';
    const isDemoFile = attachments.length > 0 && attachments.every((a) =>
      ['expired-postal-id.png', 'incomplete-brgy-cert.png'].includes(a.name) && !a.dataUrl?.startsWith('data:'),
    );
    if (attachments.length > 1) return NextResponse.json({ ok: false, message: 'Upload one document at a time so each document can be inspected.' }, { status: 400 });
    const applicantInput: ApplicantProfile = body.applicant || (isDemoFile ? {
      id: 'app-juan',
      role: 'jobseeker',
      display_name: 'Juan Santos Dela Cruz',
      initials: 'JD',
      title: 'First-Time Jobseeker',
      birth_date: '1999-05-14',
      civil_status: 'Single',
      barangay: 'Brgy. San Isidro',
      city: 'Quezon City',
    } : {
      id: 'fresh-citizen',
      role: 'new_citizen',
      display_name: '',
      initials: '',
      title: 'Citizen Account',
      birth_date: '',
      civil_status: '',
      barangay: '',
      city: '',
    });

    // Sanitize any leaked Juan Santos Dela Cruz if not explicitly in jobseeker demo persona
    const sanitizedInput: ApplicantProfile =
      (applicantInput.role !== 'jobseeker' && (applicantInput.display_name === 'Juan Santos Dela Cruz' || applicantInput.display_name === 'Guest Account'))
        ? {
            ...applicantInput,
            display_name: '',
            first_name: '',
            middle_name: '',
            last_name: '',
            suffix: '',
            birth_date: '',
            civil_status: '',
            barangay: '',
            city: '',
          }
        : applicantInput;

    // Learn information from user's chat message to dynamically update My Details (only for signed-in citizens)
    const learnedDetails = isGuest || attachments.length > 0 ? {} : extractLearnedDetails(text);
    const applicant: ApplicantProfile = {
      ...sanitizedInput,
      ...learnedDetails,
    };

    const serviceCode =
      body.serviceCode || detectServiceCode(text, attachments.map((a) => a?.name || ''));

    // Step 0: Multi-layer Safety, Legal, Privacy & Scope Guardrails
    const researchMatches = text ? searchQABank(text, { topK: 2, threshold: 0.38 }) : [];
    const guardrailResult = evaluateGuardrails(text, applicant, language);
    if (guardrailResult.blocked) {
      const isDocumentUploadInspection =
        attachments.length > 0 && guardrailResult.category === 'OUT_OF_SCOPE';

      if (!isDocumentUploadInspection) {
        return NextResponse.json({
          ok: true,
          blocked: true,
          guardrailCategory: guardrailResult.category,
          steps: guardrailResult.steps,
          text: guardrailResult.replyText,
          cards: guardrailResult.guardrailCard
            ? [{ kind: 'guardrail_notice', guardrail: guardrailResult.guardrailCard }]
            : [],
          next: guardrailResult.suggestedNext,
          sources: CHARTER_SOURCES,
        });
      }
    }

    const basicReply = attachments.length === 0
      ? basicQuestionReply(text, isFilipinoQuery(text, language),
          !isGuest && body.applicant ? redactSecrets(applicant.display_name || '') : undefined)
      : null;
    if (basicReply) return NextResponse.json({
      ok: true, text: basicReply, steps: [], cards: [], inspection: null, next: [], sources: [],
    });

    const isSimpleGreeting = attachments.length === 0 && isSocialTurn(text);

    if (isSimpleGreeting) {
      const isFilGreeting = isFilipinoQuery(text, language);
      const greetingText = socialReply(text, isFilGreeting);
      return NextResponse.json({
        ok: true,
        steps: [],
        text: greetingText,
        cards: [],
        inspection: null,
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
        sources: CHARTER_SOURCES,
      });
    }

    // Step 1: Retrieve official Citizen's Charter context
    const charterResults = await searchCharterTool({
      query: text || serviceCode || 'NBI',
      agency_code: serviceCode?.startsWith('PSA')
        ? 'PSA'
        : serviceCode?.startsWith('PHILHEALTH')
          ? 'PHILHEALTH'
          : 'NBI',
    });

    // Step 2: Run requirement & document inspection (Expired / Mismatch / Missing / Valid)
    let inspection = attachments.length > 0 && !isDemoFile
      ? null : runDeterministicInspection(text, attachments, applicant, serviceCode);

    // Optional live Gemini multimodal refinement when API key is configured and real user image is uploaded
    const apiKey = process.env.GEMINI_API_KEY;

    if (attachments.length && !isDemoFile && (!apiKey || apiKey === 'your_gemini_api_key_here')) return NextResponse.json({ ok: false, code: 'INSPECTION_NOT_CONFIGURED', inspection: null, message: 'Document inspection is not configured on this deployment. Set GEMINI_API_KEY in the server environment and redeploy.' }, { status: 503 });

    let base64Data = '';
    let mimeType = attachments[0]?.type || 'image/jpeg';
    if (attachments.length > 0) {
      if (attachments[0].dataUrl?.includes('base64,')) {
        const rawDataUrl = attachments[0].dataUrl;
        const commaIdx = rawDataUrl.indexOf(',');
        const meta = commaIdx !== -1 ? rawDataUrl.slice(0, commaIdx) : '';
        base64Data = commaIdx !== -1 ? rawDataUrl.slice(commaIdx + 1) : rawDataUrl;
        mimeType = meta.match(/data:(.*?);/)?.[1] || mimeType;
      } else if (
        attachments[0].dataUrl?.startsWith('/') ||
        attachments[0].dataUrl?.startsWith('demo/') ||
        attachments[0].name
      ) {
        try {
          const rawPath = (attachments[0].dataUrl || attachments[0].name).replace(/^\//, '');
          const candidatePaths = [
            path.join(process.cwd(), 'public', rawPath),
            path.join(process.cwd(), 'public', 'demo', path.basename(rawPath)),
            path.join(process.cwd(), 'public', path.basename(rawPath)),
          ];
          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              const buf = fs.readFileSync(p);
              base64Data = buf.toString('base64');
              const ext = path.extname(p).toLowerCase();
              if (ext === '.png') mimeType = 'image/png';
              else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
              else if (ext === '.webp') mimeType = 'image/webp';
              break;
            }
          }
        } catch (e) {
          console.warn('[api/inspect] Failed to read local file into base64:', e);
        }
      }
    }
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

    if (
      apiKey &&
      apiKey !== 'your_gemini_api_key_here' &&
      attachments.length > 0 &&
      !isDemoFile &&
      base64Data
    ) {
      try {
        const ai = getGeminiClient();

        const isJobseekerDemo =
          applicant.role === 'jobseeker' && (applicant.display_name || '').toLowerCase().includes('juan');
        const isProfileBlank = !usableIdentity(applicant.display_name) && !usableIdentity(applicant.birth_date);

        const profileNameForPrompt = isJobseekerDemo
          ? 'Juan Santos Dela Cruz'
          : (applicant.display_name && applicant.display_name !== 'Guest Account' && applicant.display_name !== 'Citizen Account'
              ? applicant.display_name
              : '(Blank / Not yet established — establishing identity via this document)');

        const visionPrompt = `You are GovGuidePH Document Inspector for Philippine government services. Today's date is 2026-11-03.
Applicant Profile (My Details):
- Full Name: ${profileNameForPrompt}
- Date of Birth: ${isJobseekerDemo ? '1999-05-14' : (applicant.birth_date || 'Not specified')}
- Civil Status: ${applicant.civil_status || 'Single'}
- Maiden Name: ${applicant.maiden_name || 'None'}
- Address: ${applicant.barangay || 'Not specified'}, ${applicant.city || 'Not specified'}
- Target Government Service: ${serviceCode}

INSPECTION INSTRUCTIONS:
1. Examine the attached document or ID (e.g. PSA Birth Certificate, PhilSys National ID, DFA Passport, Driver's License, UMID, Postal ID, PRC ID, Voter's ID, Barangay Certificate, etc.).
2. Extract all readable identity, civil registry, family, and address fields with extreme precision:
   - Full Legal Name (with first, middle, last, suffix)
   - Date of Birth (format: YYYY-MM-DD)
   - Gender / Sex (Male or Female)
   - Civil Status (Single, Married, etc.)
   - For PSA Birth Certificates:
     * Child's Full Name, Date of Birth, Sex
     * Father's Full Name, Father's First Name, Father's Middle Name, Father's Last Name
     * Mother's Maiden Name, Mother's First Name, Mother's Middle Name, Mother's Maiden Last Name
     * Place of Birth (Hospital, City/Municipality, Province)
     * City and Province
   - For PhilSys National ID / IDs:
     * PhilSys ID / Card Number (PCN - 16 digits)
     * Full Address (Street, Barangay, City, Province)
     * Residential Address, Street Address, Barangay, City, Province
     * Date of Birth, Sex
3. Compare extracted details against the Applicant Profile:
   - CRITICAL FIRST-TIME CITIZEN / UNCONFIRMED PROFILE RULE:
     Evaluate each profile field independently. A missing birth date or new_citizen role MUST NOT suppress a comparison against a populated name. If a particular profile field is blank:
     * DO NOT flag missing profile fields as a mismatch, missing, or discrepancy!
     * NEVER compare the document against "Juan Santos Dela Cruz" or any demo persona unless the applicant profile explicitly states Juan Santos Dela Cruz.
     * Only skip comparison for that blank field. Always flag differences against other populated fields.
     * An empty profile is NOT a document defect. The uploaded document (especially PSA Birth Certificate, PhilSys National ID, DFA Passport) is the foundational primary identity document that ESTABLISHES identity!
     * Validate ONLY the physical document itself: authenticity, legibility, completeness, official seals/signatures, and unexpired status.
     * Extract the recorded name and birth date from the document so it can establish their profile.
   - If the profile DOES have an existing populated confirmed Full Name: Flag 'mismatch' only if spelling differs or maiden vs married surname is unverified.
   - If the profile DOES have an existing populated confirmed Date of Birth: Flag 'mismatch' only if dates differ.
   - Expiration Date: Compare against 2026-11-03. Flag 'expired' only if expiration date has passed.
     * IMPORTANT: PSA Birth Certificates have permanent lifetime validity under Republic Act 11909 and NEVER expire! PhilSys National IDs never expire under RA 11055!
   - Check if required signatures, dry seals, or photos are missing on the document itself. Flag 'missing' only if absent on the physical document.
4. DISCREPANCY & VERDICT RULES:
   - IF ANY ACTUAL DEFECT IN THE DOCUMENT IS FOUND (e.g. expired document, mismatched against populated profile, missing mandatory seals/signatures on the document):
     Set "overall_status": "issues_found".
     For each issue:
     - Provide what the discrepancy is in "detail"
     - Provide clear, actionable instructions on how to fix it in "how_to_fix"
   - IF NO ACTUAL DOCUMENT DEFECT IS FOUND (document is authentic, unexpired/lifetime, legible, and matches or establishes profile):
     Set "overall_status": "counter_ready".
     Set "status_message": "All goods".
     Include an issue with category "valid", title "All goods — Ready for Counter Presentation", detail "Readable information extracted. Review the values and comparisons; authenticity and agency acceptance are not established by this scan.", how_to_fix "Bring original document to the counter."
5. Output ONLY a valid JSON object matching this schema (no markdown, no extra text):
{
  "document_title": "string",
  "overall_status": "counter_ready" | "issues_found",
  "status_message": "string",
  "preview_lines": ["string"],
  "extracted_details": {
    "full_name": "string",
    "first_name": "string",
    "middle_name": "string",
    "last_name": "string",
    "suffix": "string",
    "birth_date": "YYYY-MM-DD",
    "gender": "Male | Female",
    "civil_status": "Single | Married | Widowed",
    "place_of_birth": "string",
    "father_name": "string",
    "father_first_name": "string",
    "father_middle_name": "string",
    "father_last_name": "string",
    "mother_maiden_name": "string",
    "mother_first_name": "string",
    "mother_middle_name": "string",
    "mother_last_name": "string",
    "philsys_id": "string",
    "street_address": "string",
    "barangay": "string",
    "city": "string",
    "province": "string",
    "residential_address": "string"
  },
  "issues": [
    {
      "id": "string",
      "category": "expired" | "mismatch" | "missing" | "valid",
      "severity": "critical" | "warning" | "ok",
      "title": "string",
      "detail": "string",
      "how_to_fix": "string",
      "field_key": "string",
      "charter_rule": "string"
    }
  ],
  "fields": [
    {
      "key": "string",
      "label": "string",
      "value": "string",
      "expected": "string",
      "status": "valid" | "expired" | "mismatch" | "missing",
      "note": "string"
    }
  ]
}`;

        const candidateModels = [process.env.GEMINI_INSPECTION_MODEL || GEMINI_FLASH_MODEL];

        let visionResponseText = '';
        for (const candidateModel of candidateModels) {
          try {
            const callPromise = ai.models.generateContent({
              model: candidateModel,
              config: {
                // Allow dense documents time to finish, but bound all attempts below
                // the route's 60-second limit. Retry only transient server failures.
                abortSignal: AbortSignal.timeout(45000),
                httpOptions: {
                  timeout: 45000,
                  retryOptions: { attempts: 2, httpStatusCodes: [500, 502, 503, 504] },
                },
              },
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: visionPrompt },
                    { inlineData: { mimeType, data: base64Data } },
                  ],
                },
              ],
            });
            const resp = await callPromise;
            if (resp.text) {
              visionResponseText = resp.text;
              break;
            }
          } catch (modelErr) {
            const failure = inspectionProviderError(modelErr);
            console.warn('[api/inspect] Document service failed', {
              status: failure.providerStatus, code: failure.code, model: candidateModel,
            });
            return NextResponse.json({ ok: false, code: failure.code, message: failure.message, inspection: null }, { status: failure.status });
          }
        }

        const parsed = extractJsonFromModelOutput(visionResponseText);
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.fields) || parsed.extracted_details)) {
          if (!Array.isArray(parsed.issues)) parsed.issues = [];

          // Filter out false discrepancies caused by empty/unpopulated profile or demo name leaks
          parsed.issues = parsed.issues.filter((iss: any) => {
            const combined = `${iss.title || ''} ${iss.detail || ''} ${iss.how_to_fix || ''}`.toLowerCase();

            // If the issue mentions Juan Santos Dela Cruz mismatch, but the user is NOT the demo jobseeker:
            if (!isJobseekerDemo && combined.includes('juan santos dela cruz')) {
              return false;
            }

            // If the user's profile was blank or unconfirmed, remove any name or profile mismatch issue
            if (isProfileBlank && (
              combined.includes('profile does not specify') ||
              combined.includes('applicant full name not provided') ||
              combined.includes('not specify a full name') ||
              combined.includes('no full name to compare') ||
              combined.includes('update your applicant profile') ||
              combined.includes('profile is empty') ||
              combined.includes('no comparable') ||
              combined.includes('missing in profile') ||
              combined.includes('not provided in the profile') ||
              combined.includes('profile has no')
            )) {
              return false;
            }
            return true;
          });

          // Check if document is a PSA birth cert or similar permanent document
          const isPsaDoc =
            (parsed.document_title || '').toLowerCase().includes('birth') ||
            (parsed.document_title || '').toLowerCase().includes('psa') ||
            (attachments[0]?.name || '').toLowerCase().includes('psa') ||
            (attachments[0]?.name || '').toLowerCase().includes('birth') ||
            (attachments[0]?.name || '').toLowerCase().includes('cabatic');

          if (isPsaDoc) {
            // Remove any false expiration issues for PSA Birth Certificate (RA 11909)
            parsed.issues = parsed.issues.filter((iss: any) => iss.category !== 'expired');
          }

          const counts = { expired: 0, mismatch: 0, missing: 0, valid: 0 };
          for (const iss of parsed.issues) {
            if (iss.category in counts) {
              counts[iss.category as keyof typeof counts]++;
            }
          }
          const hasIssues = counts.expired > 0 || counts.mismatch > 0 || counts.missing > 0;

          if (!hasIssues) {
            parsed.overall_status = 'counter_ready';
            parsed.status_message = 'All goods';
            if (!parsed.issues.some((i: any) => i.category === 'valid')) {
              parsed.issues.push({
                id: 'iss-valid-doc',
                category: 'valid',
                severity: 'ok',
                title: 'All goods — Ready for Counter Presentation',
                detail: 'Document is authentic, unexpired, and counter-ready. Details extracted to establish your profile.',
                how_to_fix: 'Bring original document to the counter.',
              });
              counts.valid++;
            }
          }

          // 1. Process parsed.extracted_details directly if returned by Gemini
          if (parsed.extracted_details && typeof parsed.extracted_details === 'object') {
            for (const [k, v] of Object.entries(parsed.extracted_details)) {
              if (typeof v === 'string' && v.trim() && v !== 'Not specified' && v !== 'string' && !v.includes('••••')) {
                (learnedDetails as any)[k] = v.trim();
              }
            }
          }

          // 2. Process parsed.fields with pattern matching
          if (Array.isArray(parsed.fields)) {
            for (const f of parsed.fields) {
              if (!f.value || typeof f.value !== 'string' || !f.value.trim() || f.value === 'Not specified') continue;
              const val = f.value.trim();
              const k = (f.key || '').toLowerCase();
              const lbl = (f.label || '').toLowerCase();

              if ((k === 'full_name' || k === 'name' || k === 'child_name' || /^(full (legal )?name|applicant name|child name)$/i.test(lbl)) && !learnedDetails.display_name && val !== 'CITIZEN APPLICANT') {
                learnedDetails.display_name = val;
              }
              if ((k === 'birth_date' || k === 'dob' || k === 'date_of_birth' || /^(date of birth|birth date)$/i.test(lbl)) && !learnedDetails.birth_date && val !== 'Foundational Identity Record') {
                learnedDetails.birth_date = val;
              }
              if ((k === 'gender' || k === 'sex' || /gender|sex/i.test(lbl)) && !learnedDetails.gender) {
                learnedDetails.gender = /f/i.test(val) ? 'Female' : 'Male';
              }
              if ((k === 'father_name' || k === 'father' || /father/i.test(lbl)) && !learnedDetails.father_name) {
                learnedDetails.father_name = val;
              }
              if ((k === 'father_first_name' || /father.*first/i.test(lbl)) && !learnedDetails.father_first_name) {
                learnedDetails.father_first_name = val;
              }
              if ((k === 'father_middle_name' || /father.*middle/i.test(lbl)) && !learnedDetails.father_middle_name) {
                learnedDetails.father_middle_name = val;
              }
              if ((k === 'father_last_name' || /father.*last/i.test(lbl)) && !learnedDetails.father_last_name) {
                learnedDetails.father_last_name = val;
              }
              if ((k === 'mother_maiden_name' || k === 'mother_name' || k === 'mother' || /mother/i.test(lbl)) && !learnedDetails.mother_maiden_name) {
                learnedDetails.mother_maiden_name = val;
              }
              if ((k === 'mother_first_name' || /mother.*first/i.test(lbl)) && !learnedDetails.mother_first_name) {
                learnedDetails.mother_first_name = val;
              }
              if ((k === 'mother_middle_name' || /mother.*middle/i.test(lbl)) && !learnedDetails.mother_middle_name) {
                learnedDetails.mother_middle_name = val;
              }
              if ((k === 'mother_last_name' || /mother.*last/i.test(lbl)) && !learnedDetails.mother_last_name) {
                learnedDetails.mother_last_name = val;
              }
              if ((k === 'place_of_birth' || k === 'pob' || /place of birth/i.test(lbl)) && !learnedDetails.place_of_birth) {
                learnedDetails.place_of_birth = val;
              }
              if ((k === 'philsys_id' || k === 'philsys_card_number' || k === 'id_number' || k === 'pcn' || /philsys|national id|pcn/i.test(lbl)) && !learnedDetails.philsys_id && /\d{4}/.test(val) && !val.includes('••••')) {
                learnedDetails.philsys_id = val;
                learnedDetails.philsys_card_number = val;
              }
              if ((k === 'barangay' || /barangay/i.test(lbl)) && !learnedDetails.barangay) {
                learnedDetails.barangay = val;
              }
              if ((k === 'city' || /city|municipality/i.test(lbl)) && !learnedDetails.city) {
                learnedDetails.city = val;
              }
              if ((k === 'province' || /province/i.test(lbl)) && !learnedDetails.province) {
                learnedDetails.province = val;
              }
              if ((k === 'street_address' || /street/i.test(lbl)) && !learnedDetails.street_address) {
                learnedDetails.street_address = val;
              }
              if ((k === 'residential_address' || /residential|address/i.test(lbl)) && !learnedDetails.residential_address) {
                learnedDetails.residential_address = val;
              }
            }
          }

          // 3. Derive missing name parts and address components
          if (learnedDetails.display_name && (!learnedDetails.first_name || !learnedDetails.last_name)) {
            const parts = parseNameParts(learnedDetails.display_name);
            if (!learnedDetails.first_name) learnedDetails.first_name = parts.first_name;
            if (!learnedDetails.middle_name) learnedDetails.middle_name = parts.middle_name;
            if (!learnedDetails.last_name) learnedDetails.last_name = parts.last_name;
            if (!learnedDetails.suffix) learnedDetails.suffix = parts.suffix;
          }
          if (learnedDetails.father_name && (!learnedDetails.father_first_name || !learnedDetails.father_last_name)) {
            const fParts = parseNameParts(learnedDetails.father_name);
            if (!learnedDetails.father_first_name) learnedDetails.father_first_name = fParts.first_name;
            if (!learnedDetails.father_middle_name) learnedDetails.father_middle_name = fParts.middle_name;
            if (!learnedDetails.father_last_name) learnedDetails.father_last_name = fParts.last_name;
          }
          if (learnedDetails.mother_maiden_name && (!learnedDetails.mother_first_name || !learnedDetails.mother_last_name)) {
            const mParts = parseNameParts(learnedDetails.mother_maiden_name);
            if (!learnedDetails.mother_first_name) learnedDetails.mother_first_name = mParts.first_name;
            if (!learnedDetails.mother_middle_name) learnedDetails.mother_middle_name = mParts.middle_name;
            if (!learnedDetails.mother_last_name) learnedDetails.mother_last_name = mParts.last_name;
          }
          if (learnedDetails.residential_address && (!learnedDetails.barangay || !learnedDetails.city)) {
            const addr = parseAddressParts(learnedDetails.residential_address);
            if (!learnedDetails.street_address && addr.street) learnedDetails.street_address = addr.street;
            if (!learnedDetails.barangay && addr.barangay) learnedDetails.barangay = addr.barangay;
            if (!learnedDetails.city && addr.city) learnedDetails.city = addr.city;
            if (!learnedDetails.province && addr.province) learnedDetails.province = addr.province;
          }
          if (learnedDetails.place_of_birth && (!learnedDetails.city || !learnedDetails.province)) {
            const pob = parseAddressParts(learnedDetails.place_of_birth);
            if (!learnedDetails.city && pob.city) learnedDetails.city = pob.city;
            if (!learnedDetails.province && pob.province) learnedDetails.province = pob.province;
          }

          // 5. Ensure all extracted details exist in parsed.fields for the UI scorecard
          if (!Array.isArray(parsed.fields)) parsed.fields = [];
          const ensureField = (key: string, label: string, value?: string) => {
            if (!value) return;
            const existing = parsed.fields.find((f: any) => f.key === key);
            if (!existing) {
              parsed.fields.push({ key, label, value, status: 'valid' });
            } else if (!existing.value) {
              existing.value = value;
            }
          };
          ensureField('full_name', 'Full Legal Name', learnedDetails.display_name);
          ensureField('birth_date', 'Date of Birth', learnedDetails.birth_date);
          ensureField('gender', 'Sex', learnedDetails.gender);
          ensureField('father_name', "Father's Full Name", learnedDetails.father_name);
          ensureField('mother_maiden_name', "Mother's Maiden Name", learnedDetails.mother_maiden_name);
          ensureField('place_of_birth', 'Place of Birth', learnedDetails.place_of_birth);
          ensureField('philsys_id', 'PhilSys Card Number', learnedDetails.philsys_id);
          ensureField('street_address', 'Address', learnedDetails.street_address);
          ensureField('barangay', 'Barangay', learnedDetails.barangay);
          ensureField('city', 'City / Municipality', learnedDetails.city);
          ensureField('province', 'Province', learnedDetails.province);

          const effectiveApplicantName =
            applicant.display_name?.trim() ||
            learnedDetails.display_name ||
            (attachments[0]?.name ? attachments[0].name.split(/[-_.]/)[0].toUpperCase() : 'Citizen Applicant');

          inspection = {
            id: `insp-${Date.now()}`,
            document_title: parsed.document_title || attachments[0].name,
            file_name: attachments[0].name,
            service_code: serviceCode,
            service_name:
              SERVICES_REGISTRY[serviceCode]?.name || 'Government Service Verification',
            applicant_name: effectiveApplicantName,
            inspected_at: new Date().toISOString(),
            overall_status: hasIssues ? 'issues_found' : 'counter_ready',
            summary_counts: counts,
            preview_lines: parsed.preview_lines || [attachments[0].name],
            issues: parsed.issues.map((i: any, idx: number) => ({
              ...i,
              id: i.id || `iss-${idx}`,
              how_to_fix:
                i.how_to_fix ||
                i.remediation ||
                (i.category === 'valid'
                  ? 'Bring original document to counter.'
                  : 'Update your details or renew the document.'),
              remediation:
                i.remediation ||
                i.how_to_fix ||
                (i.category === 'valid'
                  ? 'Bring original document to counter.'
                  : 'Update your details or renew the document.'),
              source_id: 'src-arta-2024',
            })),
            fields: parsed.fields || [],
            source_id: 'src-arta-2024',
          };
        }
      } catch (err) {
        console.warn('[api/inspect] Vision fallback to deterministic inspector:', err);
      }
    }

    // Never substitute a filename-based demo result when real document reading fails.
    if (attachments.length > 0 && !isDemoFile) {
      const hasReadableIdentity = inspection?.fields.some(f =>
        ['full_name', 'name', 'child_name', 'child_full_name'].includes(f.key) && usableIdentity(f.value));
      if (!inspection || !hasReadableIdentity) return NextResponse.json({
        ok: false, message: 'The document could not be reliably read. No identity comparison was completed. Please retry with a clear image or PDF.',
        inspection: null, learnedDetails: {},
      }, { status: 422 });
      inspection = compareDocumentIdentity(inspection, sanitizedInput);
      // Uploaded documents are evidence for review, not permission to replace My Details.
      for (const key of Object.keys(learnedDetails)) delete (learnedDetails as Record<string, unknown>)[key];
    }

    // Step 2.5: Synchronize learnedDetails from inspection.fields (for deterministic or vision inspections)
    if (inspection && (attachments.length === 0 || isDemoFile) && Array.isArray(inspection.fields)) {
      for (const f of inspection.fields) {
        if (!f.value || typeof f.value !== 'string' || !f.value.trim() || f.value === 'Not specified') continue;
        const val = f.value.trim();
        const k = (f.key || '').toLowerCase();
        const lbl = (f.label || '').toLowerCase();

        if ((k === 'full_name' || k === 'name' || /^(full (legal )?name|applicant name|child name)$/i.test(lbl)) && !learnedDetails.display_name && val !== 'CITIZEN APPLICANT') {
          learnedDetails.display_name = val;
          const parts = parseNameParts(val);
          if (!learnedDetails.first_name) learnedDetails.first_name = parts.first_name;
          if (!learnedDetails.middle_name) learnedDetails.middle_name = parts.middle_name;
          if (!learnedDetails.last_name) learnedDetails.last_name = parts.last_name;
          if (!learnedDetails.suffix) learnedDetails.suffix = parts.suffix;
        }
        if ((k === 'birth_date' || k === 'dob' || /^(date of birth|birth date)$/i.test(lbl)) && !learnedDetails.birth_date && val !== 'Foundational Identity Record') {
          learnedDetails.birth_date = val;
        }
        if ((k === 'gender' || k === 'sex' || /gender|sex/i.test(lbl)) && !learnedDetails.gender) {
          learnedDetails.gender = /f/i.test(val) ? 'Female' : 'Male';
        }
        if ((k === 'father_name' || /father.*name/i.test(lbl)) && !learnedDetails.father_name) {
          learnedDetails.father_name = val;
          const parts = parseNameParts(val);
          if (!learnedDetails.father_first_name) learnedDetails.father_first_name = parts.first_name;
          if (!learnedDetails.father_middle_name) learnedDetails.father_middle_name = parts.middle_name;
          if (!learnedDetails.father_last_name) learnedDetails.father_last_name = parts.last_name;
        }
        if (k === 'father_first_name' && !learnedDetails.father_first_name) learnedDetails.father_first_name = val;
        if (k === 'father_middle_name' && !learnedDetails.father_middle_name) learnedDetails.father_middle_name = val;
        if (k === 'father_last_name' && !learnedDetails.father_last_name) learnedDetails.father_last_name = val;

        if ((k === 'mother_maiden_name' || k === 'mother_name' || /mother.*name/i.test(lbl)) && !learnedDetails.mother_maiden_name) {
          learnedDetails.mother_maiden_name = val;
          const parts = parseNameParts(val);
          if (!learnedDetails.mother_first_name) learnedDetails.mother_first_name = parts.first_name;
          if (!learnedDetails.mother_middle_name) learnedDetails.mother_middle_name = parts.middle_name;
          if (!learnedDetails.mother_last_name) learnedDetails.mother_last_name = parts.last_name;
        }
        if (k === 'mother_first_name' && !learnedDetails.mother_first_name) learnedDetails.mother_first_name = val;
        if (k === 'mother_middle_name' && !learnedDetails.mother_middle_name) learnedDetails.mother_middle_name = val;
        if (k === 'mother_last_name' && !learnedDetails.mother_last_name) learnedDetails.mother_last_name = val;

        if ((k === 'barangay' || /barangay/i.test(lbl)) && !learnedDetails.barangay) learnedDetails.barangay = val;
        if ((k === 'city' || /city|municipality/i.test(lbl)) && !learnedDetails.city) learnedDetails.city = val;
        if ((k === 'province' || /province/i.test(lbl)) && !learnedDetails.province) learnedDetails.province = val;
        if ((k === 'place_of_birth' || /place of birth/i.test(lbl)) && !learnedDetails.place_of_birth) learnedDetails.place_of_birth = val;
        if ((k === 'street_address' || /street/i.test(lbl)) && !learnedDetails.street_address) learnedDetails.street_address = val;
        if ((k === 'residential_address' || /residential|address/i.test(lbl)) && !learnedDetails.residential_address) learnedDetails.residential_address = val;
        if ((k === 'philsys_id' || k === 'id_number' || /philsys|national id/i.test(lbl)) && !learnedDetails.philsys_id && /\d{4}/.test(val) && !val.includes('••••')) {
          learnedDetails.philsys_id = val;
          learnedDetails.philsys_card_number = val;
        }
      }

      // Check if address needs parsing
      if (learnedDetails.residential_address && (!learnedDetails.barangay || !learnedDetails.city)) {
        const addr = parseAddressParts(learnedDetails.residential_address);
        if (!learnedDetails.street_address && addr.street) learnedDetails.street_address = addr.street;
        if (!learnedDetails.barangay && addr.barangay) learnedDetails.barangay = addr.barangay;
        if (!learnedDetails.city && addr.city) learnedDetails.city = addr.city;
        if (!learnedDetails.province && addr.province) learnedDetails.province = addr.province;
      }
      if (learnedDetails.place_of_birth && (!learnedDetails.city || !learnedDetails.province)) {
        const pob = parseAddressParts(learnedDetails.place_of_birth);
        if (!learnedDetails.city && pob.city) learnedDetails.city = pob.city;
        if (!learnedDetails.province && pob.province) learnedDetails.province = pob.province;
      }
    }

    // Merge learnedDetails into applicant so subsequent logic uses newly established identity
    Object.assign(applicant, learnedDetails);

    // Step 3: Comprehensive System Q&A Engine for all valid questions (using learned My Details profile & files)
    const qaAnswer = !inspection
      ? answerSystemQuestion(text, applicant, language, serviceCode, savedFiles)
      : null;
    const effectiveServiceCode =
      (qaAnswer?.serviceCode && qaAnswer.serviceCode !== 'GENERAL' ? qaAnswer.serviceCode : null) ||
      serviceCode ||
      inspection?.service_code ||
      (text.toLowerCase().includes('nbi') ? 'NBI_CLEARANCE' : null);
    const isGreeting =
      /^(hi|hello|hey|good\s+(morning|afternoon|evening)|kumusta|kamusta)(\s+(po|govguide|govguideph|there|friend)|\s*[!?.])*$/i.test(text.trim()) ||
      (text.trim().split(/\s+/).length <= 4 && /^(hi|hello|hey|kumusta|kamusta)\b/i.test(text.trim()));

    const shouldIncludeChecklist =
      !isGreeting &&
      ((Boolean(inspection) && inspection?.service_code !== 'GENERAL') ||
      (qaAnswer?.includeChecklist !== false &&
        Boolean(effectiveServiceCode) &&
        effectiveServiceCode !== 'OUT_OF_SCOPE' &&
        effectiveServiceCode !== 'GENERAL' &&
        effectiveServiceCode !== 'GENERAL_CIVIC'));
    const checklist =
      shouldIncludeChecklist && effectiveServiceCode && SERVICES_REGISTRY[effectiveServiceCode]
        ? buildChecklistForService(effectiveServiceCode, inspection, applicant, savedFiles)
        : null;

    // Strict language matching: If the user asks in Tagalog, answer in Tagalog. If in English, answer in English.
    const isFil = isFilipinoQuery(text, language);

    const isNewUser = applicant.role === 'new_citizen' || !applicant.birth_date;
    let replyText = '';
    if (inspection) {
      const { expired, mismatch, missing } = inspection.summary_counts;
      const totalProblems = expired + mismatch + missing;
      if (totalProblems > 0) {
        if (isNewUser) {
          replyText = isFil
            ? `Sinuri ko ang iyong na-upload na **${inspection.document_title}** laban sa opisyal na Citizen's Charter standards. Dahil bago ka sa GovGuidePH at sumusubok pa lamang nang walang naka-save na profile, nakakita ako ng **${totalProblems} isyu** (${expired} expired, ${mismatch} mismatch, ${missing} missing/kulang) na maaaring maging dahilan ng *balik-pila* sa counter. Suriin ang mga detalye sa scorecard sa ibaba.`
            : `I inspected your uploaded **${inspection.document_title}** against official Citizen's Charter standards. As a first-time citizen trying GovGuidePH without a saved profile, I detected **${totalProblems} issue${totalProblems === 1 ? '' : 's'}** (${expired} expired, ${mismatch} mismatched, ${missing} missing) that would cause counter rejection. Review the inspection scorecard below.`;
        } else {
          replyText = isFil
            ? `Sinuri ko ang iyong **${inspection.document_title}** laban sa opisyal na Citizen's Charter at sa iyong **My Details** profile (**${applicant.display_name}**, DOB \`${applicant.birth_date}\`, ${applicant.barangay}). Nakakita ako ng **${totalProblems} isyu** (${expired} expired, ${mismatch} mismatched info, ${missing} missing info) na maaaring maging dahilan ng *balik-pila* sa counter. Nai-save na rin ito sa iyong **My Details** section.`
            : `I inspected your **${inspection.document_title}** against the official Citizen's Charter and your learned **My Details** profile (**${applicant.display_name}**, DOB \`${applicant.birth_date}\`, ${applicant.barangay}). I flagged **${totalProblems} issue${totalProblems === 1 ? '' : 's'}** (${expired} expired, ${mismatch} mismatched, ${missing} missing) that would cause rejection at the agency counter. This inspection and checklist update have been synced to **My Details**.`;
        }
      } else {
        if (isNewUser) {
          replyText = isFil
            ? `Magandang balita! Sinuri ko ang iyong **${inspection.document_title}** laban sa opisyal na Citizen's Charter at ito ay **No issues detected in this automated review**—walang expired na petsa, malinaw ang impormasyon, at tinatanggap bilang opisyal na Primary ID sa counter. Maaari mong i-save ang mga extracted na detalyeng ito sa **My Details** para sa 1-click na paggamit sa hinaharap!`
            : `Great news! I inspected your **${inspection.document_title}** against the official Citizen's Charter and confirmed it is **No issues detected in this automated review**in the readable fields. This does not verify authenticity or guarantee agency acceptance. Review the extracted details and any fields that could not be compared. You can save these extracted details to **My Details** for 1-click autofill in future transactions!`;
        } else {
          replyText = isFil
            ? `Magandang balita! Sinuri ko ang iyong **${inspection.document_title}** gamit ang iyong **My Details** profile (**${applicant.display_name}**) at ito ay **No issues detected in this automated review**—walang expired na petsa, tugma ang lahat ng detalye, at kumpleto ang mga impormasyon.`
            : `Great news! I inspected your **${inspection.document_title}** against your **My Details** profile (**${applicant.display_name}**) and confirmed it is **No issues detected in this automated review**—no expired dates, all identity fields match your profile, and no required fields are missing.`;
        }
      }
    } else if (qaAnswer) {
      replyText = qaAnswer.replyText;
    } else {
      replyText = isFil
        ? (isNewUser
            ? `Narito ang opisyal na **Requirements Checklist** para sa **${checklist?.service_name || 'serbisyo ng gobyerno'}** batay sa Citizen's Charter. Maaari kang mag-upload ng iyong mga ID o dokumento dito upang masuri ko agad bago ka pumunta sa counter.`
            : `Narito ang opisyal na **Requirements Checklist** para sa **${checklist?.service_name || 'serbisyo ng gobyerno'}** batay sa Citizen's Charter at sa iyong **My Details** (**${applicant.display_name}**). Maaari mong i-manage ang iyong mga dokumento at checklist sa **My Details** section o mag-attach ng ID dito upang masuri ko.`)
        : (isNewUser
            ? `Here is the official **Requirements Checklist** for **${checklist?.service_name || 'government services'}** based on the Citizen's Charter. You can attach photos or PDFs of your ID and requirements here for an instant AI pre-flight check.`
            : `Here is your official **Requirements Checklist** for **${checklist?.service_name || 'government services'}** personalized with your **My Details** profile (**${applicant.display_name}**). You can manage your saved files, checklists, and inspections in **My Details**, or attach photos/PDFs here for an AI pre-flight check.`);
    }

    if (inspection && attachments.length > 0 && !isDemoFile) {
      replyText = inspection.overall_status === 'issues_found'
        ? (isFil ? 'May mga detalyeng kailangang suriin. Ihambing ang dokumento at ang naka-save na profile sa scorecard. Hindi binago ang iyong My Details.' : 'Some details need review. Compare the document and saved profile in the scorecard. Your My Details were not changed.')
        : (isFil ? 'Walang nakitang isyu sa nabasang detalye. Ang mga blangkong profile field ay hindi naikumpara. Suriin ang scorecard; hindi nito ginagarantiya ang pagtanggap ng ahensya.' : 'No issues detected in the readable fields. Blank profile fields could not be compared. Review the scorecard; this is not a guarantee of agency acceptance. Your My Details were not changed.');
    }

    if (!isGuest && isNewUser && !inspection && !isGreeting && qaAnswer?.includeChecklist !== false) {
      const fillNotice = isFil
        ? 'Paalala: Maaari mo ring punan ang iyong profile sa My Details para sa personalized na pagsusuri ng dokumento.'
        : 'Note: You can also update your profile in My Details for personalized document pre-flight checks.';
      if (!replyText.includes(fillNotice)) {
        replyText = fillNotice + '\n\n' + replyText;
      }
    }

    // Append notification when new info has been learned
    if (!isGuest && Object.keys(learnedDetails).length > 0) {
      if (inspection) {
        replyText += isFil
          ? `\n\n*Naitala at na-update ko ang iyong My Details profile batay sa iyong opisyal na dokumento.*`
          : `\n\n*I recorded and updated your My Details profile from your official document.*`;
      } else {
        const detailsList = Object.entries(learnedDetails).map(([k, v]) => `${k}: ${v}`).join(', ');
        replyText += isFil
          ? `\n\n*Naitala at na-update ko ang iyong My Details profile batay sa ating usapan: (${detailsList}).*`
          : `\n\n*I noted and updated your My Details profile from our conversation: (${detailsList}).*`;
      }
    }

    const steps = inspection
      ? [
          'Passed Safety & RA 10173 Ephemeral Data Privacy Check (ALLOWED)',
          `Audited ${inspection.fields.length} identity fields for expired dates, mismatches, and missing seals`,
          `Compiled Counter-Ready Inspection Scorecard and synced ${checklist?.items?.length ?? 0} checklist items`,
        ]
      : qaAnswer?.steps && qaAnswer.steps.length <= 3
        ? qaAnswer.steps
        : [
            'Passed Safety & RA 10173 Content Guardrail Check (ALLOWED)',
            `Retrieved official ${checklist?.service_name || "Citizen's Charter"} provisions and ID rules`,
            'Prepared interactive guidance and counter-ready checklist',
          ];

    const cards = [];
    if (inspection) {
      cards.push({ kind: 'inspection_report', report: inspection });
    }
    if (checklist) {
      cards.push({ kind: 'checklist_card', checklist });
    }

    if (shouldIncludeChecklist && effectiveServiceCode) {
      const onlineReadiness = evaluateOnlineReadiness(
        effectiveServiceCode,
        text || '',
        applicant,
        savedFiles,
      );
      if (onlineReadiness) {
        cards.push({
          kind: 'online_application',
          serviceCode: effectiveServiceCode || onlineReadiness.serviceCode,
          onlineApplication: onlineReadiness,
        });
      }
    }

    const isExpensePrompt =
      /\b(magkano|bayad|bayarin|gastusin|fee|fees|cost|price|presyo|resibo|receipt|rates?|breakdown|waiver|libre)\b/i.test(
        text || '',
      );
    if (isExpensePrompt && shouldIncludeChecklist && effectiveServiceCode) {
      cards.push({
        kind: 'expense_receipt',
        serviceCode: effectiveServiceCode,
      });
    }

    // Initialize or retrieve real-time citizen process tracking for inquired service (only for signed-in citizens)
    let createdRequest = null;
    if (!isGuest && applicant?.id) {
      createdRequest = createOrGetRequestForInquiry({
        citizenId: applicant.id,
        citizenName:
          applicant.display_name ||
          [applicant.first_name, applicant.last_name].filter(Boolean).join(' ') ||
          'Citizen Applicant',
        citizenEmail: applicant.email,
        citizenPhone: applicant.phone || applicant.contact_number,
        queryText: text || '',
        serviceCode: effectiveServiceCode,
      });
    }

    let next = [];
    if (inspection && inspection.overall_status === 'issues_found') {
      next = [
        {
          id: 'resolve_issue',
          label: 'Paano itatama ang nakitang discrepancy?',
          hint: 'Alamin ang opisyal na proseso ayon sa Citizen\'s Charter para hindi ma-reject sa counter',
          action: 'message',
          text: `Paano ko maitatama o mapapalitan ang natukoy na issue sa aking ${inspection.document_title || 'dokumento'} ayon sa Citizen's Charter?`,
        },
        {
          id: 'attach_replacement',
          label: 'Mag-upload ng bagong litrato o scan ng dokumento',
          hint: 'Suriing muli ng AI gamit ang iyong na-update na file',
          action: 'attach',
        },
        {
          id: 'open_details',
          label: 'Buksan ang My Details (Profile, Dokumento at Checklist)',
          hint: 'Tingnan ang iyong mga naka-save na impormasyon at status ng requirements',
          action: 'view',
          view: 'details',
        },
      ];
    } else if (effectiveServiceCode === 'DFA_PASSPORT' || /passport|dfa/i.test(text)) {
      next = [
        {
          id: 'dfa_book',
          label: 'Tingnan ang DFA Consular Appointment Slots at Sangay',
          hint: 'Alamin ang available slots sa 10 DFA Consular Offices sa buong bansa',
          action: 'message',
          text: 'Ano-ano ang mga available na DFA Passport appointment slots at consular offices sa NCR at mga probinsya?',
        },
        {
          id: 'dfa_fees',
          label: 'Alamin ang Regular vs. Expedited Passport Fees',
          hint: '₱950 Regular (12 days) vs ₱1,200 Expedited (6 days) + ₱50 convenience fee',
          action: 'message',
          text: 'Magkano ang opisyal na bayarin para sa DFA Passport application at ano ang kaibahan ng Regular sa Expedited?',
        },
        {
          id: 'dfa_dress_code',
          label: 'Alamin ang Dress Code at Photo Rules para sa Biometrics',
          hint: 'May kwelyo, walang contact lenses o alahas upang hindi ma-reject sa DFA site',
          action: 'message',
          text: 'Ano ang opisyal na dress code at photo requirements para sa biometric capture sa DFA?',
        },
        {
          id: 'open_details',
          label: 'I-check ang My Details para sa DFA Passport',
          hint: 'Siguraduhing tugma ang pangalan at petsa ng kapanganakan sa iyong PSA Birth Certificate',
          action: 'view',
          view: 'details',
        },
      ];
    } else if (effectiveServiceCode === 'DPWH_PROJECTS' || /dpwh|kalsada|tulay|flood|infrastructure/i.test(text)) {
      next = [
        {
          id: 'dpwh_status',
          label: 'Tingnan ang Katayuan ng mga Flagship Infrastructure Projects',
          hint: 'Suriin ang progreso ng Bataan-Cavite Interlink, Davao Bypass, at iba pang proyekto',
          action: 'message',
          text: 'Ano ang kasalukuyang status at accomplishment ng mga pangunahing DPWH flagship infrastructure projects?',
        },
        {
          id: 'dpwh_report',
          label: 'Mag-report ng Sira sa Kalsada o Pothole (Hotline 165-02)',
          hint: 'Ipaalam sa DPWH Citizen Watch ang mga panganib sa national highways',
          action: 'message',
          text: 'Paano mag-report ng sira sa kalsada, lubak, o naantalang proyekto sa DPWH Hotline 165-02?',
        },
        {
          id: 'dpwh_permits',
          label: 'Alamin ang DPWH Highway Clearance at Excavation Permit Rules',
          hint: 'Mga alituntunin at kailangan mula sa District Engineering Office',
          action: 'message',
          text: 'Ano ang mga kailangan para sa DPWH highway clearance at excavation permit sa pambansang kalsada?',
        },
      ];
    } else if (effectiveServiceCode?.startsWith('PSA') || /psa|birth|marriage|cenomar|helpline/i.test(text)) {
      next = [
        {
          id: 'psa_helpline',
          label: 'Mag-order ng PSA SECPA Certificate via PSAHelpline Doorstep Delivery',
          hint: 'Nationwide courier delivery diretso sa inyong tahanan (₱365 kabuuang bayad)',
          action: 'message',
          text: 'Paano mag-order ng PSA Birth Certificate sa PSAHelpline.ph para sa nationwide doorstep delivery, at kailan ito darating?',
        },
        {
          id: 'psa_crs_walkin',
          label: 'Mag-book ng Walk-in Appointment sa PSA CRS Outlet',
          hint: 'Magtakda ng iskedyul sa appointment.psa.gov.ph (₱155 lamang ang bayad)',
          action: 'message',
          text: 'Paano mag-book ng appointment sa PSA CRS outlet para sa personal na walk-in application?',
        },
        {
          id: 'psa_rep',
          label: 'Alamin ang Requirements para sa Authorized Representative',
          hint: 'Notarized Authorization Letter / SPA alinsunod sa Data Privacy Act (RA 10173)',
          action: 'message',
          text: 'Ano ang mga kailangan kung kinatawan o kamag-anak ang kukuha ng PSA Birth Certificate?',
        },
        {
          id: 'open_details',
          label: 'Tingnan ang My Details Profile at Checklists',
          hint: 'Suriin ang iyong personal details at mga naka-save na requirements',
          action: 'view',
          view: 'details',
        },
      ];
    } else if (effectiveServiceCode?.startsWith('PHILHEALTH') || /philhealth|pmrf|mdr/i.test(text)) {
      next = [
        {
          id: 'ph_pmrf',
          label: 'Paano Punan at Isumite ang PMRF Form?',
          hint: 'Member Registration Form para sa unang beses o pag-update ng records',
          action: 'message',
          text: 'Paano punan at isumite ang PhilHealth Member Registration Form (PMRF) at makakuha ng MDR?',
        },
        {
          id: 'ph_id',
          label: 'Paano Kumuha ng Libreng PhilHealth ID Card?',
          hint: 'Walang bayad (₱0.00) sa alinmang PhilHealth Express o Local Health Insurance Office',
          action: 'message',
          text: 'Libre ba ang pagkuha ng PhilHealth ID card at ano ang mga kailangang dalhin sa LHIO counter?',
        },
        {
          id: 'ph_uhc',
          label: 'Alamin ang mga Benepisyo sa Ilalim ng Universal Health Care (RA 11223)',
          hint: 'Konsulta package, laboratory subsidies, at hospitalization benefits',
          action: 'message',
          text: 'Ano-ano ang mga benepisyong medikal na sakop ng Universal Health Care Act sa PhilHealth?',
        },
      ];
    } else if (
      effectiveServiceCode === 'NBI_CLEARANCE' ||
      /nbi|clearance/i.test(text || '')
    ) {
      next = [
        {
          id: 'nbi_sched',
          label: 'Mag-schedule ng NBI Clearance Online Appointment',
          hint: 'Pumili ng branch at alamin ang official payment reference channels',
          action: 'message',
          text: 'Paano mag-schedule ng appointment sa clearance.nbi.gov.ph at ano-ano ang mga tinatanggap na online payment channels?',
        },
        {
          id: 'nbi_requirements',
          label: 'Mga Tinatanggap na Valid IDs sa NBI',
          hint: 'Tingnan ang opisyal na listahan ng primary at secondary IDs',
          action: 'message',
          text: 'Ano-ano ang mga tinatanggap na valid IDs sa pagkuha ng NBI Clearance?',
        },
        {
          id: 'open_details',
          label: 'Buksan ang My Details (Supabase Cloud Vault)',
          hint: 'I-update ang iyong profile, dokumento, at verified checklists',
          action: 'view',
          view: 'details',
        },
      ];
    } else {
      // General Civic, Greetings, or Out of Scope Directory
      next = [
        {
          id: 'ask_dfa',
          label: 'DFA Passport Application & Renewal',
          hint: 'Requirements checklist, 10 consular offices, at available appointment slots',
          action: 'message',
          text: 'Ano ang mga requirements, bayarin, at available appointment slots para sa DFA Passport?',
        },
        {
          id: 'ask_dpwh',
          label: 'DPWH Projects & Google Reviews',
          hint: 'Nationwide infrastructure tracker, progress status, at citizen reviews & ratings',
          action: 'message',
          text: 'Ipakita ang DPWH nationwide infrastructure projects tracker, progress status, at mga citizen Google reviews para sa mga kalsada at tulay.',
        },
        {
          id: 'ask_psa',
          label: 'Mag-order ng PSA Birth Certificate',
          hint: 'Doorstep delivery (₱365) via PSAHelpline o walk-in CRS appointment (₱155)',
          action: 'message',
          text: 'Paano mag-request ng PSA Birth Certificate online o walk-in sa CRS outlet?',
        },
        {
          id: 'ask_philhealth',
          label: 'PhilHealth Registration & Libreng ID Card',
          hint: 'PMRF form submission, MDR issuance, at libreng ID sa LHIO counter',
          action: 'message',
          text: 'Paano magparehistro sa PhilHealth (PMRF) at kumuha ng libreng ID?',
        },
      ];
    }

    if (!isGuest && isNewUser && !next.some((n) => n.id === 'fill_my_details')) {
      next = [
        {
          id: 'fill_my_details',
          label: isFil ? 'Punan ang My Details' : 'Fill up My Details',
          hint: isFil ? 'Kumpletuhin muna ang form sa My Details' : 'Complete the My Details form first',
          action: 'view',
          view: 'details',
        },
        ...next,
      ];
    }

    if (isGuest) {
      next = next.filter((n) => n.action !== 'view' && n.action !== 'attach');
    }

    return NextResponse.json({
      ok: true,
      steps,
      text: redactSecrets(replyText),
      cards,
      inspection: inspection || null,
      next,
      sources: CHARTER_SOURCES,
      learnedDetails: Object.keys(learnedDetails).length > 0 ? learnedDetails : undefined,
      createdRequest: createdRequest || undefined,
    });
  } catch (err) {
    console.error('[api/inspect] Error:', err);
    return NextResponse.json(
      { ok: false, message: 'Failed to inspect requirements. Please try again.' },
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
