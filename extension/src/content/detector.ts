/**
 * GovGuide PH — Form Field Detection Engine
 * Specialized heuristic & Livewire/Alpine schema mapping for PSA, NBI, PhilHealth, DFA
 */

import type { CitizenVaultData, DetectedField, DetectionSummary, FieldKey } from '../types';

interface FieldRule {
  fieldKey: FieldKey;
  patterns: RegExp[];
  confidence: number;
}

// Explicit PSA Livewire 3 / Alpine.js model patterns (matching snapshot schema)
const LIVEWIRE_PSA_RULES: { modelPattern: RegExp; fieldKey: FieldKey; label: string }[] = [
  // Owner (Applicant whose birth certificate is requested)
  { modelPattern: /^owner(\.|\[)first/i, fieldKey: 'firstName', label: "Applicant's First Name" },
  { modelPattern: /^owner(\.|\[)middle/i, fieldKey: 'middleName', label: "Applicant's Middle Name" },
  { modelPattern: /^owner(\.|\[)last/i, fieldKey: 'lastName', label: "Applicant's Last Name" },
  { modelPattern: /^owner(\.|\[)suffix/i, fieldKey: 'suffix', label: "Applicant's Suffix" },
  { modelPattern: /^owner(\.|\[)sex/i, fieldKey: 'gender', label: "Applicant's Sex / Gender" },
  { modelPattern: /^owner(\.|\[)birthday/i, fieldKey: 'dateOfBirth', label: "Applicant's Date of Birth" },

  // Requester (Person submitting / ordering)
  { modelPattern: /^requester(\.|\[)first/i, fieldKey: 'firstName', label: "Requester First Name" },
  { modelPattern: /^requester(\.|\[)middle/i, fieldKey: 'middleName', label: "Requester Middle Name" },
  { modelPattern: /^requester(\.|\[)last/i, fieldKey: 'lastName', label: "Requester Last Name" },
  { modelPattern: /^requester(\.|\[)suffix/i, fieldKey: 'suffix', label: "Requester Suffix" },
  { modelPattern: /^requester(\.|\[)sex/i, fieldKey: 'gender', label: "Requester Sex / Gender" },
  { modelPattern: /^requester(\.|\[)birthday/i, fieldKey: 'dateOfBirth', label: "Requester Date of Birth" },
  { modelPattern: /^requester(\.|\[)mobile/i, fieldKey: 'mobileNumber', label: 'Requester Mobile Number' },
  { modelPattern: /^requester(\.|\[)email/i, fieldKey: 'emailAddress', label: 'Requester Email' },

  // Father (Certificate details)
  { modelPattern: /^father(\.|\[)first/i, fieldKey: 'fatherFirstName', label: "Father's First Name" },
  { modelPattern: /^father(\.|\[)middle/i, fieldKey: 'fatherMiddleName', label: "Father's Middle Name" },
  { modelPattern: /^father(\.|\[)last/i, fieldKey: 'fatherLastName', label: "Father's Last Name" },
  { modelPattern: /^father(\.|\[)suffix/i, fieldKey: 'fatherSuffix', label: "Father's Suffix" },

  // Mother (Crucial: PSA birth certificate uses Mother's Maiden Name)
  { modelPattern: /^mother(\.|\[)first/i, fieldKey: 'motherMaidenFirstName', label: "Mother's Maiden First Name" },
  { modelPattern: /^mother(\.|\[)middle/i, fieldKey: 'motherMaidenMiddleName', label: "Mother's Maiden Middle Name" },
  { modelPattern: /^mother(\.|\[)last/i, fieldKey: 'motherMaidenLastName', label: "Mother's Maiden Last Name" },
  { modelPattern: /^mother(\.|\[)suffix/i, fieldKey: 'motherMaidenSuffix', label: "Mother's Suffix" },

  // Event (Place & date of birth)
  { modelPattern: /^event(\.|\[)province/i, fieldKey: 'province', label: 'Place of Birth (Province)' },
  { modelPattern: /^event(\.|\[)municipality/i, fieldKey: 'cityMunicipality', label: 'Place of Birth (City/Municipality)' },
  { modelPattern: /^event(\.|\[)date/i, fieldKey: 'dateOfBirth', label: 'Event Date of Birth' },

  // Address (Delivery location)
  { modelPattern: /^address(\.|\[)line1/i, fieldKey: 'streetHouseNumber', label: 'Delivery Address (Street / House No)' },
  { modelPattern: /^address(\.|\[)barangay/i, fieldKey: 'barangay', label: 'Delivery Barangay' },
  { modelPattern: /^address(\.|\[)municipality/i, fieldKey: 'cityMunicipality', label: 'Delivery City / Municipality' },
  { modelPattern: /^address(\.|\[)province/i, fieldKey: 'province', label: 'Delivery Province' },
  { modelPattern: /^address(\.|\[)zip/i, fieldKey: 'zipCode', label: 'Delivery Zip Code' },
];

const GENERIC_FIELD_RULES: FieldRule[] = [
  // Mother's Maiden Name (Crucial & high priority for Philippine forms)
  {
    fieldKey: 'motherMaidenLastName',
    patterns: [
      /mother.*maiden.*last/i,
      /ina.*dalaga.*apelyido/i,
      /mmn.*last/i,
      /mother.*last/i,
      /nanay.*apelyido/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'motherMaidenFirstName',
    patterns: [
      /mother.*maiden.*first/i,
      /ina.*dalaga.*pangalan/i,
      /mmn.*first/i,
      /mother.*first/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'motherMaidenMiddleName',
    patterns: [
      /mother.*maiden.*mid/i,
      /ina.*dalaga.*gitna/i,
      /mmn.*mid/i,
      /mother.*middle/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'motherMaidenLastName',
    patterns: [
      /mother.*maiden/i,
      /ina.*dalaga/i,
      /\bmmn\b/i,
      /mother.*surname/i,
    ],
    confidence: 0.9,
  },

  // Father Details
  {
    fieldKey: 'fatherFirstName',
    patterns: [
      /father.*first/i,
      /tatay.*pangalan/i,
      /ama.*pangalan/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'fatherMiddleName',
    patterns: [
      /father.*mid/i,
      /tatay.*gitna/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'fatherLastName',
    patterns: [
      /father.*last/i,
      /father.*surname/i,
      /tatay.*apelyido/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'fatherFullName',
    patterns: [
      /father.*name/i,
      /pangalan.*ama/i,
      /\btatay\b/i,
      /father.*full/i,
    ],
    confidence: 0.9,
  },

  // Personal Name Parts
  {
    fieldKey: 'firstName',
    patterns: [
      /\bfirst[-_]?name\b/i,
      /\bfname\b/i,
      /given[-_]?name/i,
      /unang[-_]?pangalan/i,
      /\bpangalan\b/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'middleName',
    patterns: [
      /\bmiddle[-_]?name\b/i,
      /\bmname\b/i,
      /gitnang[-_]?pangalan/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'lastName',
    patterns: [
      /\blast[-_]?name\b/i,
      /\blname\b/i,
      /\bsurname\b/i,
      /\bfamily[-_]?name\b/i,
      /\bapelyido\b/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'suffix',
    patterns: [
      /\bsuffix\b/i,
      /name[-_]?extension/i,
      /\bext\b/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'fullName',
    patterns: [
      /\bfull[-_]?name\b/i,
      /\bapplicant[-_]?name\b/i,
      /buong[-_]?pangalan/i,
    ],
    confidence: 0.8,
  },

  // Demographics
  {
    fieldKey: 'gender',
    patterns: [
      /\bgender\b/i,
      /\bsex\b/i,
      /\bkasarian\b/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'dateOfBirth',
    patterns: [
      /\bbirth[-_]?date\b/i,
      /\bdate[-_]?of[-_]?birth\b/i,
      /\bdob\b/i,
      /kapanganakan/i,
      /petsa.*kapanganakan/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'placeOfBirth',
    patterns: [
      /birth[-_]?place/i,
      /place[-_]?of[-_]?birth/i,
      /lugar.*kapanganakan/i,
      /\bpob\b/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'civilStatus',
    patterns: [
      /civil[-_]?status/i,
      /marital[-_]?status/i,
      /katayuang[-_]?sibil/i,
    ],
    confidence: 0.85,
  },

  // Contact
  {
    fieldKey: 'mobileNumber',
    patterns: [
      /mobile/i,
      /cellphone/i,
      /cell[-_]?number/i,
      /contact[-_]?number/i,
      /phone[-_]?number/i,
      /\bcp\b/i,
      /telepono/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'emailAddress',
    patterns: [
      /\bemail\b/i,
      /\be-mail\b/i,
      /email[-_]?address/i,
    ],
    confidence: 0.95,
  },

  // Address
  {
    fieldKey: 'region',
    patterns: [
      /\bregion\b/i,
      /rehiyon/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'province',
    patterns: [
      /\bprovince\b/i,
      /lalawigan/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'cityMunicipality',
    patterns: [
      /\bcity\b/i,
      /\bmunicipality\b/i,
      /lungsod/i,
      /\bbayan\b/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'barangay',
    patterns: [
      /\bbarangay\b/i,
      /\bbrgy\b/i,
      /\bbgy\b/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'streetHouseNumber',
    patterns: [
      /street/i,
      /house[-_]?no/i,
      /address[-_]?line/i,
      /residential[-_]?address/i,
      /home[-_]?address/i,
      /tirahan/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'zipCode',
    patterns: [
      /\bzip\b/i,
      /\bzip[-_]?code\b/i,
      /postal[-_]?code/i,
    ],
    confidence: 0.85,
  },

  // IDs
  {
    fieldKey: 'philsysId',
    patterns: [
      /philsys/i,
      /national[-_]?id/i,
      /\bpsn\b/i,
      /ephilid/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'philhealthNumber',
    patterns: [
      /philhealth/i,
      /\bpin\b.*philhealth/i,
      /\bmdr\b/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'tin',
    patterns: [
      /\btin\b/i,
      /tax[-_]?identification/i,
      /bir[-_]?tin/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'sssNumber',
    patterns: [
      /\bsss\b/i,
      /social[-_]?security/i,
      /\bcrn\b/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'pagibigMid',
    patterns: [
      /pag[-_]?ibig/i,
      /\bmid\b/i,
      /hdmf/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'passportNumber',
    patterns: [
      /passport/i,
      /passport[-_]?no/i,
      /pasaporte/i,
    ],
    confidence: 0.9,
  },
];

export function getVaultValue(vault: CitizenVaultData, fieldKey: FieldKey): string {
  if (fieldKey === 'fullName') {
    return [vault.firstName, vault.middleName, vault.lastName, vault.suffix].filter(Boolean).join(' ');
  }
  if (fieldKey === 'motherMaidenFullName') {
    return [vault.motherMaidenFirstName, vault.motherMaidenMiddleName, vault.motherMaidenLastName].filter(Boolean).join(' ');
  }
  if (fieldKey === 'fullAddress') {
    return [vault.streetHouseNumber, vault.barangay, vault.cityMunicipality, vault.province, vault.zipCode].filter(Boolean).join(', ');
  }

  // Splitted Father Details
  if (fieldKey === 'fatherFirstName') {
    if (vault.fatherFirstName) return vault.fatherFirstName;
    const parts = (vault.fatherFullName || '').trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';
  }
  if (fieldKey === 'fatherMiddleName') {
    if (vault.fatherMiddleName) return vault.fatherMiddleName;
    const parts = (vault.fatherFullName || '').trim().split(/\s+/);
    return parts.length > 2 ? parts[1] : '';
  }
  if (fieldKey === 'fatherLastName') {
    if (vault.fatherLastName) return vault.fatherLastName;
    const parts = (vault.fatherFullName || '').trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
  if (fieldKey === 'fatherSuffix') {
    return vault.fatherSuffix || '';
  }
  if (fieldKey === 'motherMaidenSuffix') {
    return vault.motherMaidenSuffix || '';
  }

  return (vault[fieldKey as keyof CitizenVaultData] as string) || '';
}

function getLivewireBinding(el: HTMLElement): { model: string; componentId: string } | null {
  const model =
    el.getAttribute('wire:model') ||
    el.getAttribute('wire:model.live') ||
    el.getAttribute('wire:model.defer') ||
    el.getAttribute('wire:model.blur') ||
    el.getAttribute('x-model') ||
    el.getAttribute('data-model');

  if (!model) return null;

  const compEl = el.closest('[wire\\:id]');
  const componentId = compEl?.getAttribute('wire:id') || '';
  return { model, componentId };
}

function getElementDescriptor(el: HTMLElement): string {
  const parts: string[] = [];

  // Livewire bindings (Highest priority for PSA / Laravel Livewire)
  const lw = getLivewireBinding(el);
  if (lw) {
    parts.push(lw.model);
  }

  // Read any wire:* attributes
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name.startsWith('wire:') || attr.name.startsWith('x-')) {
      parts.push(attr.name, attr.value);
    }
  }

  const name = el.getAttribute('name');
  if (name) parts.push(name);

  const id = el.id;
  if (id) parts.push(id);

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) parts.push(placeholder);

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) parts.push(ariaLabel);

  const title = el.getAttribute('title');
  if (title) parts.push(title);

  // Associated <label>
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label && label.textContent) {
      parts.push(label.textContent.trim());
    }
  }

  // Parent label
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent) {
    parts.push(parentLabel.textContent.trim());
  }

  // Scoped section (e.g., section-owner, section-requester, section-father, section-mother)
  const sectionEl = el.closest('[id^="section-"], [wire\\:snapshot], fieldset');
  if (sectionEl) {
    if (sectionEl.id) parts.push(sectionEl.id);
    const legend = sectionEl.querySelector('legend, h2, h3, h4');
    if (legend && legend.textContent) parts.push(legend.textContent.trim());
  }

  const prev = el.previousElementSibling;
  if (prev && prev.textContent && prev.textContent.length < 50) {
    parts.push(prev.textContent.trim());
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Scans page for government form fields with PSA Livewire & generic portal support
 */
export function scanPageForFields(vault: CitizenVaultData): DetectionSummary {
  const domain = window.location.hostname;
  let agencyName = detectAgencyFromDomain(domain);

  // Check if page contains Laravel Livewire snapshot for PSA / civil registry
  const snapshotEl = document.querySelector('[wire\\:snapshot]');
  if (snapshotEl) {
    const rawSnap = snapshotEl.getAttribute('wire:snapshot') || '';
    if (rawSnap.includes('pages::generic-form') || rawSnap.includes('order\\/birth') || rawSnap.includes('App\\\\Livewire\\\\Forms')) {
      agencyName = 'Philippine Statistics Authority (PSA) Online';
    }
  }

  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
  );

  const fields: DetectedField[] = [];
  const visitedElements = new Set<HTMLElement>();

  inputs.forEach((el, index) => {
    if (visitedElements.has(el)) return;

    const lw = getLivewireBinding(el);
    const descriptor = getElementDescriptor(el);

    // 1. Try Livewire PSA exact model matching first (Confidence 0.99)
    if (lw) {
      for (const rule of LIVEWIRE_PSA_RULES) {
        if (rule.modelPattern.test(lw.model)) {
          const val = getVaultValue(vault, rule.fieldKey);
          if (val) {
            const selector = generateUniqueSelector(el, index);
            fields.push({
              id: `govguide-field-${index}`,
              fieldKey: rule.fieldKey,
              label: rule.label,
              suggestedValue: val,
              elementSelector: selector,
              elementTag: el.tagName.toLowerCase(),
              confidence: 0.99,
              confirmed: true,
              livewireModel: lw.model,
              livewireComponentId: lw.componentId,
            });
            visitedElements.add(el);
            return;
          }
        }
      }
    }

    // 2. Generic heuristic rules matching (Confidence 0.8 - 0.95)
    for (const rule of GENERIC_FIELD_RULES) {
      const isMatch = rule.patterns.some((pattern) => pattern.test(descriptor));
      if (isMatch) {
        const val = getVaultValue(vault, rule.fieldKey);
        if (val) {
          const selector = generateUniqueSelector(el, index);
          fields.push({
            id: `govguide-field-${index}`,
            fieldKey: rule.fieldKey,
            label: formatFieldLabel(rule.fieldKey),
            suggestedValue: val,
            elementSelector: selector,
            elementTag: el.tagName.toLowerCase(),
            confidence: rule.confidence,
            confirmed: true,
            livewireModel: lw?.model,
            livewireComponentId: lw?.componentId,
          });
          visitedElements.add(el);
          break;
        }
      }
    }
  });

  return {
    agencyName,
    domain,
    fields,
    totalFieldsFound: fields.length,
  };
}

function detectAgencyFromDomain(domain: string): string {
  if (domain.includes('nbi.gov.ph')) return 'National Bureau of Investigation (NBI)';
  if (domain.includes('psa') || domain.includes('psahelpline') || domain.includes('psaonline')) return 'Philippine Statistics Authority (PSA)';
  if (domain.includes('philhealth')) return 'PhilHealth';
  if (domain.includes('dfa.gov.ph')) return 'Department of Foreign Affairs (DFA)';
  if (domain.includes('dpwh.gov.ph')) return 'Department of Public Works & Highways (DPWH)';
  if (domain.includes('sss.gov.ph')) return 'Social Security System (SSS)';
  if (domain.includes('pagibig')) return 'Pag-IBIG Fund';
  if (domain.includes('lto.gov.ph')) return 'Land Transportation Office (LTO)';
  return 'Philippine Government Portal';
}

function formatFieldLabel(key: FieldKey): string {
  const map: Record<string, string> = {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    suffix: 'Suffix',
    fullName: 'Full Name',
    dateOfBirth: 'Date of Birth',
    placeOfBirth: 'Place of Birth',
    gender: 'Gender / Sex',
    civilStatus: 'Civil Status',
    nationality: 'Nationality',
    fatherFirstName: "Father's First Name",
    fatherMiddleName: "Father's Middle Name",
    fatherLastName: "Father's Last Name",
    fatherSuffix: "Father's Suffix",
    fatherFullName: "Father's Full Name",
    motherMaidenLastName: "Mother's Maiden Last Name",
    motherMaidenFirstName: "Mother's Maiden First Name",
    motherMaidenMiddleName: "Mother's Maiden Middle Name",
    motherMaidenSuffix: "Mother's Suffix",
    motherMaidenFullName: "Mother's Full Maiden Name",
    mobileNumber: 'Mobile Number',
    emailAddress: 'Email Address',
    region: 'Region',
    province: 'Province',
    cityMunicipality: 'City / Municipality',
    barangay: 'Barangay',
    streetHouseNumber: 'House No. & Street',
    zipCode: 'Zip Code',
    fullAddress: 'Full Residential Address',
    philsysId: 'PhilSys National ID',
    tin: 'BIR TIN',
    sssNumber: 'SSS CRN',
    philhealthNumber: 'PhilHealth PIN',
    pagibigMid: 'Pag-IBIG Member ID',
    passportNumber: 'Passport Number',
  };
  return map[key] || String(key);
}

function generateUniqueSelector(el: HTMLElement, fallbackIdx: number): string {
  // Prefer wire:model attribute selector if available
  const wireModel = el.getAttribute('wire:model') || el.getAttribute('wire:model.live');
  if (wireModel) {
    return `${el.tagName.toLowerCase()}[wire\\:model="${CSS.escape(wireModel)}"], ${el.tagName.toLowerCase()}[wire\\:model\\.live="${CSS.escape(wireModel)}"]`;
  }
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
  return `data-govguide-idx-${fallbackIdx}`;
}
