/**
 * GovGuide PH — Online Service Readiness & PSA Research Engine
 * Evaluates whether a government requirement can be applied and fulfilled
 * 100% online (e.g. PSAHelpline.ph nationwide doorstep delivery) vs walk-in counter,
 * with strict grounding in official Philippine Citizen's Charters, RA 10173, and PD 603.
 */

import type { ApplicantProfile, SavedVaultFile } from '@/lib/services/charter-sources';

export type OnlineServiceBadgeVariant = 'online_ready' | 'hybrid' | 'walkin_only';

export interface OnlineServiceStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface OnlineRequirementCheck {
  name: string;
  description: string;
  met?: boolean;
}

export interface OnlineProfileReadiness {
  isProfileReady: boolean;
  readinessScore: number; // 0 to 100
  presentFields: string[];
  missingFields: string[];
}

export interface OnlineApplicationData {
  serviceCode: string;
  serviceTitle: string;
  agencyName: string;
  canApplyOnline: boolean;
  blockerReason?: string;
  badgeLabel: string;
  badgeVariant: OnlineServiceBadgeVariant;
  primaryPortalName: string;
  primaryPortalUrl: string;
  secondaryPortalName?: string;
  secondaryPortalUrl?: string;
  walkInPortalName?: string;
  walkInPortalUrl?: string;
  deliverySla: string;
  onlineFeeText: string;
  walkInFeeText: string;
  queueComparison: {
    online: string;
    walkin: string;
  };
  steps: OnlineServiceStep[];
  requirementsList: OnlineRequirementCheck[];
  acceptedIds: string[];
  paymentOptions: string[];
  eligibilityNotice: string;
  exceptionsNotice?: {
    title: string;
    points: string[];
  };
  profileReadiness?: OnlineProfileReadiness;
}

/**
 * Evaluates the citizen profile completeness for instant online PSA application drafting.
 */
export function checkPsaProfileReadiness(applicant?: ApplicantProfile | null): OnlineProfileReadiness {
  if (!applicant) {
    return {
      isProfileReady: false,
      readinessScore: 0,
      presentFields: [],
      missingFields: [
        'Buong Pangalan',
        'Petsa ng Kapanganakan',
        'Lugar ng Kapanganakan',
        'Pangalan ng Tatay',
        'Dalagang Pangalan ng Nanay',
        'Contact Number',
      ],
    };
  }

  const checks: { label: string; ok: boolean }[] = [
    {
      label: 'Buong Pangalan',
      ok: Boolean(applicant.display_name?.trim() || (applicant.first_name && applicant.last_name)),
    },
    {
      label: 'Petsa ng Kapanganakan',
      ok: Boolean(applicant.birth_date && applicant.birth_date.includes('-')),
    },
    {
      label: 'Lugar ng Kapanganakan',
      ok: Boolean(applicant.place_of_birth?.trim() || applicant.city?.trim()),
    },
    {
      label: 'Pangalan ng Tatay',
      ok: Boolean(applicant.father_name?.trim() || applicant.father_last_name?.trim()),
    },
    {
      label: 'Dalagang Pangalan ng Nanay',
      ok: Boolean(applicant.mother_maiden_name?.trim() || applicant.mother_last_name?.trim()),
    },
    {
      label: 'Contact Number',
      ok: Boolean(applicant.phone?.trim() || applicant.contact_number?.trim()),
    },
  ];

  const presentFields = checks.filter((c) => c.ok).map((c) => c.label);
  const missingFields = checks.filter((c) => !c.ok).map((c) => c.label);
  const readinessScore = Math.round((presentFields.length / checks.length) * 100);

  return {
    isProfileReady: readinessScore >= 65,
    readinessScore,
    presentFields,
    missingFields,
  };
}

/**
 * Researches and evaluates whether the inquiry can be fulfilled online.
 */
