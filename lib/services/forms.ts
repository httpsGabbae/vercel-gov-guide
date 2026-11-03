import { z } from 'zod';
import type { ApplicantProfile } from './charter-sources';

export type FormFieldType = 'text' | 'select' | 'date' | 'radio' | 'checkbox' | 'number';

export interface FormFieldDefinition {
  name: string;
  labelFil: string;
  labelEn: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; labelFil: string; labelEn: string }[];
  helperTextFil?: string;
  helperTextEn?: string;
  section: string;
  dependsOn?: { field: string; value: unknown };
}

export interface ServiceFormConfig {
  serviceCode: string;
  titleFil: string;
  titleEn: string;
  sections: string[];
  fields: FormFieldDefinition[];
  schema: z.ZodTypeAny;
}

/**
 * Validates real calendar date (YYYY-MM-DD), ensures year is between 1900 and current year,
 * and rejects dates in the future.
 */
export function isValidPhilippineDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return false;
  return true;
}

/**
 * Validates standard Philippine mobile numbers:
 * Starts with '09' (11 digits) or '+639' (13 digits).
 */
export function isValidPhilippineMobile(phoneStr: string): boolean {
  if (typeof phoneStr !== 'string') return false;
  const cleaned = phoneStr.replace(/[\s-]/g, '');
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

// -------------------------------------------------------------
// 1. NBI Clearance Form Configuration & Zod Schema
// -------------------------------------------------------------
export const nbiClearanceSchema = z.object({
  applicationType: z.enum(['NEW', 'RENEWAL'], {
    required_error: 'Pumili kung Bago o Renewal.',
  }),
  isFirstTimeJobseeker: z.boolean().default(false),
  firstName: z
    .string()
    .min(1, 'Kailangan ang Pangalan (First Name).')
    .max(60, 'Masyadong mahaba ang pangalan (max 60).'),
  middleName: z.string().max(60).default(''),
  lastName: z
    .string()
    .min(1, 'Kailangan ang Apelyido (Last Name).')
    .max(60, 'Masyadong mahaba ang apelyido (max 60).'),
  suffix: z.string().max(10).optional().default(''),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
    .refine(isValidPhilippineDate, {
      message: 'Wastong petsa ng kapanganakan ang kailangan (hindi maaaring nasa hinaharap o bago ang 1900).',
    }),
  gender: z.enum(['MALE', 'FEMALE'], { required_error: 'Pumili ng Kasarian.' }),
  civilStatus: z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED']),
  mobileNumber: z
    .string()
    .min(10, 'Ilagay ang 11-digit mobile number (e.g., 09171234567).')
    .refine(isValidPhilippineMobile, {
      message: 'Wastong 11-digit Philippine mobile number ang kailangan (nagsisimula sa 09 o +639).',
    }),
  email: z.string().email('Wastong email address ang kailangan.').max(100),
  presentAddress: z.string().min(5, 'Ilagay ang kasalukuyang tirahan.').max(200),
  purpose: z.enum(['LOCAL_EMPLOYMENT', 'TRAVEL_ABROAD', 'VISA', 'OTHER']),
  previousNbiId: z.string().max(30).optional().default(''),
});

export const NBI_CLEARANCE_FORM: ServiceFormConfig = {
  serviceCode: 'NBI_CLEARANCE',
  titleFil: 'Aplikasyon para sa NBI Clearance',
  titleEn: 'Application for NBI Clearance',
  sections: ['Uri ng Aplikasyon', 'Personal na Impormasyon', 'Tirahan at Kontak', 'Layunin'],
  fields: [
    {
      name: 'applicationType',
      labelFil: 'Uri ng Aplikasyon',
      labelEn: 'Application Type',
      type: 'radio',
      required: true,
      section: 'Uri ng Aplikasyon',
      options: [
        { value: 'NEW', labelFil: 'Bagong Aplikasyon (New)', labelEn: 'New Application' },
        { value: 'RENEWAL', labelFil: 'Pagpapanibago (Renewal)', labelEn: 'Renewal' },
      ],
    },
    {
      name: 'isFirstTimeJobseeker',
      labelFil: 'First-Time Jobseeker ba (RA 11261)?',
      labelEn: 'Are you a First-Time Jobseeker (RA 11261)?',
      type: 'checkbox',
      required: false,
      section: 'Uri ng Aplikasyon',
      helperTextFil: 'May libreng 1 kopya kung may Barangay Certificate ng First-Time Jobseeker.',
      helperTextEn: 'Entitled to 1 free clearance certificate with valid Barangay Certificate.',
    },
    {
      name: 'firstName',
      labelFil: 'Pangalan (First Name)',
      labelEn: 'First Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. JUAN',
      section: 'Personal na Impormasyon',
    },
    {
      name: 'middleName',
      labelFil: 'Gitnang Pangalan (Middle Name)',
      labelEn: 'Middle Name',
      type: 'text',
      required: false,
      placeholder: 'e.g. DELA CRUZ (o iwanang blangko kung wala)',
      section: 'Personal na Impormasyon',
    },
    {
      name: 'lastName',
      labelFil: 'Apelyido (Last Name)',
      labelEn: 'Last Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. SANTOS',
      section: 'Personal na Impormasyon',
    },
    {
      name: 'suffix',
      labelFil: 'Suffix',
      labelEn: 'Suffix',
      type: 'select',
      required: false,
      section: 'Personal na Impormasyon',
      options: [
        { value: '', labelFil: 'Wala / None', labelEn: 'None' },
        { value: 'JR', labelFil: 'JR.', labelEn: 'JR.' },
        { value: 'SR', labelFil: 'SR.', labelEn: 'SR.' },
        { value: 'II', labelFil: 'II', labelEn: 'II' },
        { value: 'III', labelFil: 'III', labelEn: 'III' },
        { value: 'IV', labelFil: 'IV', labelEn: 'IV' },
      ],
    },
    {
      name: 'dateOfBirth',
      labelFil: 'Araw ng Kapanganakan (Birth Date)',
      labelEn: 'Date of Birth',
      type: 'date',
      required: true,
      section: 'Personal na Impormasyon',
    },
    {
      name: 'gender',
      labelFil: 'Kasarian (Gender)',
      labelEn: 'Gender',
      type: 'select',
      required: true,
      section: 'Personal na Impormasyon',
      options: [
        { value: 'MALE', labelFil: 'Lalaki (Male)', labelEn: 'Male' },
        { value: 'FEMALE', labelFil: 'Babae (Female)', labelEn: 'Female' },
      ],
    },
    {
      name: 'civilStatus',
      labelFil: 'Katayuang Sibil (Civil Status)',
      labelEn: 'Civil Status',
      type: 'select',
      required: true,
      section: 'Personal na Impormasyon',
      options: [
        { value: 'SINGLE', labelFil: 'Walang Asawa (Single)', labelEn: 'Single' },
        { value: 'MARRIED', labelFil: 'May Asawa (Married)', labelEn: 'Married' },
        { value: 'WIDOWED', labelFil: 'Balo (Widowed)', labelEn: 'Widowed' },
        { value: 'SEPARATED', labelFil: 'Hiwalay (Separated)', labelEn: 'Separated' },
      ],
    },
    {
      name: 'mobileNumber',
      labelFil: 'Mobile Number',
      labelEn: 'Mobile Number',
      type: 'text',
      required: true,
      placeholder: '0917XXXXXXX',
      section: 'Tirahan at Kontak',
    },
    {
      name: 'email',
      labelFil: 'Email Address',
      labelEn: 'Email Address',
      type: 'text',
      required: true,
      placeholder: 'juan@example.com',
      section: 'Tirahan at Kontak',
    },
    {
      name: 'presentAddress',
      labelFil: 'Kasalukuyang Tirahan (Address)',
      labelEn: 'Present Address',
      type: 'text',
      required: true,
      placeholder: 'House No., Street, Brgy, City, Province',
      section: 'Tirahan at Kontak',
    },
    {
      name: 'purpose',
      labelFil: 'Layunin ng Pagkuha (Purpose)',
      labelEn: 'Purpose of Clearance',
      type: 'select',
      required: true,
      section: 'Layunin',
      options: [
        { value: 'LOCAL_EMPLOYMENT', labelFil: 'Trabaho sa Pilipinas (Local Employment)', labelEn: 'Local Employment' },
        { value: 'TRAVEL_ABROAD', labelFil: 'Biyahe sa Ibang Bansa (Travel Abroad)', labelEn: 'Travel Abroad' },
        { value: 'VISA', labelFil: 'Aplikasyon sa Visa', labelEn: 'Visa Application' },
        { value: 'OTHER', labelFil: 'Iba Pa (Other Legal Purpose)', labelEn: 'Other' },
      ],
    },
  ],
  schema: nbiClearanceSchema,
};

// -------------------------------------------------------------
// 2. PSA Birth Certificate Form Configuration & Zod Schema
// -------------------------------------------------------------
export const psaBirthCertSchema = z
  .object({
    requesterType: z.enum(
      ['OWNER', 'PARENT', 'SPOUSE', 'DIRECT_DESCENDANT', 'AUTHORIZED_REPRESENTATIVE'],
      { required_error: 'Pumili ng relasyon sa may-ari ng dokumento.' },
    ),
    numberOfCopies: z.coerce
      .number()
      .min(1, 'Minimum 1 kopya ang kailangan.')
      .max(10, 'Maximum 10 kopya lamang bawat transaksyon.')
      .default(1),
    documentOwnerFirstName: z
      .string()
      .min(1, 'Pangalan ng May-ari ng Dokumento.')
      .max(60, 'Masyadong mahaba ang pangalan (max 60).'),
    documentOwnerMiddleName: z.string().max(60).default(''),
    documentOwnerLastName: z
      .string()
      .min(1, 'Apelyido ng May-ari ng Dokumento.')
      .max(60, 'Masyadong mahaba ang apelyido (max 60).'),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
      .refine(isValidPhilippineDate, {
        message: 'Wastong petsa ng kapanganakan ang kailangan (hindi maaaring nasa hinaharap o bago ang 1900).',
      }),
    placeOfBirthCity: z
      .string()
      .min(1, 'Lungsod/Munisipyo kung saan ipinanganak.')
      .max(80),
    placeOfBirthProvince: z.string().min(1, 'Lalawigan/Probinsya.').max(80),
    fatherFirstName: z.string().min(1, 'Pangalan ng Ama.').max(60),
    fatherLastName: z.string().min(1, 'Apelyido ng Ama.').max(60),
    motherMaidenFirstName: z.string().min(1, 'Pangalan ng Ina.').max(60),
    motherMaidenLastName: z
      .string()
      .min(1, 'Dalagang Apelyido ng Ina (Maiden Last Name).')
      .max(60),
    deliveryMode: z.enum(['CRS_OUTLET', 'DOORSTEP_DELIVERY']),
    deliveryAddress: z.string().max(200).optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMode === 'DOORSTEP_DELIVERY') {
      if (!data.deliveryAddress || data.deliveryAddress.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryAddress'],
          message: 'Kailangan ang kumpletong delivery address para sa Doorstep Delivery (bahay o opisina).',
        });
      }
    }
  });

