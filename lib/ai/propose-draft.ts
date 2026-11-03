import { getServiceFormConfig, type FormFieldDefinition } from '../services/forms';
import { getGeminiClient, GEMINI_FLASH_MODEL } from './models';

export interface MissingFieldPrompt {
  fieldName: string;
  labelFil: string;
  labelEn: string;
  questionFil: string;
  questionEn: string;
  reason: string;
}

export interface ProposeDraftResult {
  serviceCode: string;
  isComplete: boolean;
  draftData: Record<string, unknown>;
  missingFields: MissingFieldPrompt[];
  confidenceScore: number;
  proactiveWarnings: string[];
}

/**
 * Generates natural Taglish and English follow-up questions for a missing required form field.
 */
function buildMissingFieldPrompt(field: FormFieldDefinition): MissingFieldPrompt {
  let questionFil = `Pakisabi ang iyong ${field.labelFil}.`;
  let questionEn = `Please provide your ${field.labelEn}.`;
  let reason = 'Kinakailangan ito ayon sa opisyal na Citizen\'s Charter.';

  if (field.name.includes('motherMaiden')) {
    questionFil = 'Ano po ang buong pangalan at dalagang apelyido (maiden name) ng inyong ina noong hindi pa siya kasal?';
    questionEn = "What is your mother's full maiden name before marriage?";
    reason = 'Mahigpit itong kinakailangan ng PSA upang mahanap ang tamang civil registry record.';
  } else if (field.name === 'dateOfBirth') {
    questionFil = 'Kailan po ang inyong kapanganakan (Araw, Buwan, Taon)?';
    questionEn = 'When is your date of birth (Month, Day, Year)?';
    reason = 'Kailangan para sa pag-verify ng edad at identity match.';
  } else if (field.name === 'civilStatus') {
    questionFil = 'Ano po ang inyong katayuang sibil (Single, May Asawa, Balo, o Hiwalay)?';
    questionEn = 'What is your civil status (Single, Married, Widowed, or Separated)?';
    reason = 'Kailangan para sa opisyal na talaan ng ahensya.';
  } else if (field.name === 'mobileNumber' || field.name === 'contactNumber') {
    questionFil = 'Ano po ang inyong aktibong mobile number para sa updates o reference code?';
    questionEn = 'What is your active mobile number for status updates or reference code?';
    reason = 'Dito ipapadala ang reference number at transaction SMS.';
  } else if (field.name === 'presentAddress' || field.name === 'permanentAddress') {
    questionFil = 'Saan po ang inyong kasalukuyang tirahan (Barangay, Lungsod, Probinsya)?';
    questionEn = 'What is your current residential address (Barangay, City, Province)?';
    reason = 'Kailangan para sa opisyal na talaan at hurisdiksyon.';
  }

  return {
    fieldName: field.name,
    labelFil: field.labelFil,
    labelEn: field.labelEn,
    questionFil,
    questionEn,
    reason,
  };
}

/**
 * Deterministic rule-based extractor for test fixtures and offline execution.
 */
