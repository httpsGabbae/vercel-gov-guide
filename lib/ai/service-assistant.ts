/**
 * GovGuidePH — Government Service Assistant & Handler
 * Version 1.0 — Adaptive Government Intelligence (§2 Government Service Assistance)
 *
 * Provides actionable, grounded guidance across PSA, NBI, DFA, LTO, PhilHealth,
 * SSS, Pag-IBIG, BIR, DTI, PRC, DSWD, National ID, and PWD ID.
 *
 * Grounding & Integrity Rules:
 * 1. Strictly grounds to Citizen's Charters and verified registry data.
 * 2. Adapts dynamically to multi-turn conversational context (e.g. for deceased parent,
 *    authorized representative, First-Time Jobseeker RA 11261).
 * 3. Never claims to book appointments, access agency databases, or verify statuses
 *    unless an authorized integration actually exists.
 * 4. Clearly distinguishes manually updated vs official agency-verified statuses.
 * 5. Never fabricates transaction results.
 */

import { getServiceByCode, SERVICES_REGISTRY } from '@/lib/services/registry';
import { searchCharterTool, getServiceRequirementsTool } from './tools';
import { OFFICIAL_CONTACTS } from '@/lib/rag/answer';
import type { CitizenPersonalizationProfile, ActiveConversationContext } from './memory-store';

export interface ServiceResponseResult {
  serviceCode: string;
  agencyName: string;
  serviceTitle: string;
  summary: string;
  actionableSteps: string[];
  requirements: Array<{ name: string; isMandatory: boolean; note?: string }>;
  fees: {
    processingFee: number;
    convenienceFee?: number;
    isWaivableJobseeker?: boolean;
    note?: string;
  };
  verifiedPortalUrl?: string;
  officialHotline?: string;
  officialEmail?: string;
  contextualNotes?: string[];
  suggestedNextSteps: string[];
  formattedMarkdown: string;
}

/**
 * Verified Official Philippine Government Portals
 */
export const VERIFIED_GOV_PORTALS: Record<string, { portalName: string; url: string; trackingSupported: boolean }> = {
  PSA_BIRTH_CERT: {
    portalName: 'PSA Online CRS Appointment / PSAHelpline',
    url: 'https://appointment.psa.gov.ph / https://psahelpline.ph',
    trackingSupported: true,
  },
  PSA_MARRIAGE_CERT: {
    portalName: 'PSA Online CRS Appointment / PSAHelpline',
    url: 'https://appointment.psa.gov.ph',
    trackingSupported: true,
  },
  PSA_CENOMAR: {
    portalName: 'PSA Online CRS Appointment / PSAHelpline',
    url: 'https://appointment.psa.gov.ph',
    trackingSupported: true,
  },
  PSA_DEATH_CERT: {
    portalName: 'PSA Online CRS Appointment / PSAHelpline',
    url: 'https://appointment.psa.gov.ph',
    trackingSupported: true,
  },
  NBI_CLEARANCE: {
    portalName: 'NBI Clearance Online Portal',
    url: 'https://clearance.nbi.gov.ph',
    trackingSupported: true,
  },
  DFA_PASSPORT: {
    portalName: 'DFA Consular Passport Online Appointment System',
    url: 'https://passport.gov.ph',
    trackingSupported: true,
  },
  PHILHEALTH_REGISTRATION: {
    portalName: 'PhilHealth Member Portal',
    url: 'https://memberinquiry.philhealth.gov.ph',
    trackingSupported: false,
  },
  SSS_REGISTRATION: {
    portalName: 'My.SSS Citizen Portal',
    url: 'https://member.sss.gov.ph',
    trackingSupported: true,
  },
  PAGIBIG_MEMBERSHIP: {
    portalName: 'Pag-IBIG Virtual Pag-IBIG Online Services',
    url: 'https://www.pagibigfundservices.com/virtualpagibig',
    trackingSupported: true,
  },
  LTO_STUDENT_PERMIT: {
    portalName: 'LTO Land Transportation Management System (LTMS)',
    url: 'https://portal.lto.gov.ph',
    trackingSupported: true,
  },
  BIR_TIN: {
    portalName: 'BIR Online Registration and Update System (ORUS)',
    url: 'https://orus.bir.gov.ph',
    trackingSupported: true,
  },
  DTI_BUSINESS_NAME: {
    portalName: 'DTI Business Name Registration System (BNRS)',
    url: 'https://bnrs.dti.gov.ph',
    trackingSupported: true,
  },
  PRC_LERIS: {
    portalName: 'PRC Licensure Examination & Registration Information System (LERIS)',
    url: 'https://online.prc.gov.ph',
    trackingSupported: true,
  },
  NATIONAL_ID: {
    portalName: 'PhilSys National ID Online Portal / ePhilID Appointment',
    url: 'https://philsys.gov.ph',
    trackingSupported: true,
  },
};

