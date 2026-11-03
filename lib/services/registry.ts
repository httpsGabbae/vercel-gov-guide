export interface ServiceDefinition {
  code: string;
  agencyCode: string;
  agencyName: string;
  name: string;
  description: string;
  processingFee: number;
  convenienceFee?: number;
  processingDays: number;
  counterReadyTips: string[];
  requirements: {
    name: string;
    description: string;
    isPrimaryId?: boolean;
    required: boolean;
    appliesTo?: 'all' | 'first_time_jobseeker' | 'representative' | 'minor' | 'senior';
  }[];
  officialPortal: string;
  hotline: string;
  email: string;
}

export const SERVICES_REGISTRY: Record<string, ServiceDefinition> = {
  NBI_CLEARANCE: {
    code: 'NBI_CLEARANCE',
    agencyCode: 'NBI',
    agencyName: 'National Bureau of Investigation',
    name: 'NBI Clearance (First-Time Jobseeker & Regular/Renewal)',
    description:
      'Official government certification issued by the NBI attesting whether an individual has derogatory criminal records.',
    processingFee: 130.0,
    convenienceFee: 25.0,
    processingDays: 1, // Same-day if no HIT; 5-10 days if with HIT
    counterReadyTips: [
      'Magdala ng 2 Valid Primary IDs na may malinaw na litrato at pirma.',
      'Kung first-time jobseeker, dalhin ang orihinal na Barangay Certificate at Oath of Undertaking para maging libre (₱0.00).',
      'I-print o i-save sa cellphone ang NBI Reference Number bago pumunta sa sangay.',
    ],
    requirements: [
      {
        name: 'Dalawang (2) Valid Government IDs',
        description: 'Halimbawa: PhilSys National ID, DFA Passport, Driver’s License, UMID, PRC ID, Postal ID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'NBI Online Reference Number',
        description: 'Nakuha matapos mag-fill up sa clearance.nbi.gov.ph',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Barangay Certification of First-Time Jobseeker',
        description: 'Orihinal na kopya mula sa Punong Barangay na may bisa sa loob ng 90 araw (RA 11261).',
        required: true,
        appliesTo: 'first_time_jobseeker',
      },
      {
        name: 'Oath of Undertaking',
        description: 'Nilagdaang sinumpaang pahayag ng first-time jobseeker.',
        required: true,
        appliesTo: 'first_time_jobseeker',
      },
    ],
    officialPortal: 'https://clearance.nbi.gov.ph',
    hotline: '(02) 8523-8231 loc. 5440 / 0961-734-7222',
    email: 'clearance@nbi.gov.ph',
  },

  PSA_BIRTH_CERT: {
    code: 'PSA_BIRTH_CERT',
    agencyCode: 'PSA',
    agencyName: 'Philippine Statistics Authority',
    name: 'Issuance of Certificate of Live Birth in Security Paper (SECPA)',
    description:
      'Certified true copy of Certificate of Live Birth issued on tamper-evident SECPA paper by the Philippine Statistics Authority.',
    processingFee: 155.0, // Walk-in CRS outlet; ₱330 - ₱365 online delivery
    processingDays: 1, // Same-day at CRS outlet
    counterReadyTips: [
      'Mag-book muna ng online appointment sa appointment.psa.gov.ph bago magtungo sa CRS outlet.',
      'Tiyaking hindi laminado, basa, o punit ang orihinal na SECPA copy.',
      'Kung kinatawan (representative), kailangan ng notarized SPA o Authorization Letter at kopya ng ID ng may-ari.',
    ],
    requirements: [
      {
        name: 'PSA Birth Certificate Application Form (Yellow Form)',
        description: 'Pinasagutang form sa CRS outlet o printed appointment confirmation.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Valid Primary Government ID',
        description: 'PhilSys National ID, Passport, Driver’s License, UMID, o PRC ID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Special Power of Attorney (SPA) o Authorization Letter',
        description:
          'Kailangan kung hindi ang may-ari, magulang, asawa, o anak ang kukuha (RA 10173 at PD 603).',
        required: true,
        appliesTo: 'representative',
      },
      {
        name: 'ID ng May-ari ng Dokumento',
        description: 'Orihinal at malinaw na photocopy ng ID ng may-ari.',
        required: true,
        appliesTo: 'representative',
      },
    ],
    officialPortal: 'https://psaserbilis.com.ph',
    hotline: '(02) 8461-0500 loc. 603 / 0917-872-7722',
    email: 'civilregistry@psa.gov.ph',
  },

  PHILHEALTH_REGISTRATION: {
    code: 'PHILHEALTH_REGISTRATION',
    agencyCode: 'PHILHEALTH',
    agencyName: 'Philippine Health Insurance Corporation',
    name: 'Member Registration & PIN/MDR Issuance',
    description:
      'Registration into the National Health Insurance Program (NHIP) and issuance of PhilHealth Identification Number (PIN) and Member Data Record (MDR).',
    processingFee: 0.0, // Registration is 100% FREE
    processingDays: 1, // Within 30 minutes at LHIO / Express counters
    counterReadyTips: [
      'Ang pagpaparehistro at pagkuha ng PIN/MDR ay LIBRE (₱0.00). Huwag magbayad sa mga fixer.',
      'Bawal magkaroon ng dalawang PIN. Kung dati nang may PhilHealth, mag-request lamang ng Verification.',
      'Magdala ng 2 pirasong 1x1 ID pictures na may puting background.',
    ],
    requirements: [
      {
        name: 'PhilHealth Member Registration Form (PMRF)',
        description: 'Dalawang (2) duly accomplished original copies.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Primary ID o Dalawang (2) Secondary IDs',
        description: 'PhilSys National ID, Passport, Driver’s License, UMID, o Postal ID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Dalawang (2) pirasong 1x1 ID Picture',
        description: 'Kamakailang litrato na may puting background.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'PSA Marriage Certificate / Birth Certificate ng Dependents',
        description: 'Kailangan kung may idedeklarang asawa o menor-de-edad na anak.',
        required: false,
        appliesTo: 'all',
      },
      {
        name: 'Senior Citizen OSCA ID o DSWD Indigency Certificate',
        description: 'Para sa 100% subsidized premium ng pamahalaan (RA 10645).',
        required: true,
        appliesTo: 'senior',
      },
    ],
    officialPortal: 'https://memberinquiry.philhealth.gov.ph',
    hotline: '(02) 8441-7442',
    email: 'actioncenter@philhealth.gov.ph',
  },
};

export function getServiceByCode(code: string): ServiceDefinition | null {
  const normalized = code.toUpperCase().trim();
  return SERVICES_REGISTRY[normalized] || null;
}

export function listAllServices(): ServiceDefinition[] {
  return Object.values(SERVICES_REGISTRY);
}