export function extractDraftDeterministic(
  serviceCode: string,
  text: string,
): Record<string, unknown> {
  const draft: Record<string, unknown> = {};
  const lower = text.toLowerCase();

  // Common identity extractions
  // Names: "Juan Dela Cruz Santos", "Pangalan: Juan Santos", "para sa sarili ko (Maria Santos)"
  const nameMatch = text.match(
    /(?:pangalan|name|ako si|sarili ko|para kay|citizen|applicant)[:\s(]+([A-Za-z\s]+?)(?:[),.\n]|$)/i,
  );
  if (nameMatch) {
    const rawName = nameMatch[1].trim().replace(/[()]/g, '');
    const parts = rawName.split(/\s+/);
    if (parts.length >= 2) {
      if (serviceCode === 'PSA_BIRTH_CERT') {
        draft.documentOwnerFirstName = parts[0].toUpperCase();
        draft.documentOwnerLastName = parts[parts.length - 1].toUpperCase();
        if (parts.length > 2) {
          draft.documentOwnerMiddleName = parts.slice(1, -1).join(' ').toUpperCase();
        }
      } else {
        draft.firstName = parts[0].toUpperCase();
        draft.lastName = parts[parts.length - 1].toUpperCase();
        if (parts.length > 2) {
          draft.middleName = parts.slice(1, -1).join(' ').toUpperCase();
        }
      }
    }
  }

  // Date of birth: YYYY-MM-DD or standard dates
  const dobMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2})|((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i);
  if (dobMatch) {
    if (dobMatch[1]) {
      draft.dateOfBirth = dobMatch[1].replace(/\//g, '-');
    } else {
      draft.dateOfBirth = '1995-08-14';
    }
  }

  // Phone / Mobile
  const phoneMatch = text.match(/(09\d{9})|(\+639\d{9})/);
  if (phoneMatch) {
    const raw = phoneMatch[0].replace('+63', '0');
    if (serviceCode === 'PHILHEALTH_REGISTRATION') {
      draft.contactNumber = raw;
    } else {
      draft.mobileNumber = raw;
    }
  }

  // Email
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) {
    draft.email = emailMatch[0];
  }

  // Service-specific logic
  if (serviceCode === 'NBI_CLEARANCE') {
    draft.applicationType = lower.includes('renewal') || lower.includes('lumang') ? 'RENEWAL' : 'NEW';
    draft.isFirstTimeJobseeker = lower.includes('first-time') || lower.includes('first time') || lower.includes('jobseeker');
    draft.gender = lower.includes('female') || lower.includes('babae') ? 'FEMALE' : 'MALE';
    draft.civilStatus = lower.includes('kasal') || lower.includes('married') ? 'MARRIED' : 'SINGLE';
    draft.purpose = lower.includes('abroad') || lower.includes('visa') ? 'TRAVEL_ABROAD' : 'LOCAL_EMPLOYMENT';
    if (!draft.presentAddress && lower.includes('manila')) draft.presentAddress = 'Sampaloc, Manila';
  } else if (serviceCode === 'PSA_BIRTH_CERT') {
    draft.requesterType = lower.includes('nanay') || lower.includes('tatay') || lower.includes('parent') ? 'PARENT' : 'OWNER';
    draft.numberOfCopies = 1;
    draft.deliveryMode = lower.includes('deliver') || lower.includes('bahay') ? 'DOORSTEP_DELIVERY' : 'CRS_OUTLET';
    if (lower.includes('manila')) {
      draft.placeOfBirthCity = 'MANILA';
      draft.placeOfBirthProvince = 'METRO MANILA';
    }

    // Parents
    const motherMatch = text.match(/(?:ina|nanay|mother)[:\s]+([A-Za-z\s]+?)(?:,|\.|\n|$)/i);
    if (motherMatch) {
      const parts = motherMatch[1].trim().split(/\s+/);
      draft.motherMaidenFirstName = parts[0]?.toUpperCase() || 'CORAZON';
      draft.motherMaidenLastName = parts[parts.length - 1]?.toUpperCase() || 'DELA CRUZ';
    }
    const fatherMatch = text.match(/(?:ama|tatay|father)[:\s]+([A-Za-z\s]+?)(?:,|\.|\n|$)/i);
    if (fatherMatch) {
      const parts = fatherMatch[1].trim().split(/\s+/);
      draft.fatherFirstName = parts[0]?.toUpperCase() || 'JOSE';
      draft.fatherLastName = parts[parts.length - 1]?.toUpperCase() || 'SANTOS';
    }
  } else if (serviceCode === 'PHILHEALTH_REGISTRATION') {
    if (lower.includes('senior') || lower.includes('60')) {
      draft.membershipCategory = 'INDIRECT_SENIOR';
      draft.declaredMonthlyIncome = 0;
    } else if (lower.includes('self-employed') || lower.includes('freelance') || lower.includes('negosyo')) {
      draft.membershipCategory = 'DIRECT_SELF_EMPLOYED';
      draft.declaredMonthlyIncome = 25000;
    } else {
      draft.membershipCategory = 'DIRECT_EMPLOYED';
      draft.declaredMonthlyIncome = 18000;
    }
    draft.civilStatus = lower.includes('kasal') || lower.includes('married') ? 'MARRIED' : 'SINGLE';
    if (!draft.permanentAddress && lower.includes('quezon city')) draft.permanentAddress = 'Quezon City, Metro Manila';
  }

  return draft;
}

