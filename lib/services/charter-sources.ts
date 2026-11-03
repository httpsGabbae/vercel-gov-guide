export interface ApplicantProfile {
  id: string;
  role: 'jobseeker' | 'married_applicant' | 'new_citizen';
  display_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  initials: string;
  title: string;
  birth_date: string;
  civil_status: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  barangay: string;
  city: string;
  province?: string;
  region?: string;
  street_address?: string;
  residential_address?: string;
  zip_code?: string;
  maiden_name?: string;
  place_of_birth?: string;
  email?: string;
  phone?: string;
  contact_number?: string;
  category?: string;
  notes?: string;

  // Family details (Essential for PSA & NBI)
  father_name?: string;
  father_first_name?: string;
  father_middle_name?: string;
  father_last_name?: string;
  father_suffix?: string;
  mother_maiden_name?: string;
  mother_first_name?: string;
  mother_middle_name?: string;
  mother_last_name?: string;
  mother_suffix?: string;

  // Philippine Government Identifiers
  philsys_id?: string;
  philsys_card_number?: string;
  philhealth_number?: string;
  tin?: string;
  tin_number?: string;
  sss_number?: string;
  pagibig_number?: string;
  passport_number?: string;
}

export function formatFullName(
  first?: string,
  middle?: string,
  last?: string,
  suffix?: string,
): string {
  const parts = [first?.trim(), middle?.trim(), last?.trim()].filter(Boolean);
  const base = parts.join(' ');
  if (suffix && suffix.trim()) {
    return base ? `${base} ${suffix.trim()}` : suffix.trim();
  }
  return base;
}

const COMMON_SUFFIXES = ['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V'];

