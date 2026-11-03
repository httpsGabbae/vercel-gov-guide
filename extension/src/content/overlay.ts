/**
 * GovGuide PH — Overlay Stub
 * Floating overlays on web pages are disabled per citizen UX requirements.
 * Form filling is triggered explicitly via the extension popup button.
 */

export class GovGuideOverlay {
  public showPill() {
    const existing = document.getElementById('govguide-copilot-host');
    if (existing) existing.remove();
  }

  public showAgencyRibbon() {
    const existing = document.getElementById('govguide-copilot-host');
    if (existing) existing.remove();
  }
}
