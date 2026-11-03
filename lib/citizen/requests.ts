/**
 * GovGuide PH — Citizen Service Requests & Agency Workflow Store
 *
 * Powers both the Citizen "My Details" Status Bar and the Agency Chrome Extension:
 * - Citizens view multi-step status bars for government service requests (DFA, DPWH, PSA, PhilHealth).
 * - Agency officers (via Chrome Extension or Admin Dashboard) have permission to inspect user requests
 *   and edit the status bar, milestones, and officer notes.
 *
 * Compliant with RA 10173 (Data Privacy Act of 2012).
 */

export type RequestStatus =
  | 'submitted'
  | 'under_review'
  | 'biometrics_or_inspection'
  | 'processing_production'
  | 'ready_released'
  | 'action_required'
  | 'rejected';

/**
 * Simplified agency-facing status bar (Chrome Extension Agency side).
 */
export type ProcessStatus = 'on_process' | 'missing_details' | 'complete';

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  on_process: 'On Process',
  missing_details: 'Missing Details',
  complete: 'Complete',
};

export interface RequestNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface RequestStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  completed: boolean;
  isCurrent: boolean;
  timestamp?: string;
  completedAt?: string;
}

export interface CitizenServiceRequest {
  id: string; // e.g., 'REQ-DFA-2026-8921'
  referenceNumber: string;
  citizenId: string;
  citizenName: string;
  citizenEmail?: string;
  citizenPhone?: string;
  agencyCode: 'DFA' | 'DPWH' | 'PSA' | 'PHILHEALTH' | 'NBI';
  agencyName: string;
  serviceCode: string;
  serviceTitle: string;
  serviceType: string;
  currentStep: number; // 1 to 5
  totalSteps: number; // 5
  status: RequestStatus;
  statusLabel: string;
  processStatus: ProcessStatus;
  statusBadgeColor: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'slate';
  notes: RequestNote[];
  officerName: string;
  officerRole: string;
  officerNotes: string;
  actionRequiredNotice?: string;
  appointmentSchedule?: string;
  location: string;
  submittedAt: string;
  updatedAt: string;
  steps: RequestStep[];
}

