/**
 * GovGuide PH — Form Field Detection Engine
 * Specialized heuristic & Livewire/Alpine schema mapping for PSA, NBI, PhilHealth, DFA
 */

import type { CitizenVaultData, DetectedField, DetectionSummary, FieldKey } from '../types';


export function getRadioButtonOptionText(el: HTMLInputElement): string {
  const parts: string[] = [];
  if (el.value) parts.push(el.value);
  if (el.id) {
    try {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl && lbl.textContent) parts.push(lbl.textContent.trim());
    } catch {}
  }
  const parentLbl = el.closest('label');
  if (parentLbl && parentLbl.textContent) {
    parts.push(parentLbl.textContent.trim());
  }
  if (el.nextElementSibling && el.nextElementSibling.tagName === 'LABEL' && el.nextElementSibling.textContent) {
    parts.push(el.nextElementSibling.textContent.trim());
  }
  if (el.parentElement && el.parentElement.textContent && el.parentElement.textContent.length < 80) {
    parts.push(el.parentElement.textContent.trim());
  }
  return parts.join(' ').toLowerCase();
}

export function matchesRadioValue(fieldKey: FieldKey, radioOptionText: string, vaultValue: string): boolean {
  const opt = radioOptionText.toLowerCase();
  const target = (vaultValue || '').toLowerCase().trim();
  if (!target) return false;

  if (fieldKey === 'gender') {
    const isFemaleTarget = target === 'female' || target === 'f' || target === 'babae';
    const isMaleTarget = target === 'male' || target === 'm' || target === 'lalaki';

    const isFemaleOption = /\b(female|babae|f)\b/i.test(opt) || opt === 'female' || opt === 'f' || opt === '2';
    const isMaleOption = (/\b(male|lalaki|m)\b/i.test(opt) && !opt.includes('female')) || opt === 'male' || opt === 'm' || opt === '1';

    if (isFemaleTarget) return isFemaleOption;
    if (isMaleTarget) return isMaleOption;
    return false;
  }

  if (fieldKey === 'civilStatus') {
    if (target.includes('single')) return /\b(single|walang asawa|binata|dalaga|s)\b/i.test(opt) || opt === 'single' || opt === '1';
    if (target.includes('married')) return /\b(married|may asawa|kasal|m)\b/i.test(opt) || opt === 'married' || opt === '2';
    if (target.includes('widow')) return /\b(widow|widowed|biyudo|biyuda|w)\b/i.test(opt) || opt === 'widow' || opt === 'widowed' || opt === '3';
    if (target.includes('separated')) return /\b(separated|hiwalay)\b/i.test(opt) || opt === 'separated' || opt === '4';
    if (target.includes('divorced')) return /\b(divorce|divorced)\b/i.test(opt) || opt === 'divorced' || opt === '5';
  }

  return opt.includes(target) || target.includes(opt);
}

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
  { modelPattern: /^requester(\.|\[)(civil|marital)/i, fieldKey: 'civilStatus', label: 'Requester Civil Status' },
  { modelPattern: /^requester(\.|\[)(relationship|owner)/i, fieldKey: 'relationshipToOwner', label: 'Relationship to Document Owner' },
  { modelPattern: /^owner(\.|\[)(civil|marital)/i, fieldKey: 'civilStatus', label: "Applicant's Civil Status" },
  { modelPattern: /^owner(\.|\[)(relationship|owner)/i, fieldKey: 'relationshipToOwner', label: 'Relationship to Document Owner' },
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

  // Relationship to Document Owner (Crucial for PSA Serbilis & Helpline)
  {
    fieldKey: 'relationshipToOwner',
    patterns: [
      /relationship.*owner/i,
      /document.*owner/i,
      /certificate.*of[\s-_.]*my/i,
      /relasyon.*may[-_]?ari/i,
      /\brelationship\b/i,
      /\brelation\b/i,
    ],
    confidence: 0.95,
  },

  // Personal Name Parts (Serbilis: Requester's First/Last/Middle Name, Your First/Last/Middle Name)
  {
    fieldKey: 'firstName',
    patterns: [
      /(?:requester|owner|applicant|your)?[\s-_.]*(?:first|given)[\s-_.]*name/i,
      /(?:requester|owner|applicant|your)[\s-_.]*(?:first|given)/i,
      /\bfirst[\s-_.]*name\b/i,
      /\bfname\b/i,
      /\bgiven[\s-_.]*name\b/i,
      /unang[\s-_.]*pangalan/i,
      /\bpangalan\b/i,
    ],
    confidence: 0.88,
  },
  {
    fieldKey: 'middleName',
    patterns: [
      /(?:requester|owner|applicant|your)?[\s-_.]*middle[\s-_.]*name/i,
      /(?:requester|owner|applicant|your)[\s-_.]*(?:middle|mid)/i,
      /\bmiddle[\s-_.]*name\b/i,
      /\bmname\b/i,
      /\bmid[\s-_.]*name\b/i,
      /gitnang[\s-_.]*pangalan/i,
    ],
    confidence: 0.88,
  },
  {
    fieldKey: 'lastName',
    patterns: [
      /(?:requester|owner|applicant|your)?[\s-_.]*(?:last|family)[\s-_.]*name/i,
      /(?:requester|owner|applicant|your)[\s-_.]*(?:last|family|surname)/i,
      /\blast[\s-_.]*name\b/i,
      /\blname\b/i,
      /\bsurname\b/i,
      /\bfamily[\s-_.]*name\b/i,
      /\bapelyido\b/i,
    ],
    confidence: 0.88,
  },
  {
    fieldKey: 'suffix',
    patterns: [
      /\bsuffix\b/i,
      /name[\s-_.]*extension/i,
      /\bext\b/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'fullName',
    patterns: [
      /\bfull[\s-_.]*name\b/i,
      /\bapplicant[\s-_.]*name\b/i,
      /buong[\s-_.]*pangalan/i,
    ],
    confidence: 0.8,
  },

  // Demographics (Radio buttons & Dropdowns)
  {
    fieldKey: 'gender',
    patterns: [
      /\bgender\b/i,
      /\bsex\b/i,
      /\bkasarian\b/i,
      /\b(male|female|babae|lalaki)\b/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'dateOfBirth',
    patterns: [
      /(?:date[\s-_.]*of[\s-_.]*birth|birth[\s-_.]*date|\bdob\b|petsa.*kapanganakan|kapanganakan)/i,
      /(?:requester|owner|applicant|your)?[\s-_.]*(?:date[\s-_.]*of[\s-_.]*birth|birth[\s-_.]*date)/i,
      /\bbirth[-_]?date\b/i,
      /\bdate[-_]?of[-_]?birth\b/i,
    ],
    confidence: 0.95,
  },
  {
    fieldKey: 'placeOfBirth',
    patterns: [
      /birth[\s-_.]*place/i,
      /place[\s-_.]*of[\s-_.]*birth/i,
      /lugar.*kapanganakan/i,
      /\bpob\b/i,
    ],
    confidence: 0.85,
  },
  {
    fieldKey: 'civilStatus',
    patterns: [
      /civil[\s-_.]*status/i,
      /marital[\s-_.]*status/i,
      /katayuang[\s-_.]*sibil/i,
      /\b(single|married|widowed|separated|divorced)\b/i,
    ],
    confidence: 0.9,
  },

  // Contact
  {
    fieldKey: 'mobileNumber',
    patterns: [
      /(?:requester|owner|your)?[\s-_.]*mobile/i,
      /\bmobile\b/i,
      /cellphone/i,
      /cell[\s-_.]*number/i,
      /contact[\s-_.]*number/i,
      /phone[\s-_.]*number/i,
      /\bcp\b/i,
      /telepono/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'emailAddress',
    patterns: [
      /\bemail\b/i,
      /\be-mail\b/i,
      /email[\s-_.]*address/i,
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
      /house[\s-_.]*no/i,
      /address[\s-_.]*line/i,
      /residential[\s-_.]*address/i,
      /home[\s-_.]*address/i,
      /tirahan/i,
    ],
    confidence: 0.8,
  },
  {
    fieldKey: 'zipCode',
    patterns: [
      /\bzip\b/i,
      /\bzip[\s-_.]*code\b/i,
      /postal[\s-_.]*code/i,
    ],
    confidence: 0.85,
  },

  // IDs
  {
    fieldKey: 'philsysId',
    patterns: [
      /philsys/i,
      /national[\s-_.]*id/i,
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
      /tax[\s-_.]*identification/i,
      /bir[\s-_.]*tin/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'sssNumber',
    patterns: [
      /\bsss\b/i,
      /social[\s-_.]*security/i,
      /\bcrn\b/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'pagibigMid',
    patterns: [
      /pag[\s-_.]*ibig/i,
      /\bmid\b/i,
      /hdmf/i,
    ],
    confidence: 0.9,
  },
  {
    fieldKey: 'passportNumber',
    patterns: [
      /passport/i,
      /passport[\s-_.]*no/i,
      /pasaporte/i,
    ],
    confidence: 0.9,
  },
];

export function getVaultValue(vault: CitizenVaultData, fieldKey: FieldKey): string {
  if (fieldKey === 'relationshipToOwner') {
    return (vault as any).relationshipToOwner || 'Self';
  }
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
    try {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label && label.textContent) {
        parts.push(label.textContent.trim());
      }
    } catch {}
  }

  // Parent label
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent) {
    parts.push(parentLabel.textContent.trim());
  }

  // Enclosing container (e.g. .form-group, .col, fieldset, div)
  const container = el.closest('.form-group, .form-row, .form-item, .col, .col-md-3, .col-md-4, .col-md-6, .field, fieldset, tr, td');
  if (container) {
    const labels = container.querySelectorAll('label, .label, .control-label, legend, h3, h4, h5, span.title, p.label');
    labels.forEach((lbl) => {
      if (lbl && lbl.textContent && lbl.textContent.length < 100) {
        parts.push(lbl.textContent.trim());
      }
    });
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
            if (el instanceof HTMLInputElement && el.type === 'radio') {
              const optText = getRadioButtonOptionText(el);
              if (!matchesRadioValue(rule.fieldKey, optText, val)) {
                return;
              }
            }
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
          if (el instanceof HTMLInputElement && el.type === 'radio') {
            const optText = getRadioButtonOptionText(el);
            if (!matchesRadioValue(rule.fieldKey, optText, val)) {
              continue;
            }
          }
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
    relationshipToOwner: 'Relationship to Document Owner',
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

  // For radio buttons, target the exact name + value combination
  if (el instanceof HTMLInputElement && el.type === 'radio') {
    const name = el.getAttribute('name');
    const val = el.getAttribute('value');
    if (name && val !== null) {
      return `input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(val)}"]`;
    }
  }

  const name = el.getAttribute('name');
  if (name && !(el instanceof HTMLInputElement && el.type === 'radio')) {
    return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
  }

  // Unique data attribute fallback
  try {
    el.setAttribute('data-govguide-idx', String(fallbackIdx));
    return `${el.tagName.toLowerCase()}[data-govguide-idx="${fallbackIdx}"]`;
  } catch {
    return `data-govguide-idx-${fallbackIdx}`;
  }
}