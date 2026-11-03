/**
 * GovGuide PH — Agency AI Chatbot & Official Letter Synthesis Engine
 *
 * Converts counter officer keywords and notes into formal, standardized
 * Republic of the Philippines government notice letters compliant with
 * RA 11032 (Anti-Red Tape Act) and Agency Citizen's Charters.
 */

import type { ProcessStatus } from '../types';

export interface GenerateLetterParams {
  keywords: string;
  citizenName: string;
  serviceTitle: string;
  referenceNumber: string;
  agencyCode: string;
  agencyName: string;
  officerName?: string;
  officerRole?: string;
  location?: string;
}

export interface GeneratedLetterResult {
  agency: string;
  date: string;
  subject: string;
  letterText: string;
  paragraphs: string[];
  suggestedStatus: ProcessStatus;
  actionRequiredNotice?: string;
  appointmentSchedule?: string;
}

const AGENCY_LETTERHEADS: Record<string, { title: string; division: string; address: string; hotline: string }> = {
  DFA: {
    title: 'DEPARTMENT OF FOREIGN AFFAIRS',
    division: 'Office of Consular Affairs · Passport Division',
    address: 'Aseana Business Park, Bradco Avenue, Parañaque City, Metro Manila',
    hotline: '(02) 8834-4000 · passport.scheduling@dfa.gov.ph',
  },
  PSA: {
    title: 'PHILIPPINE STATISTICS AUTHORITY',
    division: 'Civil Registration and Central Support Division',
    address: 'PSA Complex, East Avenue, Diliman, Quezon City, Metro Manila',
    hotline: '(02) 8461-0500 · doorstep.delivery@psahelpline.ph',
  },
  NBI: {
    title: 'NATIONAL BUREAU OF INVESTIGATION',
    division: 'Clearance Processing & Records Verification Division',
    address: 'NBI Building, UN Avenue, Ermita, City of Manila',
    hotline: '(02) 8523-8231 · clearance.support@nbi.gov.ph',
  },
  PHILHEALTH: {
    title: 'PHILIPPINE HEALTH INSURANCE CORPORATION',
    division: 'Member Services & Universal Health Care Records Registry',
    address: 'Citystate Centre, 709 Shaw Boulevard, Pasig City',
    hotline: '(02) 8441-7442 · actioncenter@philhealth.gov.ph',
  },
  DPWH: {
    title: 'DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS',
    division: 'District Maintenance & Citizen Watch Infrastructure Redress Office',
    address: 'EDSA, Diliman, Quezon City / Bonifacio Drive, Port Area, Manila',
    hotline: '(02) 5304-3000 · publicworks.transparency@dpwh.gov.ph',
  },
};

/**
 * Extracts date, time, and counter scheduling info from keywords.
 */