// Initial demo requests for Juan Santos Dela Cruz
const INITIAL_REQUESTS: CitizenServiceRequest[] = [
  {
    id: 'REQ-DFA-2026-8921',
    referenceNumber: 'DFA-ASEANA-2026-98124',
    citizenId: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    citizenName: 'Juan Santos Dela Cruz',
    citizenEmail: 'juan.delacruz@govguide.ph',
    citizenPhone: '+63 917 555 0192',
    agencyCode: 'DFA',
    agencyName: 'Department of Foreign Affairs',
    serviceCode: 'DFA_PASSPORT',
    serviceTitle: 'ePassport Regular Renewal (10-Year Validity)',
    serviceType: 'Consular Services · Passport Division',
    currentStep: 3,
    totalSteps: 5,
    status: 'biometrics_or_inspection',
    statusLabel: 'On Process',
    processStatus: 'on_process',
    statusBadgeColor: 'slate',
    notes: [],
    officerName: 'Consular Officer Maria Teresa Gomez',
    officerRole: 'DFA Consular Office Special Processing Officer',
    officerNotes: '',
    location: 'DFA Aseana, Bradco Ave., Parañaque City, Metro Manila',
    submittedAt: '2026-11-03T08:15:00Z',
    updatedAt: '2026-11-03T14:20:00Z',
    steps: [
      {
        stepNumber: 1,
        title: 'Application Submitted',
        subtitle: 'Online pre-flight form & AI document check completed',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 24, 2026 · 08:15 AM',
      },
      {
        stepNumber: 2,
        title: 'Counter Eligibility Review',
        subtitle: 'Consular evaluation & fee payment verified (₱950 Regular)',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 26, 2026 · 11:40 AM',
      },
      {
        stepNumber: 3,
        title: 'Biometrics & Photo Capture',
        subtitle: 'In-person appearance at DFA Aseana Consular Site',
        completed: false,
        isCurrent: true,
        timestamp: 'Scheduled: Nov 3, 2026 · 09:30 AM',
      },
      {
        stepNumber: 4,
        title: 'Passport Booklet Production',
        subtitle: 'Secure laser engraving & chip encoding at APO Printing Plant',
        completed: false,
        isCurrent: false,
      },
      {
        stepNumber: 5,
        title: 'Ready for Release / Doorstep Delivery',
        subtitle: 'Claim at releasing window or LBC Express courier dispatch',
        completed: false,
        isCurrent: false,
      },
    ],
  },
  {
    id: 'REQ-DPWH-2026-4412',
    referenceNumber: 'DPWH-NCR-QC-2026-0814',
    citizenId: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    citizenName: 'Juan Santos Dela Cruz',
    citizenEmail: 'juan.delacruz@govguide.ph',
    citizenPhone: '+63 917 555 0192',
    agencyCode: 'DPWH',
    agencyName: 'Department of Public Works and Highways',
    serviceCode: 'DPWH_PROJECTS',
    serviceTitle: 'Road Defect & Drainage Hazard Redress Report',
    serviceType: 'District Infrastructure Maintenance · Citizen Watch',
    currentStep: 2,
    totalSteps: 5,
    status: 'under_review',
    statusLabel: 'District Engineering Technical Evaluation',
    processStatus: 'on_process',
    statusBadgeColor: 'slate',
    notes: [],
    officerName: 'Engr. Roberto D. Morales, PE',
    officerRole: 'DPWH QC 1st District Engineering Office',
    officerNotes:
      'Citizen geotagged photo verified along Commonwealth Ave. junction. Maintenance crew assigned for site pavement inspection and drainage declogging under Work Order #QC-2026-M49.',
    location: 'Commonwealth Ave. / Tandang Sora Flyover, Quezon City',
    submittedAt: '2026-11-03T10:00:00Z',
    updatedAt: '2026-11-03T09:15:00Z',
    steps: [
      {
        stepNumber: 1,
        title: 'Hazard Report Logged',
        subtitle: 'Geotagged report & photos received via citizen portal',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 27, 2026 · 10:00 AM',
      },
      {
        stepNumber: 2,
        title: 'District Site Evaluation',
        subtitle: 'Field engineer inspection & structural classification',
        completed: false,
        isCurrent: true,
        timestamp: 'In Progress · Assigned to QC 1st DEO',
      },
      {
        stepNumber: 3,
        title: 'Work Order & Contractor Mobilization',
        subtitle: 'Issuance of repair order & traffic coordination with MMDA',
        completed: false,
        isCurrent: false,
      },
      {
        stepNumber: 4,
        title: 'Civil Works Repair & Asphalting',
        subtitle: 'On-site execution, concrete curing & asphalt overlay',
        completed: false,
        isCurrent: false,
      },
      {
        stepNumber: 5,
        title: 'Quality Audit & Completion Sign-Off',
        subtitle: 'Final inspection sign-off and public resolution report posted',
        completed: false,
        isCurrent: false,
      },
    ],
  },
  {
    id: 'REQ-PSA-2026-7731',
    referenceNumber: 'PSA-CRS-2026-302194',
    citizenId: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    citizenName: 'Juan Santos Dela Cruz',
    citizenEmail: 'juan.delacruz@govguide.ph',
    citizenPhone: '+63 917 555 0192',
    agencyCode: 'PSA',
    agencyName: 'Philippine Statistics Authority',
    serviceCode: 'PSA_BIRTH_CERT',
    serviceTitle: 'PSA Birth Certificate (SECPA Copy Nationwide Delivery)',
    serviceType: 'Civil Registration Services · PSAHelpline.ph',
    currentStep: 4,
    totalSteps: 5,
    status: 'processing_production',
    statusLabel: 'Printed on SECPA & Handed to Courier',
    processStatus: 'on_process',
    statusBadgeColor: 'slate',
    notes: [],
    officerName: 'Supervisor Corazon C. Bautista',
    officerRole: 'PSA Central Civil Registry Database Verification Officer',
    officerNotes:
      'Verified with Civil Registry Book entry #1999-0514-QC. Official Security Paper (SECPA) printed with holographic seal. Handed to 2GO courier. Airway Bill: 2GO-PH-889104820.',
    location: 'Delivery to: Brgy. San Isidro, Quezon City',
    submittedAt: '2026-11-03T07:30:00Z',
    updatedAt: '2026-11-03T08:00:00Z',
    steps: [
      {
        stepNumber: 1,
        title: 'Online Order & Payment',
        subtitle: 'Paid ₱365 via GCash; order submitted to PSAHelpline',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 22, 2026 · 07:30 AM',
      },
      {
        stepNumber: 2,
        title: 'Database Cross-Verification',
        subtitle: 'Matched against PSA National Civil Registry Archive',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 23, 2026 · 02:15 PM',
      },
      {
        stepNumber: 3,
        title: 'SECPA Security Printing',
        subtitle: 'Printed on high-security colored barcode paper with seal',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 25, 2026 · 10:00 AM',
      },
      {
        stepNumber: 4,
        title: 'Courier In-Transit (2GO Express)',
        subtitle: 'Dispatched for doorstep delivery to Quezon City address',
        completed: false,
        isCurrent: true,
        timestamp: 'Tracking: 2GO-PH-889104820',
      },
      {
        stepNumber: 5,
        title: 'Delivered & Received',
        subtitle: 'Recipient presents 1 valid ID and signs delivery acknowledgement',
        completed: false,
        isCurrent: false,
      },
    ],
  },
  {
    id: 'REQ-PHILHEALTH-2026-8801',
    referenceNumber: 'PHILHEALTH-NCR-2026-1184',
    citizenId: '967760de-3912-5aaf-8ce9-48b2a8dd55f0',
    citizenName: 'Juan Santos Dela Cruz',
    citizenEmail: 'juan.delacruz@govguide.ph',
    citizenPhone: '+63 917 555 0192',
    agencyCode: 'PHILHEALTH',
    agencyName: 'Philippine Health Insurance Corporation',
    serviceCode: 'PHILHEALTH_REGISTRATION',
    serviceTitle: 'PhilHealth Member Registration & PIN/MDR Application',
    serviceType: 'Social Health Insurance · LHIO Express',
    currentStep: 2,
    totalSteps: 5,
    status: 'under_review',
    statusLabel: 'On Process',
    processStatus: 'on_process',
    statusBadgeColor: 'blue',
    notes: [],
    officerName: 'LHIO Officer Rodrigo M. Alcantara',
    officerRole: 'PhilHealth LHIO Evaluation Officer',
    officerNotes:
      'Duly accomplished PMRF received and recorded. Member static verification in progress.',
    location: 'PhilHealth Express — Ali Mall, Cubao, Quezon City',
    submittedAt: '2026-11-03T09:00:00Z',
    updatedAt: '2026-11-03T11:15:00Z',
    steps: [
      {
        stepNumber: 1,
        title: 'PMRF Form Submission',
        subtitle: 'Online pre-evaluation & PMRF draft submitted',
        completed: true,
        isCurrent: false,
        timestamp: 'Oct 28, 2026 · 09:00 AM',
      },
      {
        stepNumber: 2,
        title: 'Eligibility & Identity Check',
        subtitle: 'Deduplication check against National Health Database',
        completed: false,
        isCurrent: true,
        timestamp: 'Oct 30, 2026 · 11:15 AM',
      },
      {
        stepNumber: 3,
        title: 'PIN Generation / Reactivation',
        subtitle: 'Official assignment of lifetime 12-digit PhilHealth PIN',
        completed: false,
        isCurrent: false,
      },
      {
        stepNumber: 4,
        title: 'Member Data Record (MDR) Issuance',
        subtitle: 'Digital generation and stamping of official MDR certificate',
        completed: false,
        isCurrent: false,
      },
      {
        stepNumber: 5,
        title: 'Complete / Member ID Card Ready',
        subtitle: 'Digital card available; claim physical PVC card if requested',
        completed: false,
        isCurrent: false,
      },
    ],
  },
];