export const PSA_BIRTH_CERT_FORM: ServiceFormConfig = {
  serviceCode: 'PSA_BIRTH_CERT',
  titleFil: 'Kahilingan para sa PSA Birth Certificate (SECPA)',
  titleEn: 'Request for PSA Birth Certificate (SECPA)',
  sections: ['Relasyon ng Humihiling', 'Detalye ng May-Ari', 'Detalye ng Magulang', 'Paraan ng Pagkuha'],
  fields: [
    {
      name: 'requesterType',
      labelFil: 'Relasyon sa May-Ari ng Dokumento',
      labelEn: 'Relationship to Document Owner',
      type: 'select',
      required: true,
      section: 'Relasyon ng Humihiling',
      options: [
        { value: 'OWNER', labelFil: 'Ako ang May-ari (Self / 18+ y/o)', labelEn: 'Document Owner (Self)' },
        { value: 'PARENT', labelFil: 'Magulang (Mother / Father)', labelEn: 'Parent' },
        { value: 'SPOUSE', labelFil: 'Asawa (Spouse)', labelEn: 'Spouse' },
        { value: 'DIRECT_DESCENDANT', labelFil: 'Anak (Child of legal age)', labelEn: 'Direct Descendant' },
        { value: 'AUTHORIZED_REPRESENTATIVE', labelFil: 'Awtorisadong Kinatawan (with SPA)', labelEn: 'Authorized Representative' },
      ],
    },
    {
      name: 'numberOfCopies',
      labelFil: 'Bilang ng Kopya (Copies)',
      labelEn: 'Number of Copies',
      type: 'number',
      required: true,
      section: 'Relasyon ng Humihiling',
      placeholder: '1',
    },
    {
      name: 'documentOwnerFirstName',
      labelFil: 'Pangalan ng May-Ari (First Name)',
      labelEn: "Owner's First Name",
      type: 'text',
      required: true,
      section: 'Detalye ng May-Ari',
      placeholder: 'e.g. MARIA',
    },
    {
      name: 'documentOwnerMiddleName',
      labelFil: 'Gitnang Pangalan (Middle Name)',
      labelEn: "Owner's Middle Name",
      type: 'text',
      required: false,
      section: 'Detalye ng May-Ari',
      placeholder: 'e.g. DELA CRUZ',
    },
    {
      name: 'documentOwnerLastName',
      labelFil: 'Apelyido (Last Name)',
      labelEn: "Owner's Last Name",
      type: 'text',
      required: true,
      section: 'Detalye ng May-Ari',
      placeholder: 'e.g. SANTOS',
    },
    {
      name: 'dateOfBirth',
      labelFil: 'Petsa ng Kapanganakan',
      labelEn: 'Date of Birth',
      type: 'date',
      required: true,
      section: 'Detalye ng May-Ari',
    },
    {
      name: 'placeOfBirthCity',
      labelFil: 'Lungsod / Munisipyo ng Kapanganakan',
      labelEn: 'City / Municipality of Birth',
      type: 'text',
      required: true,
      section: 'Detalye ng May-Ari',
      placeholder: 'e.g. MANILA',
    },
    {
      name: 'placeOfBirthProvince',
      labelFil: 'Lalawigan (Province)',
      labelEn: 'Province of Birth',
      type: 'text',
      required: true,
      section: 'Detalye ng May-Ari',
      placeholder: 'e.g. METRO MANILA',
    },
    {
      name: 'fatherFirstName',
      labelFil: 'Pangalan ng Ama (Father First Name)',
      labelEn: "Father's First Name",
      type: 'text',
      required: true,
      section: 'Detalye ng Magulang',
      placeholder: 'e.g. JOSE',
    },
    {
      name: 'fatherLastName',
      labelFil: 'Apelyido ng Ama (Father Last Name)',
      labelEn: "Father's Last Name",
      type: 'text',
      required: true,
      section: 'Detalye ng Magulang',
      placeholder: 'e.g. SANTOS',
    },
    {
      name: 'motherMaidenFirstName',
      labelFil: 'Pangalan ng Ina (Mother First Name)',
      labelEn: "Mother's First Name",
      type: 'text',
      required: true,
      section: 'Detalye ng Magulang',
      placeholder: 'e.g. CORAZON',
    },
    {
      name: 'motherMaidenLastName',
      labelFil: 'Dalagang Apelyido ng Ina (Mother Maiden Last Name)',
      labelEn: "Mother's Maiden Last Name",
      type: 'text',
      required: true,
      section: 'Detalye ng Magulang',
      placeholder: 'e.g. DELA CRUZ',
      helperTextFil: 'Gamitin ang apelyido ng ina noong dalaga pa siya (bago ikasal).',
    },
    {
      name: 'deliveryMode',
      labelFil: 'Paraan ng Pagkuha (Delivery Mode)',
      labelEn: 'Delivery / Release Mode',
      type: 'select',
      required: true,
      section: 'Paraan ng Pagkuha',
      options: [
        { value: 'CRS_OUTLET', labelFil: 'Personal sa PSA CRS Outlet (₱155/kopya)', labelEn: 'Walk-in at PSA CRS Outlet (₱155/copy)' },
        { value: 'DOORSTEP_DELIVERY', labelFil: 'Door-to-Door Delivery (₱330 - ₱365)', labelEn: 'Doorstep Courier Delivery (₱330 - ₱365)' },
      ],
    },
  ],
  schema: psaBirthCertSchema,
};