function extractSchedule(text: string): string | undefined {
  const dateMatch = text.match(
    /\b(?:on\s+)?(nov(?:ember)?|dec(?:ember)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?/i
  );
  const timeMatch = text.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i);
  const counterMatch = text.match(/\b(?:counter|window|door)\s*#?\s*\d+\b/i);

  const parts: string[] = [];
  if (dateMatch) parts.push(dateMatch[0]);
  if (timeMatch) parts.push(timeMatch[0]);
  if (counterMatch) parts.push(counterMatch[0].toUpperCase());

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Generates an official Philippine Government notice letter from counter keywords.
 */
export function generateOfficialNoticeLetter(params: GenerateLetterParams): GeneratedLetterResult {
  const {
    keywords,
    citizenName,
    serviceTitle,
    referenceNumber,
    agencyCode,
    agencyName,
    officerName = 'Reviewing Consular Officer',
    officerRole = 'Supervising Verification Officer',
    location,
  } = params;

  const rawLower = keywords.toLowerCase();
  const schedule = extractSchedule(keywords);

  // 1. Determine suggested process status
  let suggestedStatus: ProcessStatus = 'on_process';
  if (
    /expired|missing|discrepan|invalid|lacking|re-upload|mismatch|rectif|kulang|hindi tanggap|walang seal|unreadable|blurry/i.test(
      rawLower
    )
  ) {
    suggestedStatus = 'missing_details';
  } else if (
    /approved|complete|ready|releas|dispatch|claim|delivered|delivery|courier|handed to|tapos na|ok na/i.test(
      rawLower
    )
  ) {
    suggestedStatus = 'complete';
  }

  // 2. Resolve Agency Letterhead
  const letterhead = AGENCY_LETTERHEADS[agencyCode.toUpperCase()] || {
    title: agencyName.toUpperCase(),
    division: 'Citizen Services & Processing Counter',
    address: location || 'National Government Portal Center, Philippines',
    hotline: '1-800-GOV-GUIDE · contact@govguide.ph',
  };

  const todayStr = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const subject = `[${agencyCode.toUpperCase()}] Official Notice: ${serviceTitle} (Ref #${referenceNumber})`;

  // 3. Synthesize Specific Action Bullets based on keywords
  const bullets: string[] = [];

  // A. Missing or Expired ID
  if (/expired/i.test(rawLower) && /id|postal|card|license/i.test(rawLower)) {
    bullets.push(
      '• IDENTIFICATION FINDING: Uploaded primary identification is expired. Under the official Citizen’s Charter and RA 11032, counters strictly mandate two (2) unexpired government-issued photo IDs (e.g. PhilSys National ID, Passport, UMID, or Driver’s License).'
    );
  } else if (/missing/i.test(rawLower) && /id|document/i.test(rawLower)) {
    bullets.push(
      '• REQUIRED DOCUMENTATION: Additional primary identification is missing from your docket. Please bring two (2) valid government photo IDs to avoid rejection at the counter.'
    );
  }

  // B. PSA Birth Certificate / Civil Registry
  if (/psa|birth|secpa|civil registry/i.test(rawLower)) {
    if (/unreadable|blurry|malabo/i.test(rawLower)) {
      bullets.push(
        '• PSA RECORD DEFICIENCY: Uploaded copy of PSA Birth Certificate is unreadable or truncated. An authentic Security Paper (SECPA) copy with clear barcode and civil registry book number is required.'
      );
    } else if (/mismatch|discrepancy/i.test(rawLower)) {
      bullets.push(
        '• CIVIL REGISTRY DISCREPANCY: A discrepancy in name or birth date was noted between submitted documents. You may be required to present a Local Civil Registry copy (Form 1A/102) to reconcile records.'
      );
    } else if (suggestedStatus === 'complete' || /printed|handed/i.test(rawLower)) {
      bullets.push(
        '• SECPA ISSUANCE: Official Birth Certificate printed on verified Security Paper (SECPA) with holographic security strip. Handed to courier services for doorstep delivery.'
      );
    }
  }

  // C. Barangay Certificate / First-Time Jobseeker
  if (/barangay|dry seal|oath|jobseeker/i.test(rawLower)) {
    bullets.push(
      '• RA 11261 (FIRST-TIME JOBSEEKER): Barangay Certificate must be issued within the last ninety (90) days and bear an authentic dry seal and signed Oath of Undertaking to waive government fees.'
    );
  }

  // D. Biometrics / In-person schedule
  if (/biometric|appearance|appointment|schedule|counter/i.test(rawLower) || schedule) {
    const venue = schedule ? schedule : location || 'designated consular counter';
    bullets.push(
      `• COUNTER APPOINTMENT & BIOMETRICS: Mandatory physical appearance scheduled at ${venue}. Please bring original copies of all uploaded documents and your confirmed appointment QR slip.`
    );
  }

  // E. Completion & Releasing
  if (suggestedStatus === 'complete' || /ready|courier|dispatch|claim/i.test(rawLower)) {
    bullets.push(
      `• RELEASING DIRECTIVE: Application processing has concluded. Document is ready for release at counter releasing windows or dispatched via official courier service.`
    );
  }

  // F. Fallback bullet for custom keywords
  if (bullets.length === 0) {
    bullets.push(`• OFFICER DIRECTIVE: ${keywords.trim()}`);
  }

  // 4. Construct Letter Paragraphs
  const paragraphs: string[] = [
    `REPUBLIC OF THE PHILIPPINES\n${letterhead.title}\n${letterhead.division}\n${letterhead.address}`,
    `Date: ${todayStr}\nReference Number: ${referenceNumber}\nNotice Control: NOT-${agencyCode.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    `To: ${citizenName}\nSubject: ${subject}`,
    `Dear ${citizenName},`,
    `This is an official communication from the ${agencyName} regarding your application for ${serviceTitle} (Reference Number #${referenceNumber}).`,
    `Upon official counter review and pre-flight evaluation of your submission, please comply with the following directive:`,
    bullets.join('\n\n'),
    `LEGAL CITATION: This directive is issued in strict compliance with Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018) and the Anti-Red Tape Authority (ARTA) Citizen's Charter guidelines.`,
    `NEXT STEPS: Please take prompt action or appear at the designated counter to avoid processing delays or cancellation. You may consult GovGuide AI directly on your portal if you require guidance on completing these requirements.`,
    `Very truly yours,\n\n${officerName}\n${officerRole}\n${agencyName}\nHotline: ${letterhead.hotline}`,
  ];

  const letterText = paragraphs.join('\n\n');

  // Short action required notice for the status card
  let actionRequiredNotice: string | undefined;
  if (suggestedStatus === 'missing_details') {
    actionRequiredNotice = keywords.slice(0, 60).trim();
  }

  return {
    agency: letterhead.title,
    date: todayStr,
    subject,
    letterText,
    paragraphs,
    suggestedStatus,
    actionRequiredNotice,
    appointmentSchedule: schedule,
  };
}
