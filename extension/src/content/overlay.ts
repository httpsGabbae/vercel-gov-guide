/**
 * GovGuide PH — Shadow DOM Floating Copilot Pill & Modal
 * Isolated from host page CSS styles
 */

import type { DetectedField, DetectionSummary } from '../types';
import { performAutofill } from './autofill';

export class GovGuideOverlay {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private detection: DetectionSummary | null = null;
  private isModalOpen = false;
  private onStatusUpdateRequested?: (ref: string) => void;

  constructor(callbacks?: { onStatusUpdateRequested?: (ref: string) => void }) {
    this.onStatusUpdateRequested = callbacks?.onStatusUpdateRequested;
    this.initShadowHost();
  }

  private initShadowHost() {
    let existing = document.getElementById('govguide-copilot-host');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'govguide-copilot-host';
      existing.style.all = 'initial';
      existing.style.position = 'fixed';
      existing.style.zIndex = '2147483647';
      existing.style.top = '0';
      existing.style.left = '0';
      existing.style.pointerEvents = 'none';
      document.body.appendChild(existing);
    }
    this.host = existing;
    this.shadow = existing.attachShadow({ mode: 'open' });
  }

  public showPill(detection: DetectionSummary) {
    this.detection = detection;
    this.render();
  }

  public showAgencyRibbon(referenceNumber: string, agencyName?: string) {
    if (!this.shadow) return;
    let ribbon = this.shadow.querySelector('#govguide-agency-ribbon') as HTMLElement;
    if (!ribbon) {
      ribbon = document.createElement('div');
      ribbon.id = 'govguide-agency-ribbon';
      this.shadow.appendChild(ribbon);
    }

    ribbon.innerHTML = `
      <style>
        .ribbon {
          pointer-events: auto;
          position: fixed;
          top: 12px;
          right: 20px;
          background: #0f172a;
          color: #f8fafc;
          padding: 8px 16px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          border: 1px solid #334155;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          z-index: 2147483647;
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ribbon-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .ribbon-btn:hover {
          background: #1d4ed8;
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
      <div class="ribbon">
        <span>🏢 <strong>GovGuide Officer Bridge:</strong> Ref <code>${referenceNumber}</code></span>
        <button id="open-stepper-btn" class="ribbon-btn">⚡ Advance Status Bar</button>
      </div>
    `;

    const btn = ribbon.querySelector('#open-stepper-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (this.onStatusUpdateRequested) {
          this.onStatusUpdateRequested(referenceNumber);
        } else {
          chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: 'Agency Officer Bridge',
              message: `Open GovGuide Extension popup to advance status for Ref #${referenceNumber}.`,
            },
          });
        }
      });
    }
  }

  private render() {
    if (!this.shadow || !this.detection || this.detection.totalFieldsFound === 0) return;

    const count = this.detection.totalFieldsFound;

    this.shadow.innerHTML = `
      <style>
        .pill {
          pointer-events: auto;
          position: fixed;
          top: 140px;
          right: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 14px 8px 12px;
          border-radius: 20px 0 0 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: -4px 6px 18px rgba(15, 23, 42, 0.25);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s;
          border: 1px solid #1e293b;
          border-right: none;
        }
        .pill:hover {
          transform: translateX(-4px);
          background: #1e293b;
        }
        .flag-dot {
          background: #2563eb;
          color: #ffffff;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }
        .badge {
          background: #10b981;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
        }
        .backdrop {
          pointer-events: auto;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 2147483647;
        }
        .modal {
          background: #ffffff;
          color: #0f172a;
          width: 90%;
          max-width: 460px;
          max-height: 85vh;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .modal-header {
          padding: 16px 20px;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-body {
          padding: 16px 20px;
          overflow-y: auto;
          flex: 1;
        }
        .field-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .field-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .field-info {
          flex: 1;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .field-val {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 2px;
          word-break: break-word;
        }
        .modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }
        .btn-autofill {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-autofill:hover {
          background: #1d4ed8;
        }
        .btn-cancel {
          background: transparent;
          color: #64748b;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-cancel:hover {
          background: #f1f5f9;
        }
      </style>

      <div id="govguide-pill" class="pill" title="Click to review and autofill">
        <span class="flag-dot">⚡</span>
        <span>Autofill Form</span>
        <span class="badge">${count}</span>
      </div>

      ${this.isModalOpen ? this.renderModalHTML() : ''}
    `;

    this.attachEvents();
  }

  private renderModalHTML(): string {
    if (!this.detection) return '';

    return `
      <div class="backdrop" id="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">
              <span>🇵🇭</span>
              <span>GovGuide PH Bilis-Pila Copilot</span>
            </div>
            <button id="close-modal-x" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">&times;</button>
          </div>

          <div class="modal-body">
            <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 12px;">
              Detected <strong>${this.detection.totalFieldsFound}</strong> matching fields for <em>${this.detection.agencyName}</em>. Review before injecting:
            </p>

            <div class="field-list">
              ${this.detection.fields
                .map(
                  (f) => `
                <div class="field-item">
                  <input type="checkbox" id="check-${f.id}" data-id="${f.id}" ${f.confirmed ? 'checked' : ''} style="margin-top: 3px; cursor: pointer;" />
                  <div class="field-info">
                    <div class="field-label">${f.label}</div>
                    <div class="field-val">${f.suggestedValue}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" id="close-modal-btn">Cancel</button>
            <button class="btn-autofill" id="do-autofill-btn">
              <span>⚡</span>
              <span>Autofill ${this.detection.fields.filter((f) => f.confirmed).length} Fields</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents() {
    if (!this.shadow) return;

    const pill = this.shadow.querySelector('#govguide-pill');
    if (pill) {
      pill.addEventListener('click', () => {
        this.isModalOpen = true;
        this.render();
      });
    }

    const backdrop = this.shadow.querySelector('#modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.isModalOpen = false;
          this.render();
        }
      });
    }

    const closeBtn = this.shadow.querySelector('#close-modal-btn');
    const closeX = this.shadow.querySelector('#close-modal-x');
    [closeBtn, closeX].forEach((el) => {
      if (el) {
        el.addEventListener('click', () => {
          this.isModalOpen = false;
          this.render();
        });
      }
    });

    // Checkbox toggles
    this.detection?.fields.forEach((f) => {
      const cb = this.shadow?.querySelector(`#check-${f.id}`) as HTMLInputElement;
      if (cb) {
        cb.addEventListener('change', () => {
          f.confirmed = cb.checked;
          const btn = this.shadow?.querySelector('#do-autofill-btn');
          if (btn && this.detection) {
            const activeCount = this.detection.fields.filter((x) => x.confirmed).length;
            btn.innerHTML = `<span>⚡</span><span>Autofill ${activeCount} Fields</span>`;
          }
        });
      }
    });

    const autofillBtn = this.shadow.querySelector('#do-autofill-btn');
    if (autofillBtn && this.detection) {
      autofillBtn.addEventListener('click', () => {
        const res = performAutofill(this.detection!.fields);
        this.isModalOpen = false;
        this.render();

        chrome.runtime.sendMessage({
          type: 'SHOW_NOTIFICATION',
          payload: {
            title: 'GovGuide PH Autofill Complete',
            message: `Successfully populated ${res.filledCount} fields into ${this.detection!.agencyName}.`,
          },
        });
      });
    }
  }
}
