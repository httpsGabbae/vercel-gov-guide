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
  agencyCode: 'DFA' | 'DPWH' | 'PSA' | 'PHILHEALTH';
  agencyName: string;
  serviceCode: string;
  serviceTitle: string;
  serviceType: string;
  currentStep: number; // 1 to 5
  totalSteps: number; // 5
  status: RequestStatus;
  statusLabel: string;
  statusBadgeColor: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'slate';
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
    statusLabel: 'Biometrics & Photo Capture Scheduled',
    statusBadgeColor: 'slate',
    officerName: 'Consular Officer Maria Teresa Gomez',
    officerRole: 'DFA Consular Office Special Processing Officer',
    officerNotes:
      'Pre-flight document checklist cleared. Appointment confirmed at DFA Aseana, Paranaque. Please bring 2 printed copies of your application form, original PSA Birth Certificate (SECPA), and present Philippine Postal ID / PhilSys at Window 4.',
    appointmentSchedule: 'Monday, Nov 3, 2026 at 09:30 AM (Counter Window 4)',
    location: 'DFA Aseana, Bradco Ave., Parañaque City, Metro Manila',
    submittedAt: '2026-10-24T08:15:00Z',
    updatedAt: '2026-10-29T14:20:00Z',
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
    statusBadgeColor: 'slate',
    officerName: 'Engr. Roberto D. Morales, PE',
    officerRole: 'DPWH QC 1st District Engineering Office',
    officerNotes:
      'Citizen geotagged photo verified along Commonwealth Ave. junction. Maintenance crew assigned for site pavement inspection and drainage declogging under Work Order #QC-2026-M49.',
    location: 'Commonwealth Ave. / Tandang Sora Flyover, Quezon City',
    submittedAt: '2026-10-27T10:00:00Z',
    updatedAt: '2026-10-30T09:15:00Z',
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
    statusBadgeColor: 'slate',
    officerName: 'Supervisor Corazon C. Bautista',
    officerRole: 'PSA Central Civil Registry Database Verification Officer',
    officerNotes:
      'Verified with Civil Registry Book entry #1999-0514-QC. Official Security Paper (SECPA) printed with holographic seal. Handed to 2GO courier. Airway Bill: 2GO-PH-889104820.',
    location: 'Delivery to: Brgy. San Isidro, Quezon City',
    submittedAt: '2026-10-22T07:30:00Z',
    updatedAt: '2026-10-30T08:00:00Z',
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
];

// In-memory active store with fallback to INITIAL_REQUESTS
let activeRequests: CitizenServiceRequest[] = JSON.parse(JSON.stringify(INITIAL_REQUESTS));

/**
 * Returns all active citizen requests, optionally filtered by citizenId
 */
export function getCitizenRequests(citizenId?: string): CitizenServiceRequest[] {
  if (!citizenId) return activeRequests;
  return activeRequests.filter((r) => r.citizenId === citizenId);
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
  currentStep: number;
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

  const newStep = Math.max(1, Math.min(req.totalSteps, params.currentStep));
  req.currentStep = newStep;

  if (params.status) req.status = params.status;
  if (params.statusLabel) req.statusLabel = params.statusLabel;
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
