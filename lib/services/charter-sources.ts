export interface ApplicantProfile {
  id: string;
  role: 'jobseeker' | 'married_applicant';
  display_name: string;
  initials: string;
  title: string;
  birth_date: string;
  civil_status: string;
  barangay: string;
  city: string;
  maiden_name?: string;
}

export interface InspectionIssue {
  id: string;
  category: 'expired' | 'mismatch' | 'missing' | 'valid';
  severity: 'critical' | 'warning' | 'ok';
  title: string;
  detail: string;
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
  status: 'pending' | 'verified' | 'issue';
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
};
