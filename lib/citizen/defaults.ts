import type {
  ApplicantProfile,
  SavedVaultFile,
  ChecklistRequirementItem,
  InspectionReport,
} from '@/lib/services/charter-sources';
import { SERVICES_REGISTRY } from '@/lib/services/registry';

export const PROFILES: Record<'jobseeker' | 'married_applicant' | 'new_citizen', ApplicantProfile> = {
  jobseeker: {
    id: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    role: 'jobseeker',
    display_name: 'Juan Santos Dela Cruz',
    first_name: 'Juan',
    middle_name: 'Santos',
    last_name: 'Dela Cruz',
    suffix: '',
    initials: 'JD',
    title: 'First-Time Jobseeker (RA 11261)',
    birth_date: '1999-05-14',
    civil_status: 'Single',
    gender: 'MALE',
    barangay: 'Brgy. San Isidro',
    city: 'Quezon City',
    province: 'Metro Manila',
    region: 'National Capital Region (NCR)',
    street_address: '1024 General Luna Street',
    residential_address: '1024 General Luna Street, Brgy. San Isidro, Quezon City',
    zip_code: '1100',
    place_of_birth: 'Quezon City, Metro Manila',
    email: 'juan.delacruz@govguide.ph',
    phone: '0917-555-0192',
    contact_number: '09175550192',

    father_name: 'Roberto Mendoza Dela Cruz',
    father_first_name: 'Roberto',
    father_middle_name: 'Mendoza',
    father_last_name: 'Dela Cruz',
    father_suffix: '',

    mother_maiden_name: 'Maria Gomez Santos',
    mother_first_name: 'Maria',
    mother_middle_name: 'Gomez',
    mother_last_name: 'Santos',
    mother_suffix: '',

    philsys_id: '1234-5678-9012-3456',
    philsys_card_number: '1234-5678-9012-3456',
    philhealth_number: '12-345678901-2',
    tin: '123-456-789-000',
    tin_number: '123-456-789-000',
    sss_number: '03-9876543-2',
    pagibig_number: '1210-9876-5432',
    passport_number: 'P8921824B',
  },
  married_applicant: {
    id: 'cc31a4a1-22f4-5dfb-9fe5-52fbd69e3ee1',
    role: 'married_applicant',
    display_name: 'Maria Clara Reyes-Santos',
    first_name: 'Maria Clara',
    middle_name: 'Reyes',
    last_name: 'Santos',
    suffix: '',
    initials: 'MR',
    title: 'Married Applicant · Renewal & Civil Registry',
    birth_date: '1994-11-22',
    civil_status: 'Married',
    gender: 'FEMALE',
    barangay: 'Brgy. Poblacion',
    city: 'Makati City',
    province: 'Metro Manila',
    region: 'National Capital Region (NCR)',
    street_address: '45 Ayala Avenue',
    residential_address: '45 Ayala Avenue, Brgy. Poblacion, Makati City',
    zip_code: '1200',
    place_of_birth: 'Makati City, Metro Manila',
    email: 'maria.santos@govguide.ph',
    phone: '0918-555-0234',
    contact_number: '09185550234',
    maiden_name: 'Maria Clara Reyes',

    father_name: 'Antonio Silang Reyes',
    father_first_name: 'Antonio',
    father_middle_name: 'Silang',
    father_last_name: 'Reyes',
    father_suffix: '',

    mother_maiden_name: 'Leonor Rivera Lopez',
    mother_first_name: 'Leonor',
    mother_middle_name: 'Rivera',
    mother_last_name: 'Lopez',
    mother_suffix: '',

    philsys_id: '8765-4321-0987-6543',
    philsys_card_number: '8765-4321-0987-6543',
    philhealth_number: '23-456789012-3',
    tin: '234-567-890-000',
    tin_number: '234-567-890-000',
    sss_number: '04-8765432-1',
    pagibig_number: '2320-8765-4321',
    passport_number: 'P7412895C',
  },
  new_citizen: {
    id: 'e1000000-0000-4000-8000-000000000003',
    role: 'new_citizen',
    display_name: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    initials: '',
    title: 'Guest Account',
    birth_date: '',
    civil_status: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    street_address: '',
    residential_address: '',
    zip_code: '',
    place_of_birth: '',
    email: '',
    phone: '',
    contact_number: '',
    maiden_name: '',
    father_name: '',
    father_first_name: '',
    father_middle_name: '',
    father_last_name: '',
    father_suffix: '',
    mother_maiden_name: '',
    mother_first_name: '',
    mother_middle_name: '',
    mother_last_name: '',
    mother_suffix: '',
    philsys_id: '',
    philsys_card_number: '',
    philhealth_number: '',
    tin: '',
    tin_number: '',
    sss_number: '',
    pagibig_number: '',
    passport_number: '',
    notes: '',
  },
};

export function createCleanChecklists(): ChecklistRequirementItem[] {
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

export function createInitialChecklists(): ChecklistRequirementItem[] {
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

export function createInitialInspections(): InspectionReport[] {
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
          severity: 'critical',
          title: 'Unsigned Government ID & Single ID Provided',
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

export function createInitialSavedFiles(): SavedVaultFile[] {
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
      issue_summary: '100% Counter-Ready · Matches My Details',
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
      issue_summary: 'Expired (12 Mar 2025) · DOB Mismatch · Unsigned',
      extracted_name: 'Juan Santos Dela Cruz',
      extracted_dob: '1999-08-14',
      expiry_date: '2025-03-12 (Expired)',
    },
    {
      id: 'file-brgy-03',
      name: 'incomplete-brgy-cert.png',
      document_type: 'Barangay Certification (First-Time Jobseeker)',
      service_code: 'NBI_CLEARANCE',
      size_label: '124 KB',
      mime_type: 'image/png',
      preview_url: '/demo/incomplete-brgy-cert.png',
      uploaded_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
      status: 'issues_found',
      issue_summary: 'Expired (>90 days) · Missing Dry Seal · Unsigned Oath',
      extracted_name: 'Juan Santos Dela Cruz',
      expiry_date: '90-Day Validity Expired',
    },
  ];
}