// -------------------------------------------------------------
// 3. PhilHealth Registration Form Configuration & Zod Schema
// -------------------------------------------------------------
export const philHealthRegistrationSchema = z
  .object({
    membershipCategory: z.enum(
      [
        'DIRECT_EMPLOYED',
        'DIRECT_SELF_EMPLOYED',
        'DIRECT_OFW',
        'INDIRECT_SENIOR',
        'INDIRECT_INDIGENT',
      ],
      { required_error: 'Pumili ng kategorya ng membership.' },
    ),
    firstName: z
      .string()
      .min(1, 'Kailangan ang Pangalan.')
      .max(60, 'Masyadong mahaba ang pangalan (max 60).'),
    middleName: z.string().max(60).default(''),
    lastName: z
      .string()
      .min(1, 'Kailangan ang Apelyido.')
      .max(60, 'Masyadong mahaba ang apelyido (max 60).'),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
      .refine(isValidPhilippineDate, {
        message: 'Wastong petsa ng kapanganakan ang kailangan (hindi maaaring nasa hinaharap o bago ang 1900).',
      }),
    civilStatus: z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED']),
    declaredMonthlyIncome: z.coerce
      .number()
      .min(0, 'Hindi maaaring negatibo ang kita.')
      .max(5000000, 'Masyadong mataas ang buwanang kita.')
      .default(10000),
    hasDependents: z.boolean().default(false),
    dependentNames: z.string().max(300).optional().default(''),
    contactNumber: z
      .string()
      .min(10, 'Ilagay ang wastong contact number.')
      .refine(isValidPhilippineMobile, {
        message: 'Wastong 11-digit Philippine mobile number ang kailangan (nagsisimula sa 09 o +639).',
      }),
    permanentAddress: z
      .string()
      .min(5, 'Ilagay ang permanenteng tirahan.')
      .max(200),
  })
  .superRefine((data, ctx) => {
    if (data.hasDependents) {
      if (!data.dependentNames || data.dependentNames.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dependentNames'],
          message: 'Pakisulat ang pangalan ng mga kuwalipikadong dependent (asawa o mga menor-de-edad na anak).',
        });
      }
    }
  });