export function evaluateOnlineReadiness(
  serviceCode: string | null | undefined,
  userText: string,
  applicant?: ApplicantProfile | null,
  vaultFiles?: SavedVaultFile[],
): OnlineApplicationData | null {
  const query = (userText || '').toLowerCase();
  const code = (serviceCode || '').toUpperCase();

  const isPsaInquiry =
    code.startsWith('PSA') ||
    /\b(psa|birth\s*cert|kapanganakan|marriage|kasal|cenomar|singleness|death\s*cert|secpa|helpline|psahelpline|psaserbilis)\b/i.test(
      query,
    );

  const isNbiInquiry = code.startsWith('NBI') || /\b(nbi|clearance|hit)\b/i.test(query);
  const isDfaInquiry = code.startsWith('DFA') || /\b(dfa|passport|pasaporte|consular)\b/i.test(query);

  if (!isPsaInquiry && !isNbiInquiry && !isDfaInquiry) {
    return null;
  }

  // --------------------------------------------------------------------------
  // PSA FAMILY SERVICES EVALUATION
  // --------------------------------------------------------------------------
  if (isPsaInquiry) {
    // Check for blocking counter-only exceptions
    const isTypographicalError =
      /\b(mali(ng)?\s*(ang\s*)?spelling|maling\s*pangalan|wrong\s*spelling|typographical|error\s*sa\s*(pangalan|birth\s*date)|administrative\s*correction|ra\s*9048|ra\s*10172)\b/i.test(
        query,
      );

    const isLateRegistration =
      /\b(late\s*reg(istration)?|delayed\s*reg(istration)?|hindi\s*pa\s*(na)?irehistro|walang\s*rekord\s*sa\s*psa)\b/i.test(
        query,
      );

    const isBlurredOrDamaged =
      /\b(malabo(ng\s*kopya)?|blurred|punit|hindi\s*mabasa|form\s*1a|transcription)\b/i.test(
        query,
      );

    // Specific sub-type of PSA certificate (CENOMAR takes precedence over generic "marriage license" mentions)
    const isCenomar = code.includes('CENOMAR') || /\b(cenomar|singleness|single\s*certificate|certificate\s*of\s*no\s*marriage)\b/i.test(query);
    const isDeath = !isCenomar && (code.includes('DEATH') || /\b(death|namatay|yumao)\b/i.test(query));
    const isMarriage = !isCenomar && !isDeath && (code.includes('MARRIAGE') || /\b(marriage\s*cert(ificate)?|kasal|marriage\s*contract)\b/i.test(query));

    const certTitle = isCenomar
      ? 'PSA CENOMAR / Certificate of No Marriage'
      : isMarriage
        ? 'PSA Marriage Certificate (SECPA)'
        : isDeath
          ? 'PSA Death Certificate (SECPA)'
          : 'PSA Birth Certificate (SECPA)';

    const onlineFee = isCenomar ? '₱420.00' : '₱365.00';
    const walkInFee = isCenomar ? '₱210.00' : '₱155.00';

    // BLOCKER CASE: Citizen cannot apply online due to civil registry exception
    if (isTypographicalError || isLateRegistration || isBlurredOrDamaged) {
      const blockerReason = isTypographicalError
        ? 'Sa ilalim ng RA 9048 at RA 10172, ang typographical o spelling error sa pangalan at petsa ng kapanganakan ay hindi maitatama via online application. Ang online delivery (PSAHelpline/PSA Serbilis) ay nag-iimprenta lamang ng rekord na kasalukuyang nasa national database. Kailangang magsampa ng Administrative Petition sa Local Civil Registry Office (LCRO) kung saan unang nairehistro ang kapanganakan.'
        : isLateRegistration
          ? 'Ang Delayed o Late Registration ng kapanganakan ay hindi maaaring gawin online. Kinakailangan ang personal na pagtungo sa Local Civil Registry Office (LCRO) ng munisipyo o lungsod para sa interview, Affidavit of Delayed Registration, at supporting civil documents.'
          : 'Kung malabo o punit ang microfilm copy sa PSA archives, kailangang kumuha muna ng Local Civil Registrar Transcription (LCR Form 1A) nang personal sa munisipyo/lungsod kung saan nairehistro ang dokumento.';

      return {
        serviceCode: isMarriage ? 'PSA_MARRIAGE_CERT' : isCenomar ? 'PSA_CENOMAR' : 'PSA_BIRTH_CERT',
        serviceTitle: certTitle,
        agencyName: 'Philippine Statistics Authority (PSA)',
        canApplyOnline: false,
        blockerReason,
        badgeLabel: 'Personal Appearance sa LCRO Required (Hindi Pwede Online)',
        badgeVariant: 'walkin_only',
        primaryPortalName: 'PSA CRS Appointment Portal',
        primaryPortalUrl: 'https://appointment.psa.gov.ph',
        walkInPortalName: 'Local Civil Registry Office (LCRO)',
        walkInPortalUrl: 'https://psa.gov.ph/civil-registration/directory-of-lcro',
        deliverySla: 'Personal filing (5–10 araw depende sa LCRO hearing & posting)',
        onlineFeeText: 'Hindi applicable (Kailangan ng LCRO filing)',
        walkInFeeText: `${walkInFee} + LCRO filing statutory fees`,
        queueComparison: {
          online: 'Hindi pwede online (ire-replicate lamang ang maling spelling/rekord)',
          walkin: 'Personal na pagtungo sa LCRO para sa correction / Form 1A',
        },
        steps: [
          {
            stepNumber: 1,
            title: 'Pumunta sa Local Civil Registry Office (LCRO)',
            description:
              'Magtungo sa LCRO ng lungsod o munisipyo kung saan ipinanganak o nairehistro ang dokumento.',
          },
          {
            stepNumber: 2,
            title: 'Isampa ang Administrative Petition (RA 9048 / RA 10172)',
            description:
              'Magsumite ng mga sumusuportang dokumento tulad ng Baptismal Certificate, lumang School Records (Form 137), at Valid IDs.',
          },
          {
            stepNumber: 3,
            title: 'Maghintay ng PSA Endorsement at Annotate',
            description:
              'Kapag naaprubahan ng City/Municipal Civil Registrar, ipapadala ito sa PSA Central Office para i-annotate sa SECPA bago mag-order ng bagong kopya.',
          },
        ],
        requirementsList: [
          {
            name: 'Petition Form under RA 9048 / RA 10172',
            description: 'Pinasagutang opisyal na petisyon sa LCRO.',
            met: false,
          },
          {
            name: 'At least Dalawang (2) Public o Private Documents',
            description: 'Hal. Baptismal Certificate, Form 137, SSS E-1, Voter’s Registration.',
            met: false,
          },
          {
            name: 'Isang (1) Valid Primary Government ID',
            description: 'PhilSys National ID, Passport, Driver’s License, o UMID.',
            met: Boolean(applicant?.philsys_id || vaultFiles?.length),
          },
        ],
        acceptedIds: [
          'PhilSys National ID (Physical o ePhilID)',
          'DFA Passport',
          'LTO Driver’s License',
          'UMID / SSS ID',
          'PRC ID',
        ],
        paymentOptions: ['LCRO Cashier Counter'],
        eligibilityNotice:
          'Mahalagang paalala: Huwag mag-order online kung may error sa rekord upang maiwasan ang pagsasayang ng bayad sa maling impormasyon.',
      };
    }

    // HAPPY PATH: PSA Can Be Applied 100% Online via Doorstep Delivery!
    const profileReadiness = checkPsaProfileReadiness(applicant);

    return {
      serviceCode: isMarriage ? 'PSA_MARRIAGE_CERT' : isCenomar ? 'PSA_CENOMAR' : 'PSA_BIRTH_CERT',
      serviceTitle: certTitle,
      agencyName: 'Philippine Statistics Authority (PSA)',
      canApplyOnline: true,
      badgeLabel: '100% Online Application & Doorstep Delivery Available',
      badgeVariant: 'online_ready',
      primaryPortalName: 'PSAHelpline.ph',
      primaryPortalUrl: 'https://psahelpline.ph',
      secondaryPortalName: 'PSA Serbilis',
      secondaryPortalUrl: 'https://psaserbilis.com.ph',
      walkInPortalName: 'PSA CRS Online Appointment (₱155)',
      walkInPortalUrl: 'https://appointment.psa.gov.ph',
      deliverySla: '1–3 working days (Metro Manila) · 3–8 days (Provincial)',
      onlineFeeText: `${onlineFee} (Kasama na ang SECPA at Doorstep Courier Delivery)`,
      walkInFeeText: `${walkInFee} (Personal na walk-in sa PSA CRS Outlet)`,
      queueComparison: {
        online: '0 minuto — Diretso sa inyong tahanan o opisina nang walang balik-pila',
        walkin: '2–4 na oras sa outlet counter + kailangan mag-book ng slot linggo bago ang araw',
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Mag-order Online sa PSAHelpline.ph',
          description:
            'I-fill up ang detalye ng may-ari ng sertipiko, pangalan ng mga magulang, at tirahan para sa delivery.',
        },
        {
          stepNumber: 2,
          title: 'Magbayad via Digital Channels',
          description:
            'Pumili mula sa GCash, Maya, Debit/Credit Card, o over-the-counter sa 7-Eleven o Bayad Center.',
        },
        {
          stepNumber: 3,
          title: 'Ihanda ang 1 Valid ID sa Pagdating ng Courier',
          description:
            'Ipakita ang isang orihinal na valid photo ID sa courier upang matanggap ang opisyal na SECPA package.',
        },
      ],
      requirementsList: [
        {
          name: 'Isang (1) Orihinal na Valid Government Photo ID',
          description: 'Ipakita lamang sa courier pagdating ng delivery (PhilSys, Passport, Driver’s License, UMID, Postal ID).',
          met: Boolean(applicant?.philsys_id || vaultFiles?.length),
        },
        {
          name: 'Tumpak na Detalye ng May-ari at Magulang',
          description: 'Buong pangalan, petsa/lugar ng kapanganakan, at dalagang pangalan ng ina.',
          met: profileReadiness.isProfileReady,
        },
        {
          name: 'Kompletong Delivery Address at Mobile Number',
          description: 'Para sa koordinasyon ng courier rider bago mag-deliver.',
          met: Boolean(applicant?.city || applicant?.street_address),
        },
        {
          name: 'Online Payment (E-Wallet, Card o OTC)',
          description: `${onlineFee} kabuuang bayarin (inclusive of statutory document fee and delivery).`,
          met: true,
        },
      ],
      acceptedIds: [
        'PhilSys National ID (Physical o ePhilID)',
        'DFA Passport',
        'LTO Driver’s License',
        'UMID / SSS ID',
        'PRC ID',
        'Digitized Postal ID',
        'Voter’s ID / Senior Citizen ID',
      ],
      paymentOptions: [
        'GCash',
        'Maya',
        'ShopeePay',
        'Visa / Mastercard / JCB',
        'Online Banking (BDO, BPI, UnionBank, RCBC)',
        '7-Eleven CLIQQ / Bayad Center / Palawan Express',
      ],
      eligibilityNotice:
        'Alinsunod sa Section 7 ng Presidential Decree No. 603 at RA 10173 (Data Privacy Act), ang birth certificate ay mahigpit na confidential at maaari lamang i-deliver sa: May-ari (18+), Magulang, Asawa, o Anak. Kung kinatawan, kailangan ng online Letter of Authorization (LOA) at kopya ng ID ng may-ari.',
      exceptionsNotice: {
        title: 'Kailan Hindi Pwede ang Online Doorstep Delivery?',
        points: [
          'May maling spelling sa pangalan o maling petsa ng kapanganakan (Kailangan ng RA 9048 petition sa munisipyo/LCRO).',
          'Malabo o punit ang archive copy (Kailangan ng LCR Form 1A transcription mula sa LCRO).',
          'Hindi pa naipaparehistro o late registration (Kailangan ng personal na pagpaparehistro sa LCRO).',
          'Kailangan ng rush same-day release (Mas mabilis mag-book ng CRS outlet appointment para makuha sa loob ng 1–2 oras).',
        ],
      },
      profileReadiness,
    };
  }

  // --------------------------------------------------------------------------
  // NBI CLEARANCE EVALUATION
  // --------------------------------------------------------------------------
  if (isNbiInquiry) {
    const isRenewal = /\b(renew|renewal|dati\s*nang\s*meron|dating\s*nbi)\b/i.test(query);

    return {
      serviceCode: 'NBI_CLEARANCE',
      serviceTitle: 'NBI Clearance (Online Portal & Doorstep Delivery)',
      agencyName: 'National Bureau of Investigation (NBI)',
      canApplyOnline: true,
      badgeLabel: isRenewal
        ? 'Online Renewal & Doorstep Delivery Available (No Biometrics Needed)'
        : 'Hybrid: Online Registration & Booking Required + Biometrics Appearance',
      badgeVariant: isRenewal ? 'online_ready' : 'hybrid',
      primaryPortalName: 'NBI Clearance Online Portal',
      primaryPortalUrl: 'https://clearance.nbi.gov.ph',
      deliverySla: isRenewal ? '3–5 working days (Nationwide Delivery)' : 'Same-day release at branch (if NO HIT)',
      onlineFeeText: isRenewal ? '₱350.00 – ₱370.00 (Renewal with Doorstep Delivery)' : '₱155.00 (₱0.00 if Jobseeker RA 11261)',
      walkInFeeText: '₱130.00 + ₱25.00 e-payment fee',
      queueComparison: {
        online: isRenewal
          ? '0 minuto — Doorstep delivery diretso sa bahay kung clearance ay issued 2014 pataas'
          : 'I-fill up ang form at mag-book ng slot online para iwas pila sa sangay',
        walkin: '1–2 oras para sa biometrics at photo capture sa NBI Branch',
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Mag-register at Mag-login sa clearance.nbi.gov.ph',
          description: isRenewal
            ? 'I-enter ang iyong lumang NBI ID Number para ma-verify ang rekord.'
            : 'Punan ang personal profile, tirahan, at impormasyon ng pamilya.',
        },
        {
          stepNumber: 2,
          title: isRenewal ? 'Piliin ang "Doorstep Delivery"' : 'Pumili ng Branch at Appointment Slot',
          description: isRenewal
            ? 'I-enter ang address at magbayad via GCash o Card.'
            : 'Piliin ang pinakamalapit na sangay at magbayad via online reference number.',
        },
        {
          stepNumber: 3,
          title: isRenewal ? 'Tanggapin ang NBI Clearance' : 'Pumunta sa NBI Branch para sa Biometrics',
          description: isRenewal
            ? 'Ipakita ang valid ID sa delivery rider pagdating.'
            : 'Dalhin ang 2 Valid IDs (at Barangay Certificate kung first-time jobseeker para ₱0.00).',
        },
      ],
      requirementsList: [
        {
          name: isRenewal ? 'Lumang NBI ID Number' : 'Dalawang (2) Valid Government IDs',
          description: isRenewal
            ? 'Mula sa clearance na inisyu noong 2014 pataas.'
            : 'PhilSys National ID, DFA Passport, Driver’s License, UMID, o Postal ID.',
          met: Boolean(applicant?.philsys_id || vaultFiles?.length),
        },
        {
          name: 'NBI Online Account / Reference Number',
          description: 'Nakuha matapos mag-fill up sa clearance.nbi.gov.ph.',
          met: true,
        },
      ],
      acceptedIds: [
        'PhilSys National ID',
        'DFA Passport',
        'LTO Driver’s License',
        'PRC ID',
        'UMID / SSS ID',
        'Digitized Postal ID',
      ],
      paymentOptions: ['GCash', 'Maya', 'ShopeePay', 'Visa / Mastercard', '7-Eleven CLIQQ', 'Bayad Center'],
      eligibilityNotice:
        'First-Time Jobseeker (RA 11261): Libre ang unang kopya ng NBI Clearance basta magdala ng orihinal na Barangay Certificate at signed Oath of Undertaking sa appointment.',
    };
  }

  // --------------------------------------------------------------------------
  // DFA PASSPORT EVALUATION
  // --------------------------------------------------------------------------
  if (isDfaInquiry) {
    return {
      serviceCode: 'DFA_PASSPORT',
      serviceTitle: 'Philippine ePassport (DFA Consular Service)',
      agencyName: 'Department of Foreign Affairs (DFA)',
      canApplyOnline: true,
      badgeLabel: 'Hybrid: Online Appointment & Application Required + In-Person Biometrics',
      badgeVariant: 'hybrid',
      primaryPortalName: 'DFA Passport Online Appointment System',
      primaryPortalUrl: 'https://passport.gov.ph',
      deliverySla: 'Regular: 12 working days · Expedited: 6 working days',
      onlineFeeText: '₱950 (Regular) / ₱1,200 (Expedited) + ₱50 convenience fee',
      walkInFeeText: 'Bawal ang walk-in nang walang appointment (maliban sa Courtesy Lane)',
      queueComparison: {
        online: 'Punan ang application form at mag-book ng appointment date online',
        walkin: '30–45 minuto para sa document screening at biometric/photo capture sa Consular Office',
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Mag-book ng Appointment sa passport.gov.ph',
          description: 'Pumili ng DFA Consular Office (e.g. ASEANA, Megamall, SM Manila) at petsa.',
        },
        {
          stepNumber: 2,
          title: 'Punan ang Online Application Form at Magbayad',
          description: 'Magbayad sa loob ng 24 oras via credit/debit card, e-wallet, o payment center.',
        },
        {
          stepNumber: 3,
          title: 'Pumunta sa DFA Site sa Araw ng Appointment',
          description: 'Dalhin ang printed form na may barcode, PSA Birth Certificate, at 1 Valid Primary ID.',
        },
      ],
      requirementsList: [
        {
          name: 'Confirmed DFA Online Appointment Confirmation na may Barcode',
          description: 'Naka-print sa standard Letter size (8.5 x 11 in) paper.',
          met: false,
        },
        {
          name: 'PSA Birth Certificate sa Security Paper (SECPA)',
          description: 'Orihinal na kopya at malinaw na photocopy.',
          met: false,
        },
        {
          name: 'Isang (1) Valid Primary Government ID',
          description: 'PhilSys National ID, Driver’s License, UMID, PRC ID, o Voter’s ID.',
          met: Boolean(applicant?.philsys_id || vaultFiles?.length),
        },
      ],
      acceptedIds: [
        'PhilSys National ID (Physical o ePhilID)',
        'LTO Driver’s License',
        'UMID / SSS ID',
        'PRC License',
        'Digitized Postal ID',
      ],
      paymentOptions: ['GCash', 'Maya', 'Visa / Mastercard', 'Bayad Center', '7-Eleven CLIQQ'],
      eligibilityNotice:
        'Courtesy Lane: Ang mga Senior Citizen, PWD, buntis, OFW, at batang 7 taong gulang pababa ay maaaring mag-walk in sa DFA Courtesy Lane kasama ang 1 companion nang walang online appointment.',
    };
  }

  return null;
}