// In-memory active store. Starts empty for citizens per UX requirements.
// Demo requests only populate if resetRequestsToDemo() is explicitly triggered.
let activeRequests: CitizenServiceRequest[] = [];

/**
 * Returns all active citizen requests, strictly filtered by citizenId if supplied.
 */
export function getCitizenRequests(citizenId?: string): CitizenServiceRequest[] {
  if (!citizenId) return activeRequests;
  return activeRequests.filter((r) => r.citizenId === citizenId);
}

/**
 * Creates or retrieves an active process for a citizen when they inquire in the chat.
 * Supported agencies/services: PSA, DFA, NBI, PhilHealth, DPWH.
 */
export function createOrGetRequestForInquiry(params: {
  citizenId: string;
  citizenName?: string;
  citizenEmail?: string;
  citizenPhone?: string;
  queryText: string;
  serviceCode?: string;
}): CitizenServiceRequest | null {
  const { citizenId, queryText, serviceCode } = params;
  if (!citizenId || !queryText) return null;

  const lower = queryText.toLowerCase();

  // Detect which agency / service is being inquired about
  const isPsa =
    serviceCode?.startsWith('PSA') ||
    /\b(psa|birth\s*cert|kapanganakan|marriage\s*cert|kasal|cenomar|singleness|death\s*cert|secpa|psahelpline|psaserbilis|serbilis)\b/i.test(lower);

  const isDfa =
    serviceCode === 'DFA_PASSPORT' ||
    /\b(dfa|passport|epassport|consular|aseana)\b/i.test(lower);

  const isNbi =
    serviceCode === 'NBI_CLEARANCE' ||
    /\b(nbi|clearance|hit|fingerprint)\b/i.test(lower);

  const isPhilhealth =
    serviceCode === 'PHILHEALTH_REGISTRATION' ||
    /\b(philhealth|pmrf|mdr|pin|member)\b/i.test(lower);

  const isDpwh =
    serviceCode === 'DPWH_PROJECTS' ||
    /\b(dpwh|infrastructure|kalsada|tulay|highway|contract|pothole|drainage|flood)\b/i.test(lower);

  if (!isPsa && !isDfa && !isNbi && !isPhilhealth && !isDpwh) {
    return null;
  }

  // Deduplication check: if citizen already has a process for this agency / service, return existing
  const targetAgency: 'PSA' | 'DFA' | 'NBI' | 'PHILHEALTH' | 'DPWH' =
    isPsa ? 'PSA' : isDfa ? 'DFA' : isNbi ? 'NBI' : isPhilhealth ? 'PHILHEALTH' : 'DPWH';

  const existing = activeRequests.find(
    (r) => r.citizenId === citizenId && (r.agencyCode === targetAgency || (serviceCode && r.serviceCode === serviceCode))
  );
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const dateFormatted = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const citizenName = params.citizenName || 'Citizen Applicant';
  const citizenEmail = params.citizenEmail || undefined;
  const citizenPhone = params.citizenPhone || undefined;

  let newReq: CitizenServiceRequest;

  if (isPsa) {
    const isMarriage = /\b(marriage|kasal)\b/i.test(lower);
    const isCenomar = /\b(cenomar|singleness)\b/i.test(lower);
    const sCode = isMarriage ? 'PSA_MARRIAGE_CERT' : isCenomar ? 'PSA_CENOMAR' : 'PSA_BIRTH_CERT';
    const sTitle = isMarriage
      ? 'PSA Marriage Certificate (SECPA Copy Nationwide Delivery)'
      : isCenomar
        ? 'PSA CENOMAR (Certificate of No Marriage Record)'
        : 'PSA Birth Certificate (SECPA Copy Nationwide Delivery)';
    const randRef = Math.floor(100000 + Math.random() * 900000);
    const randId = Math.floor(1000 + Math.random() * 9000);

    newReq = {
      id: `REQ-PSA-2026-${randId}`,
      referenceNumber: `PSA-CRS-2026-${randRef}`,
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      agencyCode: 'PSA',
      agencyName: 'Philippine Statistics Authority',
      serviceCode: sCode,
      serviceTitle: sTitle,
      serviceType: 'Civil Registration Services · PSA Serbilis & Helpline',
      currentStep: 2,
      totalSteps: 5,
      status: 'under_review',
      statusLabel: 'On Process',
      processStatus: 'on_process',
      statusBadgeColor: 'blue',
      notes: [],
      officerName: 'Supervisor Corazon C. Bautista',
      officerRole: 'PSA Central Civil Registry Verification Officer',
      officerNotes: 'Application registered from chat inquiry. Preparing civil registry archive verification.',
      location: 'Doorstep Courier Delivery / PSA CRS Outlet',
      submittedAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          stepNumber: 1,
          title: 'Online Application & Inquiry',
          subtitle: 'Inquiry and requirements initiated via GovGuide PH chat',
          completed: true,
          isCurrent: false,
          timestamp: dateFormatted,
        },
        {
          stepNumber: 2,
          title: 'Database Cross-Verification',
          subtitle: 'Verification against PSA National Civil Registry Archive',
          completed: false,
          isCurrent: true,
          timestamp: 'In Progress',
        },
        {
          stepNumber: 3,
          title: 'SECPA Security Printing',
          subtitle: 'Printed on official Security Paper (SECPA) with holographic seal',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 4,
          title: 'Courier In-Transit / Outlet Pick-up',
          subtitle: 'Dispatched for doorstep courier delivery or ready at CRS outlet',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 5,
          title: 'Delivered & Received',
          subtitle: 'Recipient presents 1 valid photo ID and signs delivery receipt',
          completed: false,
          isCurrent: false,
        },
      ],
    };
  } else if (isDfa) {
    const randRef = Math.floor(10000 + Math.random() * 90000);
    const randId = Math.floor(1000 + Math.random() * 9000);

    newReq = {
      id: `REQ-DFA-2026-${randId}`,
      referenceNumber: `DFA-ASEANA-2026-${randRef}`,
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      agencyCode: 'DFA',
      agencyName: 'Department of Foreign Affairs',
      serviceCode: 'DFA_PASSPORT',
      serviceTitle: 'ePassport Regular Renewal (10-Year Validity)',
      serviceType: 'Consular Services · Passport Division',
      currentStep: 2,
      totalSteps: 5,
      status: 'under_review',
      statusLabel: 'On Process',
      processStatus: 'on_process',
      statusBadgeColor: 'blue',
      notes: [],
      officerName: 'Consular Officer Maria Teresa Gomez',
      officerRole: 'DFA Consular Office Processing Officer',
      officerNotes: 'Passport inquiry initiated from chat. Document pre-flight in progress.',
      location: 'DFA Consular Office',
      submittedAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          stepNumber: 1,
          title: 'Application & Pre-flight Initiated',
          subtitle: 'Online pre-flight checklist and requirements reviewed',
          completed: true,
          isCurrent: false,
          timestamp: dateFormatted,
        },
        {
          stepNumber: 2,
          title: 'Counter Eligibility Review',
          subtitle: 'Consular evaluation & appointment slot preparation',
          completed: false,
          isCurrent: true,
          timestamp: 'In Progress',
        },
        {
          stepNumber: 3,
          title: 'Biometrics & Photo Capture',
          subtitle: 'Personal appearance at DFA Consular Site',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 4,
          title: 'Passport Booklet Production',
          subtitle: 'Laser engraving & chip encoding at APO Printing Plant',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 5,
          title: 'Ready for Release / Doorstep Delivery',
          subtitle: 'Claim at releasing window or courier dispatch',
          completed: false,
          isCurrent: false,
        },
      ],
    };
  } else if (isNbi) {
    const randRef = Math.floor(100000 + Math.random() * 900000);
    const randId = Math.floor(1000 + Math.random() * 9000);

    newReq = {
      id: `REQ-NBI-2026-${randId}`,
      referenceNumber: `NBI-CLEAR-2026-${randRef}`,
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      agencyCode: 'NBI',
      agencyName: 'National Bureau of Investigation',
      serviceCode: 'NBI_CLEARANCE',
      serviceTitle: 'NBI Clearance (Online Application & Renewal)',
      serviceType: 'Identification & Clearance Services',
      currentStep: 2,
      totalSteps: 5,
      status: 'under_review',
      statusLabel: 'On Process',
      processStatus: 'on_process',
      statusBadgeColor: 'blue',
      notes: [],
      officerName: 'Clearance Officer Antonio R. Reyes',
      officerRole: 'NBI Verification & Biometrics Officer',
      officerNotes: 'Application initiated from chat inquiry. Clearance pre-evaluation ongoing.',
      location: 'NBI Clearance Center / Branch',
      submittedAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          stepNumber: 1,
          title: 'Online Application & Registration',
          subtitle: 'Applicant profile logged and reference code generated',
          completed: true,
          isCurrent: false,
          timestamp: dateFormatted,
        },
        {
          stepNumber: 2,
          title: 'Fee Payment & Scheduling',
          subtitle: 'Payment verification and branch appointment allocation',
          completed: false,
          isCurrent: true,
          timestamp: 'In Progress',
        },
        {
          stepNumber: 3,
          title: 'Biometrics & Fingerprint Capture',
          subtitle: '10-finger biometric capture and photo encoding',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 4,
          title: 'HIT Verification & Clearance Printing',
          subtitle: 'Name matching cross-check and certificate printing',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 5,
          title: 'Clearance Released / Courier Delivery',
          subtitle: 'Issued to applicant or dispatched via courier delivery',
          completed: false,
          isCurrent: false,
        },
      ],
    };
  } else if (isPhilhealth) {
    const randRef = Math.floor(1000 + Math.random() * 9000);
    const randId = Math.floor(1000 + Math.random() * 9000);

    newReq = {
      id: `REQ-PHILHEALTH-2026-${randId}`,
      referenceNumber: `PHILHEALTH-NCR-2026-${randRef}`,
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      agencyCode: 'PHILHEALTH',
      agencyName: 'Philippine Health Insurance Corporation',
      serviceCode: 'PHILHEALTH_REGISTRATION',
      serviceTitle: 'PhilHealth Member Registration & PIN/MDR Application',
      serviceType: 'Social Health Insurance · LHIO Express',
      currentStep: 2,
      totalSteps: 5,
      status: 'under_review',
      statusLabel: 'On Process',
      processStatus: 'on_process',
      statusBadgeColor: 'blue',
      notes: [],
      officerName: 'LHIO Officer Rodrigo M. Alcantara',
      officerRole: 'PhilHealth LHIO Evaluation Officer',
      officerNotes: 'PMRF registration inquiry logged from chat. Member deduplication check queued.',
      location: 'PhilHealth Express / Local Health Insurance Office (LHIO)',
      submittedAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          stepNumber: 1,
          title: 'PMRF Form Submission',
          subtitle: 'Online pre-evaluation & PMRF draft submitted',
          completed: true,
          isCurrent: false,
          timestamp: dateFormatted,
        },
        {
          stepNumber: 2,
          title: 'Eligibility & Identity Check',
          subtitle: 'Deduplication check against National Health Database',
          completed: false,
          isCurrent: true,
          timestamp: 'In Progress',
        },
        {
          stepNumber: 3,
          title: 'PIN Generation / Reactivation',
          subtitle: 'Official assignment of lifetime 12-digit PhilHealth PIN',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 4,
          title: 'Member Data Record (MDR) Issuance',
          subtitle: 'Digital generation and stamping of official MDR certificate',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 5,
          title: 'Complete / Member ID Card Ready',
          subtitle: 'Digital card available; claim physical PVC card if requested',
          completed: false,
          isCurrent: false,
        },
      ],
    };
  } else {
    // DPWH
    const randRef = Math.floor(1000 + Math.random() * 9000);
    const randId = Math.floor(1000 + Math.random() * 9000);

    newReq = {
      id: `REQ-DPWH-2026-${randId}`,
      referenceNumber: `DPWH-NCR-QC-2026-${randRef}`,
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      agencyCode: 'DPWH',
      agencyName: 'Department of Public Works and Highways',
      serviceCode: 'DPWH_PROJECTS',
      serviceTitle: 'Road Defect & Drainage Hazard Redress Report',
      serviceType: 'District Infrastructure Maintenance · Citizen Watch',
      currentStep: 2,
      totalSteps: 5,
      status: 'under_review',
      statusLabel: 'On Process',
      processStatus: 'on_process',
      statusBadgeColor: 'blue',
      notes: [],
      officerName: 'Engr. Roberto D. Morales, PE',
      officerRole: 'DPWH QC 1st District Engineering Office',
      officerNotes: 'Citizen report logged from chat inquiry. Scheduled for field evaluation.',
      location: 'DPWH District Engineering Office',
      submittedAt: nowIso,
      updatedAt: nowIso,
      steps: [
        {
          stepNumber: 1,
          title: 'Hazard Report Logged',
          subtitle: 'Report details received via citizen chat',
          completed: true,
          isCurrent: false,
          timestamp: dateFormatted,
        },
        {
          stepNumber: 2,
          title: 'District Site Evaluation',
          subtitle: 'Field engineer inspection & classification',
          completed: false,
          isCurrent: true,
          timestamp: 'In Progress',
        },
        {
          stepNumber: 3,
          title: 'Work Order & Contractor Mobilization',
          subtitle: 'Issuance of repair order & coordination',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 4,
          title: 'Civil Works Repair',
          subtitle: 'On-site execution and repairs',
          completed: false,
          isCurrent: false,
        },
        {
          stepNumber: 5,
          title: 'Quality Audit & Completion Sign-Off',
          subtitle: 'Final inspection sign-off and resolution',
          completed: false,
          isCurrent: false,
        },
      ],
    };
  }

  activeRequests.unshift(newReq);
  return newReq;
}