export function parseNameParts(fullName: string): {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
} {
  const raw = (fullName || '').trim();
  if (!raw) {
    return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  }

  // Handle "Lastname, Firstname Middlename Suffix"
  if (raw.includes(',')) {
    const [lastPart, restPart] = raw.split(',', 2);
    const last_name = lastPart.trim();
    const tokens = restPart.trim().split(/\s+/).filter(Boolean);
    let suffix = '';
    if (tokens.length > 0 && COMMON_SUFFIXES.includes(tokens[tokens.length - 1].toUpperCase())) {
      suffix = tokens.pop() || '';
    }
    const first_name = tokens[0] || '';
    const middle_name = tokens.slice(1).join(' ');
    return { first_name, middle_name, last_name, suffix };
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  let suffix = '';
  if (tokens.length > 1 && COMMON_SUFFIXES.includes(tokens[tokens.length - 1].toUpperCase())) {
    suffix = tokens.pop() || '';
  }

  if (tokens.length === 1) {
    return { first_name: tokens[0], middle_name: '', last_name: '', suffix };
  }
  if (tokens.length === 2) {
    return { first_name: tokens[0], middle_name: '', last_name: tokens[1], suffix };
  }
  // 3 or more: e.g. "Juan Santos Dela Cruz" -> first "Juan", middle "Santos", last "Dela Cruz"
  return {
    first_name: tokens[0],
    middle_name: tokens[1],
    last_name: tokens.slice(2).join(' '),
    suffix,
  };
}

export interface SavedVaultFile {
  id: string;
  name: string;
  document_type: string;
  service_code: string;
  size_label: string;
  mime_type: string;
  preview_url?: string;
  uploaded_at: string;
  status: 'counter_ready' | 'issues_found' | 'uninspected' | 'inspecting';
  issue_summary?: string;
  discrepancy_what?: string;
  discrepancy_how_to_fix?: string;
  extracted_name?: string;
  extracted_dob?: string;
  expiry_date?: string;
}

export interface InspectionIssue {
  id: string;
  category: 'expired' | 'mismatch' | 'missing' | 'valid';
  severity: 'critical' | 'warning' | 'ok';
  title: string;
  detail: string;
  remediation?: string;
  how_to_fix?: string;
  field_key?: string;
  charter_rule: string;
  source_id: string;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  expected?: string;
  status: 'valid' | 'expired' | 'mismatch' | 'missing';
  note?: string;
}

export interface InspectionReport {
  id: string;
  document_title: string;
  file_name: string;
  service_code: string;
  service_name: string;
  applicant_name: string;
  inspected_at: string;
  overall_status: 'counter_ready' | 'issues_found';
  summary_counts: {
    expired: number;
    mismatch: number;
    missing: number;
    valid: number;
  };
  preview_lines: string[];
  issues: InspectionIssue[];
  fields: ExtractedField[];
  source_id: string;
}

export interface ChecklistRequirementItem {
  id: string;
  service_code: string;
  name: string;
  description: string;
  required: boolean;
  isPrimaryId?: boolean;
  appliesTo?: string;
  status: 'pending' | 'verified' | 'issue' | 'skipped';
  issue_note?: string;
}

export interface CharterSourceDoc {
  id: string;
  agency: string;
  title: string;
  recorded_at: string;
  rows: { label: string; value: string; cited?: boolean }[];
}

export const CHARTER_SOURCES: Record<string, CharterSourceDoc> = {
  'src-nbi-2025': {
    id: 'src-nbi-2025',
    agency: 'NATIONAL BUREAU OF INVESTIGATION (NBI)',
    title: "Citizen's Charter 2025 · Clearance Processing & RA 11261",
    recorded_at: '2025-01-15',
    rows: [
      {
        label: 'Primary ID Rule',
        value: '2 original unexpired government-issued Primary IDs with clear photo & signature.',
        cited: true,
      },
      {
        label: 'Expired ID Policy',
        value: 'Expired Postal, Passport, or Driver’s License IDs are strictly rejected at the counter.',
        cited: true,
      },
      {
        label: 'Data Consistency',
        value:
          'Full Name and Date of Birth on IDs must match PSA Birth Certificate to avoid HIT / re-encoding.',
        cited: true,
      },
      {
        label: 'RA 11261 (First-Time Jobseeker)',
        value:
          'Original Barangay Certification (valid within 90 days of issue) with Official Dry Seal + signed Oath of Undertaking.',
        cited: true,
      },
      {
        label: 'Processing Fee',
        value: 'PHP 130.00 + PHP 25.00 e-payment fee (FREE / PHP 0.00 for RA 11261 Jobseekers).',
      },
    ],
  },
  'src-psa-2025': {
    id: 'src-psa-2025',
    agency: 'PHILIPPINE STATISTICS AUTHORITY (PSA)',
    title: "Citizen's Charter 2025 · Civil Registry SECPA Issuance",
    recorded_at: '2025-02-01',
    rows: [
      {
        label: 'Primary Requirement',
        value: '1 original unexpired Primary Government ID matching the name on the record.',
        cited: true,
      },
      {
        label: 'Married Female Applicants',
        value:
          'If ID shows maiden surname but requesting under married name (or vice versa), bring PSA Marriage Certificate.',
        cited: true,
      },
      {
        label: 'Authorized Representative',
        value:
          'Signed Authorization Letter / SPA + Original ID of Document Owner + Original ID of Representative (RA 10173).',
      },
      {
        label: 'Processing Fee',
        value: 'PHP 155.00 per copy at CRS Outlet (Walk-in with Online Appointment).',
      },
    ],
  },
  'src-philhealth-2025': {
    id: 'src-philhealth-2025',
    agency: 'PHILIPPINE HEALTH INSURANCE CORPORATION (PHILHEALTH)',
    title: "Citizen's Charter 2025 · Member Registration & PMRF/MDR",
    recorded_at: '2025-01-20',
    rows: [
      {
        label: 'Registration Form',
        value: '2 duly accomplished and signed copies of PhilHealth Member Registration Form (PMRF).',
        cited: true,
      },
      {
        label: 'Supporting Identity Doc',
        value: '1 Valid Primary ID or PSA Birth Certificate (plus PSA Marriage Contract if married).',
        cited: true,
      },
      {
        label: 'Single PIN Rule',
        value: 'Only 1 lifetime PhilHealth Identification Number (PIN) is allowed per citizen.',
      },
      {
        label: 'Registration Fee',
        value: 'FREE (PHP 0.00) at all Local Health Insurance Offices (LHIO) and Express Counters.',
      },
    ],
  },
  'src-psa-helpline-2025': {
    id: 'src-psa-helpline-2025',
    agency: 'PSAHELPLINE.PH (PHILIPPINE STATISTICS AUTHORITY AUTHORIZED DELIVERY)',
    title: "Citizen's Charter 2025 · Online Civil Registry Ordering & Nationwide Doorstep Delivery",
    recorded_at: '2025-02-15',
    rows: [
      {
        label: 'Online Ordering Portal',
        value: 'Official 24/7 online ordering at https://psahelpline.ph with status check at https://orders.psahelpline.ph/check-status',
        cited: true,
      },
      {
        label: 'Document Types Available',
        value: 'PSA Birth Certificate, Marriage Certificate, Death Certificate (₱365/copy) and CENOMAR (₱420/copy).',
        cited: true,
      },
      {
        label: 'Delivery SLAs',
        value: 'Metro Manila: 1–3 working days. Provincial addresses nationwide: 3–8 working days door-to-door.',
        cited: true,
      },
      {
        label: 'Authorized Recipients Rule',
        value: 'Document Owner (18+), Parent, Spouse, or Child. Must present 1 original valid government-issued photo ID upon courier delivery.',
        cited: true,
      },
      {
        label: 'Representative Receiving (LOA)',
        value: 'If receiving on behalf, complete online Letter of Authorization (LOA) + Representative original ID + Owner ID photocopy.',
        cited: true,
      },
      {
        label: 'Helpline Contact',
        value: 'Support Hotline: (02) 8737-1111 · Email: help@psahelpline.ph',
      },
    ],
  },
};