export const PHILHEALTH_REGISTRATION_FORM: ServiceFormConfig = {
  serviceCode: 'PHILHEALTH_REGISTRATION',
  titleFil: 'Aplikasyon sa PhilHealth Membership & PIN/MDR',
  titleEn: 'PhilHealth Member Registration & PIN/MDR Application',
  sections: ['Kategorya ng Miyembro', 'Personal na Impormasyon', 'Kita at Trabaho', 'Tirahan at Kontak'],
  fields: [
    {
      name: 'membershipCategory',
      labelFil: 'Kategorya ng Membership',
      labelEn: 'Membership Category',
      type: 'select',
      required: true,
      section: 'Kategorya ng Miyembro',
      options: [
        { value: 'DIRECT_EMPLOYED', labelFil: 'May Trabaho / Empleyado (Formal Sector)', labelEn: 'Formally Employed' },
        { value: 'DIRECT_SELF_EMPLOYED', labelFil: 'Self-Employed / Freelancer / Negosyo', labelEn: 'Self-Employed / Freelancer' },
        { value: 'DIRECT_OFW', labelFil: 'Overseas Filipino Worker (OFW)', labelEn: 'OFW' },
        { value: 'INDIRECT_SENIOR', labelFil: 'Senior Citizen (60 y/o pataas - Libreng Subsidy)', labelEn: 'Senior Citizen (Subsidized)' },
        { value: 'INDIRECT_INDIGENT', labelFil: 'Indigent / 4Ps Beneficiary (Libreng Subsidy)', labelEn: 'Indigent (Subsidized)' },
      ],
    },
    {
      name: 'firstName',
      labelFil: 'Pangalan (First Name)',
      labelEn: 'First Name',
      type: 'text',
      required: true,
      section: 'Personal na Impormasyon',
      placeholder: 'e.g. JUAN',
    },
    {
      name: 'middleName',
      labelFil: 'Gitnang Pangalan (Middle Name)',
      labelEn: 'Middle Name',
      type: 'text',
      required: false,
      section: 'Personal na Impormasyon',
      placeholder: 'e.g. DELA CRUZ',
    },
    {
      name: 'lastName',
      labelFil: 'Apelyido (Last Name)',
      labelEn: 'Last Name',
      type: 'text',
      required: true,
      section: 'Personal na Impormasyon',
      placeholder: 'e.g. SANTOS',
    },
    {
      name: 'dateOfBirth',
      labelFil: 'Petsa ng Kapanganakan',
      labelEn: 'Date of Birth',
      type: 'date',
      required: true,
      section: 'Personal na Impormasyon',
    },
    {
      name: 'civilStatus',
      labelFil: 'Katayuang Sibil (Civil Status)',
      labelEn: 'Civil Status',
      type: 'select',
      required: true,
      section: 'Personal na Impormasyon',
      options: [
        { value: 'SINGLE', labelFil: 'Walang Asawa (Single)', labelEn: 'Single' },
        { value: 'MARRIED', labelFil: 'May Asawa (Married)', labelEn: 'Married' },
        { value: 'WIDOWED', labelFil: 'Balo (Widowed)', labelEn: 'Widowed' },
        { value: 'SEPARATED', labelFil: 'Hiwalay (Separated)', labelEn: 'Separated' },
      ],
    },
    {
      name: 'declaredMonthlyIncome',
      labelFil: 'Buwanang Kita (Monthly Income in ₱)',
      labelEn: 'Declared Monthly Income',
      type: 'number',
      required: false,
      section: 'Kita at Trabaho',
      placeholder: '15000',
      helperTextFil: 'Batayan para sa 5% regular premium share. Libre sa mga Senior Citizen at Indigent.',
    },
    {
      name: 'hasDependents',
      labelFil: 'May idedeklarang kuwalipikadong Dependent?',
      labelEn: 'Declaring Qualified Dependents?',
      type: 'checkbox',
      required: false,
      section: 'Personal na Impormasyon',
      helperTextFil: 'Asawang walang trabaho o mga menor-de-edad na anak (below 21).',
    },
    {
      name: 'contactNumber',
      labelFil: 'Mobile / Telephone Number',
      labelEn: 'Contact Number',
      type: 'text',
      required: true,
      section: 'Tirahan at Kontak',
      placeholder: '0917XXXXXXX',
    },
    {
      name: 'permanentAddress',
      labelFil: 'Permanenteng Tirahan (Address)',
      labelEn: 'Permanent Address',
      type: 'text',
      required: true,
      section: 'Tirahan at Kontak',
      placeholder: 'Brgy, City, Province',
    },
  ],
  schema: philHealthRegistrationSchema,
};