/**
 * Returns requests for an agency (e.g., DFA, DPWH, PSA), used by Chrome Extension & Agency Dashboard
 */
export function getAgencyRequests(agencyCode?: string): CitizenServiceRequest[] {
  if (!agencyCode || agencyCode.toUpperCase() === 'ALL') {
    return activeRequests;
  }
  return activeRequests.filter((r) => r.agencyCode === agencyCode.toUpperCase());
}

/**
 * Agency search (Chrome Extension search bar): matches request ID, reference number,
 * citizen name/email/phone, and service title within the officer's agency scope.
 */
export function searchAgencyRequests(agencyCode: string | undefined, query?: string): CitizenServiceRequest[] {
  const scoped = getAgencyRequests(agencyCode);
  const q = (query || '').trim().toLowerCase();
  if (!q) return scoped;
  const terms = q.split(/\s+/).filter(Boolean);
  return scoped.filter((r) => {
    const haystack = [
      r.id,
      r.referenceNumber,
      r.citizenName,
      r.citizenEmail,
      r.citizenPhone,
      r.serviceTitle,
      r.agencyCode,
      PROCESS_STATUS_LABELS[r.processStatus],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/**
 * Agency / Chrome Extension: appends an officer note to a request.
 * The latest note is mirrored to `officerNotes` so citizen-facing views stay in sync.
 */
export function addRequestNote(
  requestId: string,
  text: string,
  author: string
): CitizenServiceRequest | null {
  const req = activeRequests.find((r) => r.id === requestId);
  if (!req) return null;
  const clean = text.trim();
  if (!clean) return { ...req };

  const nowIso = new Date().toISOString();
  const note: RequestNote = {
    id: `NOTE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    author: author || 'Agency Officer',
    createdAt: nowIso,
  };
  req.notes = [...(req.notes || []), note];
  req.officerNotes = clean;
  req.updatedAt = nowIso;
  return { ...req };
}

/**
 * Finds a single request by ID or Reference Number
 */
export function findRequestById(idOrRef: string): CitizenServiceRequest | undefined {
  return activeRequests.find(
    (r) =>
      r.id.toLowerCase() === idOrRef.toLowerCase() ||
      r.referenceNumber.toLowerCase() === idOrRef.toLowerCase()
  );
}

export interface UpdateStatusBarParams {
  requestId: string;
  currentStep?: number;
  processStatus?: ProcessStatus;
  status?: RequestStatus;
  statusLabel?: string;
  statusBadgeColor?: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'slate';
  officerName?: string;
  officerRole?: string;
  officerNotes?: string;
  appointmentSchedule?: string;
  actionRequiredNotice?: string;
  stepTimestamps?: Record<number, string>;
}

/**
 * Agency / Chrome Extension: Updates the status bar of a citizen request
 */
export function updateRequestStatusBar(params: UpdateStatusBarParams): CitizenServiceRequest | null {
  const req = activeRequests.find((r) => r.id === params.requestId);
  if (!req) return null;

  let newStep = Math.max(1, Math.min(req.totalSteps, params.currentStep ?? req.currentStep));

  if (params.status) req.status = params.status;
  if (params.statusLabel) req.statusLabel = params.statusLabel;

  // Simplified agency status bar: On Process / Missing Details / Complete
  if (params.processStatus) {
    req.processStatus = params.processStatus;
    req.statusLabel = params.statusLabel || PROCESS_STATUS_LABELS[params.processStatus];
    if (params.processStatus === 'complete') {
      newStep = req.totalSteps;
      req.status = 'ready_released';
      req.statusBadgeColor = 'emerald';
    } else if (params.processStatus === 'missing_details') {
      req.status = 'action_required';
      req.statusBadgeColor = 'amber';
      if (newStep === req.totalSteps) newStep = req.totalSteps - 1;
    } else {
      if (req.status === 'ready_released' || req.status === 'action_required') {
        req.status = 'processing_production';
      }
      req.statusBadgeColor = 'blue';
      if (newStep === req.totalSteps) newStep = req.totalSteps - 1;
    }
  }

  req.currentStep = newStep;
  if (params.statusBadgeColor) req.statusBadgeColor = params.statusBadgeColor;
  if (params.officerName) req.officerName = params.officerName;
  if (params.officerRole) req.officerRole = params.officerRole;
  if (params.officerNotes !== undefined) req.officerNotes = params.officerNotes;
  if (params.appointmentSchedule !== undefined) req.appointmentSchedule = params.appointmentSchedule;
  if (params.actionRequiredNotice !== undefined) req.actionRequiredNotice = params.actionRequiredNotice;

  const nowIso = new Date().toISOString();
  const dateFormatted = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  req.updatedAt = nowIso;

  // Recalculate step states
  req.steps = req.steps.map((step) => {
    const isPast = step.stepNumber < newStep;
    const isCurrent = step.stepNumber === newStep;
    const isFuture = step.stepNumber > newStep;

    let timestamp = step.timestamp;
    if (params.stepTimestamps && params.stepTimestamps[step.stepNumber]) {
      timestamp = params.stepTimestamps[step.stepNumber];
    } else if (isCurrent && !timestamp) {
      timestamp = `Updated: ${dateFormatted}`;
    }

    return {
      ...step,
      completed: isPast || (newStep === req.totalSteps && step.stepNumber === req.totalSteps && req.status === 'ready_released'),
      isCurrent,
      timestamp,
    };
  });

  return { ...req };
}

/**
 * Reset requests store back to the seeded demo state
 */
export function resetRequestsToDemo(): CitizenServiceRequest[] {
  activeRequests = JSON.parse(JSON.stringify(INITIAL_REQUESTS));
  return activeRequests;
}

/**
 * Clear all requests (empty state for clean citizen accounts)
 */
export function clearAllRequests(): CitizenServiceRequest[] {
  activeRequests = [];
  return activeRequests;
}
