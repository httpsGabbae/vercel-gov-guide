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

  // Radio button handling
  if (element instanceof HTMLInputElement && element.type === 'radio') {
    const elVal = element.value.toLowerCase().trim();
    const targetVal = value.toLowerCase().trim();
    if (elVal === targetVal || targetVal.includes(elVal)) {
      element.checked = true;
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
      flashSuccessHighlight(element);
      return true;
    }
    return false;
  }

  // Checkbox handling
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    element.checked = Boolean(value);
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    flashSuccessHighlight(element);
    return true;
  }

  // Standard Text Inputs & TextAreas
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const proto = Object.getPrototypeOf(element);
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }

    // 1. Dispatch modern InputEvent with insertText (crucial for Livewire / Alpine)
    try {
      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          cancelable: true,
          inputType: 'insertText',
          data: value,
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

      // Exact match
      if (optText === valLower || optVal === valLower) {
        matchedIndex = i;
        break;
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