export const SERVICE_FORMS: Record<string, ServiceFormConfig> = {
  NBI_CLEARANCE: NBI_CLEARANCE_FORM,
  PSA_BIRTH_CERT: PSA_BIRTH_CERT_FORM,
  PHILHEALTH_REGISTRATION: PHILHEALTH_REGISTRATION_FORM,
};

export function getServiceFormConfig(serviceCode: string): ServiceFormConfig | null {
  const normalized = serviceCode.toUpperCase().trim();
  return SERVICE_FORMS[normalized] || null;
}

/**
 * Maps an existing citizen profile (ApplicantProfile) to default form field values
 * for the designated service without silent overwrite.
 */
export function mapApplicantProfileToForm(
  serviceCode: string,
  profile: Partial<ApplicantProfile>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const norm = serviceCode.toUpperCase();

  const nameParts = (profile.display_name || '').trim().split(/\s+/).filter(Boolean);
  const firstName =
    profile.first_name ||
    (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || '');
  const lastName =
    profile.last_name ||
    (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
  const middleName = profile.middle_name || '';
  const suffix = profile.suffix || '';
  const dob = profile.birth_date || '';
  const phone = profile.contact_number || profile.phone || '';
  const email = profile.email || '';
  const address =
    profile.residential_address || profile.street_address
      ? [
          profile.residential_address || profile.street_address,
          profile.barangay,
          profile.city,
          profile.province,
        ]
          .filter(Boolean)
          .join(', ')
      : [profile.barangay, profile.city, profile.province].filter(Boolean).join(', ');

  if (norm === 'NBI_CLEARANCE') {
    if (firstName) result.firstName = firstName.toUpperCase();
    if (lastName) result.lastName = lastName.toUpperCase();
    if (middleName) result.middleName = middleName.toUpperCase();
    if (suffix) result.suffix = suffix.toUpperCase();
    if (dob) result.dateOfBirth = dob;
    if (phone) result.mobileNumber = phone;
    if (email) result.email = email;
    if (address) result.presentAddress = address;
    if (profile.civil_status) {
      const cs = profile.civil_status.toUpperCase();
      if (['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED'].includes(cs)) {
        result.civilStatus = cs;
      }
    }
    if (profile.role === 'jobseeker') {
      result.isFirstTimeJobseeker = true;
    }
  } else if (norm === 'PSA_BIRTH_CERT') {
    result.requesterType = 'OWNER';
    result.numberOfCopies = 1;
    result.deliveryMode = 'DOORSTEP_DELIVERY';
    if (firstName) result.documentOwnerFirstName = firstName.toUpperCase();
    if (lastName) result.documentOwnerLastName = lastName.toUpperCase();
    if (middleName) result.documentOwnerMiddleName = middleName.toUpperCase();
    if (dob) result.dateOfBirth = dob;
    if (profile.place_of_birth || profile.city) {
      result.placeOfBirthCity = (profile.place_of_birth || profile.city || '').toUpperCase();
    }
    if (profile.province) result.placeOfBirthProvince = profile.province.toUpperCase();
    if (profile.father_first_name) result.fatherFirstName = profile.father_first_name.toUpperCase();
    if (profile.father_last_name) result.fatherLastName = profile.father_last_name.toUpperCase();
    if (profile.mother_first_name) {
      result.motherMaidenFirstName = profile.mother_first_name.toUpperCase();
    }
    if (profile.mother_last_name) {
      result.motherMaidenLastName = profile.mother_last_name.toUpperCase();
    }
    if (address) result.deliveryAddress = address;
  } else if (norm === 'PHILHEALTH_REGISTRATION') {
    result.membershipCategory = 'DIRECT_EMPLOYED';
    if (firstName) result.firstName = firstName.toUpperCase();
    if (lastName) result.lastName = lastName.toUpperCase();
    if (middleName) result.middleName = middleName.toUpperCase();
    if (dob) result.dateOfBirth = dob;
    if (phone) result.contactNumber = phone;
    if (address) result.permanentAddress = address;
    if (profile.civil_status) {
      const cs = profile.civil_status.toUpperCase();
      if (['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED'].includes(cs)) {
        result.civilStatus = cs;
      }
    }
  }

  return result;
}
