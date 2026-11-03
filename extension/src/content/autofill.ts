/**
 * GovGuide PH — Safe Form Value Injector
 * Dispatches synthetic native events compatible with Laravel Livewire 3, Alpine.js, React, and Angular
 */

import type { DetectedField } from '../types';

export function injectFieldValue(
  element: HTMLElement,
  value: string,
  livewireInfo?: { model?: string; componentId?: string }
): boolean {
  if (!element || value === undefined || value === null) return false;

  element.focus();

  // If this element is bound to Laravel Livewire, notify the main-world Livewire bridge
  if (livewireInfo?.model && livewireInfo?.componentId) {
    try {
      window.dispatchEvent(
        new CustomEvent('__govguide_set_livewire__', {
          detail: {
            wireId: livewireInfo.componentId,
            model: livewireInfo.model,
            value,
          },
        })
      );
    } catch {
      // safe ignore in isolated environments
    }
  }

  // Radio button handling (Selector already targets exact matching radio)
  if (element instanceof HTMLInputElement && element.type === 'radio') {
    element.checked = true;
    try {
      element.click();
    } catch {}
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
    flashSuccessHighlight(element);
    return true;
  }

  // Checkbox handling
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    element.checked = Boolean(value);
    try {
      element.click();
    } catch {}
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    flashSuccessHighlight(element);
    return true;
  }

  // Standard Text Inputs & TextAreas
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    let finalValue = value;

    // Date of Birth conversion: Convert YYYY-MM-DD to MM/DD/YYYY if input is not type="date"
    if (
      element instanceof HTMLInputElement &&
      element.type !== 'date' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      const [y, m, d] = value.split('-');
      const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();
      const aria = (element.getAttribute('aria-label') || '').toLowerCase();
      const idAndName = `${element.id} ${element.name}`.toLowerCase();

      if (placeholder.includes('dd/mm') || aria.includes('dd/mm') || idAndName.includes('ddmmyyyy')) {
        finalValue = `${d}/${m}/${y}`;
      } else {
        // Standard Philippine civil registry format (e.g. PSA Serbilis MM/DD/YYYY)
        finalValue = `${m}/${d}/${y}`;
      }
    }

    // Mobile Number normalization: 11 digits (09XXXXXXXXX) for Philippine numbers
    if (
      element instanceof HTMLInputElement &&
      (element.type === 'tel' || element.type === 'text') &&
      (element.name?.toLowerCase().includes('mobile') ||
        element.placeholder?.toLowerCase().includes('mobile') ||
        element.id?.toLowerCase().includes('mobile') ||
        element.getAttribute('maxlength') === '11')
    ) {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('09')) {
        finalValue = digits;
      } else if (digits.length === 12 && digits.startsWith('63')) {
        finalValue = '0' + digits.slice(2);
      }
    }

    const proto = Object.getPrototypeOf(element);
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (nativeSetter) {
      nativeSetter.call(element, finalValue);
    } else {
      element.value = finalValue;
    }

    // 1. Dispatch modern InputEvent with insertText (crucial for Livewire / Alpine)
    try {
      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          cancelable: true,
          inputType: 'insertText',
          data: finalValue,
        })
      );
    } catch {
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }

    // 2. Dispatch change & blur
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));

    flashSuccessHighlight(element);
    return true;
  }

  // Dropdown Select Elements
  if (element instanceof HTMLSelectElement) {
    const valLower = value.toLowerCase().trim();
    let matchedIndex = -1;

    for (let i = 0; i < element.options.length; i++) {
      const opt = element.options[i];
      const optText = opt.text.toLowerCase().trim();
      const optVal = opt.value.toLowerCase().trim();

      // Skip unselected placeholder option (e.g. "Select Document Owner", "Choose...", "-- Select --")
      if (!optVal && (optText.includes('select') || optText.includes('choose') || optText.includes('--'))) {
        continue;
      }

      // Exact match
      if (optText === valLower || optVal === valLower) {
        matchedIndex = i;
        break;
      }

      // "Self" / Document Owner matching (PSA Serbilis / Helpline)
      if (valLower === 'self' || valLower === 'myself' || valLower === 'owner') {
        if (
          optText.includes('self') ||
          optText.includes('myself') ||
          optText.includes('owner') ||
          optText.includes('may-ari') ||
          optVal === 'self' ||
          optVal === 'myself' ||
          optVal === '1'
        ) {
          matchedIndex = i;
          break;
        }
      }

      // Fuzzy match (e.g. 'metro manila' in 'national capital region' or 'philippines' / '608')
      if (
        (valLower.includes('manila') && (optText.includes('manila') || optVal.includes('manila'))) ||
        (valLower.includes('filipino') && (optText.includes('ph') || optVal === '608' || optText.includes('philippines')))
      ) {
        matchedIndex = i;
        break;
      }

      if (optText.includes(valLower) || valLower.includes(optText)) {
        matchedIndex = i;
      }
    }

    if (matchedIndex >= 0) {
      element.selectedIndex = matchedIndex;
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
      flashSuccessHighlight(element);
      return true;
    }
  }

  return false;
}

export function performAutofill(fields: DetectedField[]): { filledCount: number; totalCount: number } {
  let filledCount = 0;

  fields.forEach((field) => {
    if (!field.confirmed) return;

    let targetEl: HTMLElement | null = null;

    // Try finding by unique selector
    if (field.elementSelector) {
      try {
        targetEl = document.querySelector<HTMLElement>(field.elementSelector);
      } catch {
        // Selector escape fallback
      }
    }

    // Fallback search by wire:model or name if selector didn't resolve
    if (!targetEl && field.livewireModel) {
      targetEl = document.querySelector<HTMLElement>(
        `[wire\\:model="${CSS.escape(field.livewireModel)}"], [wire\\:model\\.live="${CSS.escape(field.livewireModel)}"], [wire\\:model\\.defer="${CSS.escape(field.livewireModel)}"]`
      );
    }

    if (
      targetEl &&
      injectFieldValue(targetEl, field.suggestedValue, {
        model: field.livewireModel,
        componentId: field.livewireComponentId,
      })
    ) {
      filledCount++;
    }
  });

  return { filledCount, totalCount: fields.length };
}

function flashSuccessHighlight(el: HTMLElement) {
  const originalOutline = el.style.outline;
  const originalTransition = el.style.transition;

  el.style.transition = 'all 0.3s ease';
  el.style.outline = '2px solid #10b981'; // Emerald Green
  el.style.backgroundColor = '#ecfdf5';

  setTimeout(() => {
    el.style.outline = originalOutline;
    el.style.backgroundColor = '';
    el.style.transition = originalTransition;
  }, 1800);
}
