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

  PSA_MARRIAGE_CERT: {
    code: 'PSA_MARRIAGE_CERT',
    agencyCode: 'PSA',
    agencyName: 'Philippine Statistics Authority',
    name: 'Issuance of Certificate of Marriage in Security Paper (SECPA)',
    description:
      'Certified true copy of Certificate of Marriage issued on tamper-evident SECPA paper by the Philippine Statistics Authority.',
    processingFee: 155.0,
    processingDays: 1,
    counterReadyTips: [
      'Ihanda ang eksaktong petsa at lugar ng kasal, at buong pangalan ng mag-asawa.',
      'Kung kamakailan lamang ikinasal (wala pang 6 buwan), tiyaking naipasa na ng Local Civil Registrar (LCR) ang rekord sa PSA.',
      'Kailangan ng Authorization Letter / SPA kung kinatawan ang kukuha.',
    ],
    requirements: [
      {
        name: 'PSA Marriage Certificate Application Form',
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
        name: 'Authorization Letter / SPA',
        description: 'Kailangan kung hindi ang mag-asawa o kanilang anak ang kukuha.',
        required: true,
        appliesTo: 'representative',
      },
    ],
    officialPortal: 'https://psaserbilis.com.ph',
    hotline: '(02) 8461-0500 / 0917-872-7722',
    email: 'civilregistry@psa.gov.ph',
  },

  PSA_CENOMAR: {
    code: 'PSA_CENOMAR',
    agencyCode: 'PSA',
    agencyName: 'Philippine Statistics Authority',
    name: 'Certificate of No Marriage Record (CENOMAR / Singleness)',
    description:
      'Official certification issued by the PSA verifying whether a person has contracted marriage based on the National Civil Registry Database.',
    processingFee: 210.0,
    processingDays: 1,
    counterReadyTips: [
      'Ang CENOMAR ay karaniwang may 6 na buwang validity para sa visa at marriage license requirements.',
      'Tiyaking tama ang spelling ng buong pangalan, pangalan ng mga magulang, at petsa ng kapanganakan.',
    ],
    requirements: [
      {
        name: 'CENOMAR Application Form (Green Form)',
        description: 'Duly accomplished CENOMAR form.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Valid Primary Government ID',
        description: 'PhilSys National ID, Passport, Driver’s License, o UMID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Special Power of Attorney (SPA)',
        description: 'Notarized SPA kung kinatawan ang mag-aapply.',
        required: true,
        appliesTo: 'representative',
      },
    ],
    officialPortal: 'https://psaserbilis.com.ph',
    hotline: '(02) 8461-0500',
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

  SSS_REGISTRATION: {
    code: 'SSS_REGISTRATION',
    agencyCode: 'SSS',
    agencyName: 'Social Security System',
    name: 'Social Security Number (SSN) Issuance & E-1 Online Registration',
    description:
      'Online issuance of permanent lifetime Social Security (SS) Number for private employees, self-employed, OFWs, and non-working spouses.',
    processingFee: 0.0,
    processingDays: 1,
    counterReadyTips: [
      'Ang pagkuha ng SS Number ay LIBRE (₱0.00) sa pamamagitan ng sss.gov.ph.',
      'Ang SS Number ay panghabambuhay (lifetime). Huwag kumuha ng panibago kung may dati ka nang numero.',
      'Pagkatapos mag-apply online, i-upload o dalhin ang PSA Birth Certificate para maging permanent ang membership.',
    ],
    requirements: [
      {
        name: 'PSA Birth Certificate (SECPA)',
        description: 'Certified true copy ng birth certificate mula sa PSA.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Primary Valid Government ID',
        description: 'PhilSys National ID, Passport, Driver’s License, PRC ID, o UMID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Barangay Certification (First-Time Jobseeker)',
        description: 'Kung fresh graduate/jobseeker sa ilalim ng RA 11261.',
        required: false,
        appliesTo: 'first_time_jobseeker',
      },
    ],
    officialPortal: 'https://www.sss.gov.ph/become-an-sss-member',
    hotline: '1455 / (02) 81455',
    email: 'usssaptayo@sss.gov.ph',
  },

  PAGIBIG_MEMBERSHIP: {
    code: 'PAGIBIG_MEMBERSHIP',
    agencyCode: 'PAGIBIG',
    agencyName: 'Home Development Mutual Fund (Pag-IBIG Fund)',
    name: 'Pag-IBIG Member Identification (MID) Number Registration',
    description:
      'Online registration for new members to obtain a permanent Pag-IBIG MID Number for savings, MP2, and housing loan privileges.',
    processingFee: 0.0,
    processingDays: 1,
    counterReadyTips: [
      'Mag-apply online sa Virtual Pag-IBIG portal para makakuha ng Tracking Number bago pumunta sa sangay.',
      'Ang Pag-IBIG MID Number ay naipapadala via SMS sa loob ng 2-3 business days.',
      'I-save ang MDF (Member Data Form) summary bilang opisyal na patunay ng rehistrasyon.',
    ],
    requirements: [
      {
        name: 'Member Data Form (MDF) Summary',
        description: 'Generated online form mula sa Virtual Pag-IBIG portal.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Valid Government ID',
        description: 'PhilSys National ID, Passport, Driver’s License, SSS UMID, o PRC ID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://www.pagibigfundservices.com/virtualpagibig/',
    hotline: '(02) 8724-4244',
    email: 'contactus@pagibigfund.gov.ph',
  },

  DFA_PASSPORT: {
    code: 'DFA_PASSPORT',
    agencyCode: 'DFA',
    agencyName: 'Department of Foreign Affairs',
    name: 'Philippine Electronic Passport (ePassport) Application & Renewal',
    description:
      'Issuance of official Philippine passport for international travel, identity, and citizenship verification.',
    processingFee: 950.0, // Regular processing (12 days); ₱1,200 for Expedited (6 days)
    convenienceFee: 50.0,
    processingDays: 12,
    counterReadyTips: [
      'Mag-book ng confirmed online appointment sa passport.gov.ph. Bawal ang walk-in maliban sa Courtesy Lane.',
      'Magsuot ng disenteng kasuotan na may kwelyo. Bawal ang contact lenses, hikaw, at makapal na makeup sa biometric capture.',
      'Dalhin ang orihinal na PSA Birth Certificate at photocopy nito.',
    ],
    requirements: [
      {
        name: 'Confirmed Online Appointment & Duly Accomplished Form',
        description: 'Naka-print sa A4 paper mula sa DFA Online Passport Appointment System.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'PSA Birth Certificate on Security Paper (SECPA)',
        description: 'Orihinal at malinaw na photocopy mula sa Philippine Statistics Authority.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Valid Government-Issued Photo ID',
        description: 'PhilSys National ID, SSS/GSIS UMID, Driver’s License, PRC ID, o OWWA/iDOLE.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'PSA Marriage Certificate',
        description: 'Para sa may-asawang babae na nagnanais gamitin ang apelyido ng asawa.',
        required: false,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://passport.gov.ph',
    hotline: '(02) 8234-3488',
    email: 'passportconcerns@dfa.gov.ph',
  },

  DTI_BUSINESS_NAME: {
    code: 'DTI_BUSINESS_NAME',
    agencyCode: 'DTI',
    agencyName: 'Department of Trade and Industry',
    name: 'Business Name Registration System (BNRS) for Sole Proprietorship',
    description:
      'Registration of trade name for single proprietorships under Republic Act 3883 as amended by Act 4147.',
    processingFee: 200.0, // Barangay: ₱200, City/Mun: ₱500, Regional: ₱1,000, National: ₱2,000
    convenienceFee: 30.0,
    processingDays: 1, // Instant online issuance
    counterReadyTips: [
      'Maghanda ng 3 pangalan ng negosyo na sumusunod sa DTI guidelines (Dominant + Descriptor).',
      'Maaaring magparehistro 100% online sa bnrs.dti.gov.ph nang hindi pumupunta sa DTI Negosyo Center.',
      'Tiyaking may valid email address at mobile number para sa Certificate verification.',
    ],
    requirements: [
      {
        name: 'Accomplished BNRS Application Form',
        description: 'Online application form sa bnrs.dti.gov.ph',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Valid Primary Government ID',
        description: 'May-ari ay dapat hindi bababa sa 18 taong gulang na mamamayang Pilipino.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://bnrs.dti.gov.ph',
    hotline: '1-384 (1-DTI) / 0917-834-3330',
    email: 'bnrshelpdesk@dti.gov.ph',
  },

  BIR_TIN: {
    code: 'BIR_TIN',
    agencyCode: 'BIR',
    agencyName: 'Bureau of Internal Revenue',
    name: 'Taxpayer Identification Number (TIN) & Digital TIN ID Issuance',
    description:
      'Issuance of official TIN and Digital TIN ID for individuals, employees, professionals, and sole proprietors via BIR ORUS.',
    processingFee: 0.0,
    processingDays: 1,
    counterReadyTips: [
      'LIBRE (₱0.00) ang pagkuha ng TIN at Digital TIN ID sa pamamagitan ng ORUS (orus.bir.gov.ph).',
      'Mahigpit na ipinagbabawal ang pagkakaroon ng higit sa isang TIN (Article 275 ng NIRC).',
      'Mag-upload ng 1x1 photo na may puting background at malinaw na kuha nang walang salamin.',
    ],
    requirements: [
      {
        name: 'BIR Form 1904 (o 1901/1902 ayon sa kategorya)',
        description: 'Duly accomplished form online via ORUS o sa Revenue District Office (RDO).',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Primary Valid Government ID',
        description: 'PhilSys National ID, Passport, Driver’s License, o PSA Birth Certificate.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: '1x1 ID Picture na may Puting Background',
        description: 'Malinaw na selfie/photo para sa Digital TIN ID profile.',
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://orus.bir.gov.ph',
    hotline: '(02) 8538-3200',
    email: 'contact_us@bir.gov.ph',
  },

  PRC_LERIS: {
    code: 'PRC_LERIS',
    agencyCode: 'PRC',
    agencyName: 'Professional Regulation Commission',
    name: 'PRC LERIS Professional Licensure & ID Renewal',
    description:
      'Online appointment, exam application, initial registration, and renewal of Professional Identification Card (PIC).',
    processingFee: 450.0, // Renewal: ₱450 (baccalaureate) / Initial Registration: ₱1,050
    processingDays: 1,
    counterReadyTips: [
      'Mag-book ng appointment online sa online.prc.gov.ph bago pumunta sa PRC Service Center.',
      'Libre ang pag-book ng slot sa LERIS; mag-ingat sa mga fixer na naniningil ng appointment fee.',
      'Magdala ng printed oath form (Panunumpa ng Propesyonal) at 2 passport-size photos sa formal attire.',
    ],
    requirements: [
      {
        name: 'Printed PRC LERIS Application Form & Appointment Slip',
        description: 'Official confirmation mula sa LERIS portal.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Panunumpa ng Propesyonal (Oath Form)',
        description: 'Nilagdaang kopya para sa initial registration.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Dalawang (2) Passport-Size Pictures',
        description: 'May puting background, may buong name tag, at nakasuot ng may kwelyo/formal attire.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Dalawang (2) Documentary Stamps',
        description: 'Opisyal na selyo para sa registration paper.',
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://online.prc.gov.ph',
    hotline: '(02) 8735-1534',
    email: 'prc.recordsmanagement@gmail.com',
  },

  LTO_STUDENT_PERMIT: {
    code: 'LTO_STUDENT_PERMIT',
    agencyCode: 'LTO',
    agencyName: 'Land Transportation Office',
    name: 'LTO Student Driver’s Permit Issuance',
    description:
      'Issuance of official authority to learn and operate motor vehicles in the Philippines accompanied by a licensed driver.',
    processingFee: 250.0, // ₱100 Application + ₱150 Student Permit + ~₱450-₱600 Clinic Medical Exam
    processingDays: 1,
    counterReadyTips: [
      'Kailangang tapusin muna ang 15-Hour Theoretical Driving Course (TDC) mula sa LTO-accredited driving school.',
      'Magparehistro sa LTMS portal (portal.lto.gov.ph) bago pumunta sa LTO District Office.',
      'Tiyaking naipasa ng accredited clinic ang iyong Medical Certificate nang direkta sa LTMS system.',
    ],
    requirements: [
      {
        name: 'Theoretical Driving Course (TDC) Certificate of Completion',
        description: 'Electronically transmitted mula sa accredited driving school.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'LTO Medical Certificate',
        description: 'Electronically transmitted mula sa LTO-accredited medical clinic.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'PSA Birth Certificate (SECPA)',
        description: 'Orihinal at photocopy; dapat hindi bababa sa 16 taong gulang ang aplikante.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Parent’s / Guardian’s Consent with Valid ID',
        description: 'Kailangan para sa mga aplikanteng may edad 16 hanggang 17 taong gulang.',
        required: true,
        appliesTo: 'minor',
      },
    ],
    officialPortal: 'https://portal.lto.gov.ph',
    hotline: '(02) 8922-9061 to 66',
    email: 'clientcare@lto.gov.ph',
  },

  DSWD_AICS: {
    code: 'DSWD_AICS',
    agencyCode: 'DSWD',
    agencyName: 'Department of Social Welfare and Development',
    name: 'Assistance to Individuals in Crisis Situation (AICS)',
    description:
      'Social safety net and financial assistance for medical, burial, educational, transportation, and emergency food crisis needs.',
    processingFee: 0.0,
    processingDays: 1, // 1-3 days depending on social worker interview & assessment
    counterReadyTips: [
      'Ang AICS assistance ay 100% LIBRE. Walang processing fee at bawal ang fixer.',
      'Ang halaga ng ayuda ay nakabatay sa pagsusuri ng Social Worker at may-katuturang dokumento (hospital bill, reseta, etc.).',
      'Tiyaking may Certificate of Indigency mula sa Barangay ng tirahan.',
    ],
    requirements: [
      {
        name: 'Barangay Certificate of Indigency',
        description: 'Orihinal na kopya na nagsasaad ng layunin (financial/medical assistance).',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Isang (1) Valid Government ID ng Benepisyaryo at Kinatawan',
        description: 'PhilSys National ID, Voter’s Certificate, Postal ID, o Senior ID.',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Katibayan ng Pangangailangan (Hospital Bill / Prescription / Funeral Contract)',
        description: 'Orihinal at certified true copy ng reseta, bill ng ospital, o death certificate.',
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://aics.dswd.gov.ph',
    hotline: '(02) 8931-8101 to 07 loc. 10141',
    email: 'aics@dswd.gov.ph',
  },

  NATIONAL_ID: {
    code: 'NATIONAL_ID',
    agencyCode: 'PSA',
    agencyName: 'Philippine Statistics Authority (PhilSys)',
    name: 'Philippine Identification System (PhilSys Digital National ID / ePhilID)',
    description:
      'Official single identification platform for all citizens and resident aliens under Republic Act 11055.',
    processingFee: 0.0,
    processingDays: 1, // Instant digital access via national-id.gov.ph
    counterReadyTips: [
      'Ang Digital National ID ay may parehong legal na bisa at kapangyarihan tulad ng physical PhilID card.',
      'I-access ang digital ID sa national-id.gov.ph gamit ang facial recognition.',
      'Huwag i-post ang iyong National ID QR code o PhilSys Card Number (PCN) sa social media.',
    ],
    requirements: [
      {
        name: 'PhilSys Transaction Slip o Demographic Details',
        description: 'Buong pangalan, petsa ng kapanganakan, at registered mobile number.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Facial Verification (Online / Center)',
        description: 'Liveness check sa opisyal na portal o registration center.',
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://national-id.gov.ph',
    hotline: '1388 / (02) 8234-2228',
    email: 'info@philsys.gov.ph',
  },

  PWD_ID: {
    code: 'PWD_ID',
    agencyCode: 'NCDA',
    agencyName: 'National Council on Disability Affairs / Local Government PDAO',
    name: 'Persons with Disability (PWD) Identification Card Issuance',
    description:
      'Issuance of official PWD ID by city or municipal Persons with Disability Affairs Office (PDAO) granting 20% discounts and VAT exemption under RA 10754.',
    processingFee: 0.0,
    processingDays: 3,
    counterReadyTips: [
      'Ang PWD ID ay ibinibigay ng inyong City/Municipal PDAO o Social Welfare Office, hindi ng pambansang opisina.',
      'Kumuha ng Medical Certificate mula sa lisensyadong doktor na nagsasaad ng uri ng kapansanan.',
      'Maghanda ng 2 kopya ng 1x1 ID photo.',
    ],
    requirements: [
      {
        name: 'Accomplished PWD ID Application Form',
        description: 'Mula sa local PDAO / MSWDO office.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Medical Certificate indicating Apparent/Non-Apparent Disability',
        description: 'Nilagdaan ng lisensyadong manggagamot na may PRC License Number.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Barangay Certificate of Residency',
        description: 'Patunay ng paninirahan sa lungsod o munisipalidad.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Dalawang (2) pirasong 1x1 ID Picture',
        description: 'Kamakailang larawan ng aplikante.',
        required: true,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://ncda.gov.ph',
    hotline: '(02) 8951-6033',
    email: 'council@ncda.gov.ph',
  },

  PSA_HELPLINE: {
    code: 'PSA_HELPLINE',
    agencyCode: 'PSA_HELPLINE',
    agencyName: 'PSAHelpline.ph (Philippine Statistics Authority Authorized Delivery)',
    name: 'PSAHelpline Online Ordering & Nationwide Doorstep Delivery',
    description:
      'Official authorized online ordering service for PSA Birth, Marriage, Death Certificates, and CENOMAR delivered directly to your doorstep nationwide.',
    processingFee: 365.0, // ₱365 for Birth/Marriage/Death, ₱420 for CENOMAR (inclusive of delivery)
    convenienceFee: 0.0,
    processingDays: 3, // 1-3 days Metro Manila, 3-8 days Provincial
    counterReadyTips: [
      'Mag-order online 24/7 sa https://psahelpline.ph nang walang pila o pagliban sa trabaho.',
      'Maghanda ng 1 Valid Government ID na ipapakita sa courier pagdating ng delivery.',
      'Kung kinatawan ang tatanggap, kumpletuhin ang online Letter of Authorization (LOA) sa portal.',
      'I-track ang delivery gamit ang 10-digit Order Reference Number sa https://orders.psahelpline.ph/check-status.',
    ],
    requirements: [
      {
        name: 'Isang (1) Valid Government-Issued Photo ID (Orihinal)',
        description: 'PhilSys National ID, DFA Passport, Driver’s License, UMID, PRC ID, o Postal ID (ipapakita sa courier).',
        isPrimaryId: true,
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Online Order Confirmation & 10-digit Reference Number',
        description: 'Nakuha matapos mag-fill out ng order sa psahelpline.ph',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Online Letter of Authorization (LOA) ng May-ari',
        description: 'Kailangan kung hindi ang may-ari o magulang ang tatanggap ng delivery mula sa courier.',
        required: true,
        appliesTo: 'representative',
      },
      {
        name: 'Kopya ng Valid ID ng May-ari ng Dokumento',
        description: 'Malinaw na kopya ng ID ng may-ari na ibibigay kasama ng LOA sa courier.',
        required: true,
        appliesTo: 'representative',
      },
    ],
    officialPortal: 'https://psahelpline.ph',
    hotline: '(02) 8737-1111',
    email: 'help@psahelpline.ph',
  },

  DPWH_PROJECTS: {
    code: 'DPWH_PROJECTS',
    agencyCode: 'DPWH',
    agencyName: 'Department of Public Works and Highways',
    name: 'DPWH Nationwide Infrastructure Tracker & Citizen Watch',
    description:
      'Public transparency portal for monitoring active nationwide infrastructure projects (bridges, expressways, flood control, tunnels, hospitals) and submitting citizen field observations.',
    processingFee: 0.0,
    processingDays: 3,
    counterReadyTips: [
      'Gamitin ang Contract ID (hal. 24O00012) o pangalan ng proyekto sa pag-check ng progreso at badyet.',
      'Libre (₱0.00) ang pag-uulat ng citizen observation o request for inspection sa DPWH 165-02 hotline.',
      'Maglakip ng eksaktong lokasyon o barangay kapag nagpapadala ng Citizen Infrastructure Watch report.',
    ],
    requirements: [
      {
        name: 'Project Contract ID o Pangalan ng Proyekto',
        description: 'Makikita sa project billboard sa lugar ng konstruksyon o sa DPWH Nationwide Tracker.',
        required: true,
        appliesTo: 'all',
      },
      {
        name: 'Valid Contact Details (Email o Mobile Number)',
        description: 'Para sa opisyal na feedback at status update mula sa DPWH Regional / District Engineering Office.',
        required: false,
        appliesTo: 'all',
      },
    ],
    officialPortal: 'https://www.dpwh.gov.ph',
    hotline: '165-02 / (02) 5304-3000',
    email: 'citizens_feedback@dpwh.gov.ph',
  },
};

const SERVICE_ALIASES: Record<string, string> = {
  NBI: 'NBI_CLEARANCE',
  CLEARANCE: 'NBI_CLEARANCE',
  BIRTH: 'PSA_BIRTH_CERT',
  BIRTH_CERT: 'PSA_BIRTH_CERT',
  SECPA: 'PSA_BIRTH_CERT',
  MARRIAGE: 'PSA_MARRIAGE_CERT',
  MARRIAGE_CERT: 'PSA_MARRIAGE_CERT',
  CENOMAR: 'PSA_CENOMAR',
  SINGLENESS: 'PSA_CENOMAR',
  PHILHEALTH: 'PHILHEALTH_REGISTRATION',
  PMRF: 'PHILHEALTH_REGISTRATION',
  SSS: 'SSS_REGISTRATION',
  SSN: 'SSS_REGISTRATION',
  PAGIBIG: 'PAGIBIG_MEMBERSHIP',
  HDMF: 'PAGIBIG_MEMBERSHIP',
  PASSPORT: 'DFA_PASSPORT',
  DFA: 'DFA_PASSPORT',
  BNRS: 'DTI_BUSINESS_NAME',
  DTI: 'DTI_BUSINESS_NAME',
  TIN: 'BIR_TIN',
  BIR: 'BIR_TIN',
  ORUS: 'BIR_TIN',
  PRC: 'PRC_LERIS',
  LERIS: 'PRC_LERIS',
  LTO: 'LTO_STUDENT_PERMIT',
  STUDENT_PERMIT: 'LTO_STUDENT_PERMIT',
  AICS: 'DSWD_AICS',
  DSWD: 'DSWD_AICS',
  PHILSYS: 'NATIONAL_ID',
  NATIONAL_ID: 'NATIONAL_ID',
  EPHILID: 'NATIONAL_ID',
  PWD: 'PWD_ID',
  NCDA: 'PWD_ID',
  PDAO: 'PWD_ID',
  DPWH: 'DPWH_PROJECTS',
  INFRASTRUCTURE: 'DPWH_PROJECTS',
  BUILD_BETTER_MORE: 'DPWH_PROJECTS',
};

export function getServiceByCode(code: string): ServiceDefinition | null {
  const normalized = code.toUpperCase().trim().replace(/[-\s]/g, '_');
  if (SERVICES_REGISTRY[normalized]) {
    return SERVICES_REGISTRY[normalized];
  }
  const aliased = SERVICE_ALIASES[normalized];
  if (aliased && SERVICES_REGISTRY[aliased]) {
    return SERVICES_REGISTRY[aliased];
  }
  return null;
}

export function listAllServices(): ServiceDefinition[] {
  return Object.values(SERVICES_REGISTRY);
}