/**
 * Generates an authoritative, grounded government service guidance response.
 */
export async function generateServiceResponse(
  userQuery: string,
  serviceCode: string,
  profile: CitizenPersonalizationProfile,
  context: ActiveConversationContext,
): Promise<ServiceResponseResult> {
  const service = getServiceByCode(serviceCode);
  const portal = VERIFIED_GOV_PORTALS[serviceCode];
  const agencyPrefix = serviceCode.split('_')[0];
  const contact = OFFICIAL_CONTACTS[agencyPrefix] || OFFICIAL_CONTACTS.ARTA;

  const lang = profile.preferred_language === 'English' ? 'en' : 'fil';
  const isConcise = profile.preferred_response_length === 'concise';

  // Contextual adaptations:
  const isForMother = context.request_for === 'mother';
  const isForFather = context.request_for === 'father';
  const isThirdParty = isForMother || isForFather || context.request_for === 'child' || context.request_for === 'spouse';
  const isDeceased = context.is_deceased === true;
  const isJobseeker = context.is_first_time_jobseeker === true;

  const contextualNotes: string[] = [];

  // Adapt requirements based on multi-turn context:
  const requirements = service?.requirements.map((r) => ({
    name: r.name,
    isMandatory: r.required,
    note: r.description,
  })) || [];

  if (serviceCode.startsWith('PSA_')) {
    if (isDeceased) {
      contextualNotes.push(
        lang === 'fil'
          ? 'Dahil pumanaw na ang may-ari ng rekord, kailangan magpakita ng Registered Death Certificate ng yumao bilang patunay ng pagpanaw.'
          : 'Because the document owner is deceased, an official Registered Death Certificate is required as proof.',
      );
      requirements.unshift({
        name: 'Registered Death Certificate of the Deceased (Original & Photocopy)',
        isMandatory: true,
        note: 'Required by PSA and RA 10173 for records of deceased individuals.',
      });
    }

    if (isThirdParty) {
      contextualNotes.push(
        lang === 'fil'
          ? `Pagkuha para sa kamag-anak (${context.request_for}): Kailangan ng Patunay ng Pagkakamag-anak (e.g. sarili mong PSA Birth Certificate kung saan nakasaad ang pangalan ng magulang) o Notarized SPA / Authorization Letter.`
          : `Requesting for family member (${context.request_for}): Proof of kinship (your own PSA Birth Certificate naming the parent) or a Notarized SPA / Signed Authorization Letter is strictly required.`,
      );
      requirements.push({
        name: 'Proof of Kinship or Signed Authorization Letter / Notarized SPA',
        isMandatory: true,
        note: 'Required under RA 10173 & PD 603 when requesting on behalf of relatives.',
      });
      requirements.push({
        name: 'Valid Primary ID of Document Requester (Original & Photocopy)',
        isMandatory: true,
        note: 'To verify identity at the counter or doorstep delivery.',
      });
    }
  }

  // Fees calculation
  let processingFee = service?.processingFee ?? 155.0;
  const convenienceFee = service?.convenienceFee ?? 25.0;
  let feeNote = `Official government fee: ₱${processingFee.toFixed(2)}`;

  if (isJobseeker && (serviceCode === 'NBI_CLEARANCE' || serviceCode === 'PSA_BIRTH_CERT')) {
    processingFee = 0.0;
    feeNote =
      lang === 'fil'
        ? '₱0.00 (LIBRE) sa ilalim ng First-Time Jobseekers Assistance Act (RA 11261) basta may Barangay Certificate.'
        : '₱0.00 (FREE) under the First-Time Jobseekers Assistance Act (RA 11261) with Barangay Certification.';
    contextualNotes.push(
      lang === 'fil'
        ? 'Libre ang unang kopya para sa First-Time Jobseekers (RA 11261). Ipakita ang orihinal na Barangay Certification at Oath of Undertaking.'
        : 'First-Time Jobseeker benefit (RA 11261) applies: ₱0.00 fee. Present your original Barangay Certification and signed Oath of Undertaking.',
    );
  }

  // Actionable steps
  const actionableSteps: string[] = [];
  if (serviceCode === 'NBI_CLEARANCE') {
    actionableSteps.push(
      lang === 'fil'
        ? 'Mag-register sa opisyal na NBI Portal (clearance.nbi.gov.ph) at i-fill up ang profile.'
        : 'Register on the official NBI Portal (clearance.nbi.gov.ph) and complete your personal profile.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Pumili ng pinakamalapit na NBI Branch, petsa, at oras ng appointment slot.'
        : 'Select your preferred NBI Branch, date, and appointment slot.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? isJobseeker
          ? 'Piliin ang "First-Time Jobseeker (RA 11261)" para ₱0.00 ang bayad.'
          : `Magbayad ng ₱${(processingFee + convenienceFee).toFixed(2)} gamit ang Reference Number via e-wallet o over-the-counter.`
        : isJobseeker
          ? 'Select "First-Time Jobseeker (RA 11261)" for ₱0.00 waived processing fee.'
          : `Pay ₱${(processingFee + convenienceFee).toFixed(2)} using your Reference Number via e-wallet or over-the-counter.`,
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Pumunta sa NBI Branch sa araw ng appointment dala ang 2 Valid IDs (at Barangay Certificate kung jobseeker) para sa biometrics at photo capture.'
        : 'Appear at the NBI Branch on your scheduled appointment date with 2 Valid IDs (and Barangay Cert if jobseeker) for biometrics and photo capture.',
    );
  } else if (serviceCode.startsWith('PSA_')) {
    actionableSteps.push(
      lang === 'fil'
        ? 'Mag-book ng CRS Online Appointment sa appointment.psa.gov.ph para sa personal na pagkuha sa PSA Outlet, O mag-order via PSAHelpline.ph para sa doorstep delivery.'
        : 'Book a CRS Online Appointment at appointment.psa.gov.ph for walk-in PSA Outlet release, OR order via PSAHelpline.ph for nationwide doorstep delivery.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Ihanda ang mga kaukulang dokumento at photocopy ng Valid Primary ID.'
        : 'Prepare the documentary requirements and photocopies of Valid Primary IDs.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? `Bayaran ang kaukulang halaga (${feeNote}) sa cashier o online checkout.`
        : `Pay the required fee (${feeNote}) at the outlet cashier or online payment gateway.`,
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Tanggapin ang opisyal na Security Paper (SECPA) copy at i-verify ang barcode at dry seal.'
        : 'Receive the official Security Paper (SECPA) copy and verify the security barcode and seal.',
    );
  } else if (serviceCode === 'DFA_PASSPORT') {
    actionableSteps.push(
      lang === 'fil'
        ? 'Mag-book ng appointment sa passport.gov.ph at piliin ang DFA Consular Office (e.g. ASEANA, Megamall, SM Manila).'
        : 'Book an appointment at passport.gov.ph and select your DFA Consular Office (e.g. ASEANA, Megamall, SM Manila).',
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'I-print ang Application Form na may barcode at dalhin ang PSA Birth Certificate at 1 Valid Primary ID.'
        : 'Print the Application Form with barcode and bring your PSA Birth Certificate plus 1 Valid Primary ID.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Magbayad ng ₱950 (Regular, 12 working days) o ₱1,200 (Expedited, 6 working days) + ₱50 convenience fee.'
        : 'Pay ₱950 (Regular, 12 working days) or ₱1,200 (Expedited, 6 working days) + ₱50 convenience fee.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Sumunod sa DFA Dress Code (may kwelyo, walang hikaw/makapal na make-up, kita ang tainga) sa araw ng biometrics.'
        : 'Comply with DFA Dress Code (collared shirt, no earrings/heavy makeup, ears visible) for biometrics capture.',
    );
  } else {
    actionableSteps.push(
      lang === 'fil'
        ? `I-check ang mga opisyal na kailangan sa ${service?.agencyName || 'ahensya'}.`
        : `Check the official documentary requirements of the ${service?.agencyName || 'agency'}.`,
    );
    actionableSteps.push(
      lang === 'fil'
        ? 'Kumpletuhin ang mga form at maghanda ng 2 photocopies ng Valid Primary ID.'
        : 'Complete required forms and prepare 2 photocopies of a Valid Primary ID.',
    );
    actionableSteps.push(
      lang === 'fil'
        ? `Magtungo sa opisyal na portal o sangay ng ${service?.agencyName || 'ahensya'}.`
        : `Proceed to the official portal or branch of the ${service?.agencyName || 'agency'}.`,
    );
  }

  // Format concise or detailed markdown
  const lines: string[] = [];
  const title = service?.name || serviceCode.replace(/_/g, ' ');
  const agencyName = service?.agencyName || contact.agency;

  if (isConcise) {
    lines.push(`**${title} (${agencyName})**`);
    if (contextualNotes.length > 0) {
      lines.push(contextualNotes.join('\n'));
      lines.push('');
    }
    lines.push(`**Hakbang / Steps:**`);
    lines.push(actionableSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n'));
    lines.push('');
    lines.push(`**Bayad / Fee:** ${feeNote}`);
    if (portal) {
      lines.push(`**Opisyal na Portal:** ${portal.url}`);
    }
    lines.push(`**Tulong / Hotline:** ${contact.hotline}`);
  } else {
    lines.push(`### Gabay para sa ${title}`);
    lines.push(`*Opisyal na Alituntunin mula sa ${agencyName} Citizen's Charter*`);
    lines.push('');

    if (contextualNotes.length > 0) {
      lines.push('> **Paalala sa iyong sitwasyon:**');
      for (const n of contextualNotes) {
        lines.push(`> • ${n}`);
      }
      lines.push('');
    }

    lines.push(`#### 1. Mga Pangunahing Hakbang (Actionable Steps)`);
    lines.push(actionableSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n'));
    lines.push('');

    lines.push(`#### 2. Documentary Requirements`);
    for (const req of requirements) {
      lines.push(`- **${req.name}** ${req.isMandatory ? '*(Kailangan / Mandatory)*' : '*(Kung naaangkop)*'}${req.note ? ` — ${req.note}` : ''}`);
    }
    lines.push('');

    lines.push(`#### 3. Bayad at Processing Time`);
    lines.push(`- **Processing Fee:** ${feeNote}`);
    if (typeof service?.processingDays === 'number') {
      lines.push(`- **Processing Time:** ${service.processingDays} araw / day(s)`);
    }
    lines.push('');

    if (portal) {
      lines.push(`#### 4. Opisyal na Portal at Serbisyo`);
      lines.push(`- **Portal:** [${portal.portalName}](${portal.url.split(' ')[0]})`);
      lines.push(`- **Link:** \`${portal.url}\``);
      lines.push('');
    }

    lines.push(`#### 5. Public Assistance & Hotline`);
    lines.push(`- **Hotline:** ${contact.hotline}`);
    lines.push(`- **Email:** ${contact.email}`);
    lines.push('');
    lines.push(`*Paalala mula sa GovGuidePH: Ang platform na ito ay para sa gabay at paghahanda upang maiwasan ang "balik-pila". Hindi kami direktang nagpa-process ng transaksyon o nagtatago ng biometrics.*`);
  }

  const suggestedNextSteps = [
    `Ano ang mga tinatanggap na Valid Primary IDs para sa ${title}?`,
    `Paano kung may mali o mismatch sa aking pangalan o birthday?`,
    `Gaano katagal bago makuha ang ${title}?`,
  ];

  return {
    serviceCode,
    agencyName,
    serviceTitle: title,
    summary: `${title} navigation and documentary requirements under ${agencyName} Citizen's Charter.`,
    actionableSteps,
    requirements,
    fees: {
      processingFee,
      convenienceFee,
      isWaivableJobseeker: isJobseeker,
      note: feeNote,
    },
    verifiedPortalUrl: portal?.url,
    officialHotline: contact.hotline,
    officialEmail: contact.email,
    contextualNotes,
    suggestedNextSteps,
    formattedMarkdown: lines.join('\n'),
  };
}