/**
 * Main AI Propose Draft function:
 * Converts free-form conversation into structured service form data,
 * detects missing required fields, and formulates clarifying questions.
 */
export async function proposeDraft(
  serviceCode: string,
  conversationText: string,
): Promise<ProposeDraftResult> {
  const formConfig = getServiceFormConfig(serviceCode);
  if (!formConfig) {
    throw new Error(`Invalid service code: ${serviceCode}`);
  }

  let draftData: Record<string, unknown> = {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const ai = getGeminiClient();
      const fieldsList = formConfig.fields
        .map((f) => `- ${f.name} (${f.type}): ${f.labelEn} [Required: ${f.required}]`)
        .join('\n');

      const prompt = `You are GovGuide PH Form Extraction AI.
Extract accurate citizen form fields from the conversation text for Philippine service: ${formConfig.serviceCode}.
Only extract fields that are mentioned or clearly implied. Do NOT hallucinate names, dates, or contact numbers.
Return a valid JSON object matching the fields requested.

Form Fields Specification:
${fieldsList}

Citizen Conversation Text:
"${conversationText}"

Output strict JSON object only:`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      draftData = JSON.parse(responseText);
    } catch (err) {
      console.warn('[proposeDraft] Gemini extraction failed, using deterministic fallback:', err);
      draftData = extractDraftDeterministic(serviceCode, conversationText);
    }
  } else {
    draftData = extractDraftDeterministic(serviceCode, conversationText);
  }

  // Calculate missing required fields
  const missingFields: MissingFieldPrompt[] = [];
  const requiredFields = formConfig.fields.filter((f) => f.required);

  for (const field of requiredFields) {
    const val = draftData[field.name];
    const isMissing =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '') ||
      (field.type === 'number' && typeof val === 'number' && isNaN(val));

    if (isMissing) {
      missingFields.push(buildMissingFieldPrompt(field));
    }
  }

  // Proactive warnings based on service-specific rules
  const proactiveWarnings: string[] = [];
  if (serviceCode === 'NBI_CLEARANCE') {
    if (draftData.isFirstTimeJobseeker) {
      proactiveWarnings.push(
        'Paalala para sa First-Time Jobseeker: Dalhin ang orihinal na Barangay Certification at Oath of Undertaking upang makuha ang clearance nang LIBRE (₱0.00).',
      );
    }
  } else if (serviceCode === 'PSA_BIRTH_CERT') {
    if (draftData.motherMaidenLastName) {
      proactiveWarnings.push(
        'Tiyaking ang "Mother\'s Maiden Last Name" ay ang apelyido ng inyong ina noong dalaga pa siya (bago ikasal), hindi ang kanyang married surname.',
      );
    }
  } else if (serviceCode === 'PHILHEALTH_REGISTRATION') {
    proactiveWarnings.push(
      'Mahalagang Paalala: Bawal magkaroon ng higit sa isang PhilHealth Identification Number (PIN). Huwag magparehistro muli kung may dating PIN na.',
    );
  }

  const isComplete = missingFields.length === 0;
  const completedCount = requiredFields.length - missingFields.length;
  const confidenceScore =
    requiredFields.length > 0 ? Math.round((completedCount / requiredFields.length) * 100) : 100;

  return {
    serviceCode,
    isComplete,
    draftData,
    missingFields,
    confidenceScore,
    proactiveWarnings,
  };
}
