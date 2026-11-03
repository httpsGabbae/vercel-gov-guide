import type {
  ApplicantProfile,
  SavedVaultFile,
  ChecklistRequirementItem,
  InspectionReport,
} from '@/lib/services/charter-sources';
import { SERVICES_REGISTRY } from '@/lib/services/registry';

/**
 * Checks whether a saved document in My Details is "good and correct"
 * (counter_ready, unexpired, no active discrepancies or missing blocks).
 */
export function isDocumentGoodAndCorrect(
  file: SavedVaultFile,
  inspections?: InspectionReport[],
): boolean {
  if (file.status === 'issues_found' || file.status === 'inspecting') {
    return false;
  }
  if (file.discrepancy_what) {
    return false;
  }
  const summary = (file.issue_summary || '').toLowerCase();
  if (summary.includes('expired') || summary.includes('mismatch') || summary.includes('missing')) {
    return false;
  }

  // Cross-reference with inspections if available
  if (inspections && inspections.length > 0) {
    const insp = inspections.find(
      (i) => i.file_name === file.name || i.document_title === file.document_type,
    );
    if (insp) {
      if (insp.overall_status === 'issues_found') return false;
      const counts = insp.summary_counts || { expired: 0, mismatch: 0, missing: 0 };
      if (counts.expired > 0 || counts.mismatch > 0 || counts.missing > 0) return false;
    }
  }

  return (
    file.status === 'counter_ready' ||
    summary.includes('goods') ||
    summary.includes('counter-ready') ||
    summary.includes('ready')
  );
}

/**
 * Evaluates whether a requirement should be skipped based on the citizen's profile.
 * ("skipped if need")
 */
export function shouldRequirementBeSkipped(
  item: ChecklistRequirementItem,
  applicant: ApplicantProfile,
): { skipped: boolean; reason?: string } {
  const reqName = (item.name || '').toLowerCase();

  // 1. Representative / Authorized Agent requirements:
  // For personal citizen applications, representative authorization is not needed.
  if (
    item.appliesTo === 'representative' ||
    /\b(spa|special power of attorney|authorization letter|kinatawan|id ng may-ari|owner'?s id)\b/i.test(
      reqName,
    )
  ) {
    return {
      skipped: true,
      reason: 'Skipped · Personal Application (Hindi kailangan ng SPA o Kinatawan)',
    };
  }

  // 2. Senior Citizen / Indigency Subsidy requirements:
  if (
    item.appliesTo === 'senior' ||
    /\b(senior\s*citizen|osca|indigency|dswd indigency)\b/i.test(reqName)
  ) {
    let isSenior = false;
    if (applicant.birth_date) {
      const birthYear = new Date(applicant.birth_date).getFullYear();
      if (!isNaN(birthYear)) {
        const age = new Date().getFullYear() - birthYear;
        if (age >= 60) isSenior = true;
      }
    }
    if ((applicant.title || '').toLowerCase().includes('senior')) {
      isSenior = true;
    }
    if (!isSenior) {
      return {
        skipped: true,
        reason: 'Skipped · Para lamang sa Senior Citizen o Indigent',
      };
    }
  }

  // 3. Marriage Certificate requirements:
  // In DFA Passport or PhilHealth registration:
  // If the applicant is Single or Male (not changing surname to husband),
  // marriage certificate is not needed.
  if (
    item.service_code !== 'PSA_MARRIAGE_CERT' &&
    /\b(marriage|kasal|sertipiko ng kasal)\b/i.test(reqName)
  ) {
    const isSingle = (applicant.civil_status || '').toLowerCase() === 'single';
    const isMale = (applicant.gender || '').toUpperCase() === 'MALE';
    if (isSingle || isMale) {
      return {
        skipped: true,
        reason: 'Skipped · Hindi kailangan para sa Single applicant (Walang asawa/dependents)',
      };
    }
  }

  // 4. First-Time Jobseeker requirements (RA 11261):
  // If the applicant is NOT a first-time jobseeker (e.g. regular renewal, married applicant),
  // barangay certificate / oath of undertaking for fee exemption is not required.
  if (
    item.appliesTo === 'first_time_jobseeker' ||
    (/\b(first-time jobseeker|ra 11261|oath of undertaking)\b/i.test(reqName) &&
      item.service_code === 'NBI_CLEARANCE')
  ) {
    const isJobseeker =
      applicant.role === 'jobseeker' ||
      (applicant.title || '').toLowerCase().includes('jobseeker') ||
      (applicant.title || '').toLowerCase().includes('11261');

    if (!isJobseeker && applicant.role && applicant.role !== 'new_citizen') {
      return {
        skipped: true,
        reason: 'Skipped · Para lamang sa First-Time Jobseekers (RA 11261)',
      };
    }
  }

  return { skipped: false };
}

/**
 * Checks if a requirement is satisfied by a good and correct document in My Details.
 */
export function matchDocumentToRequirement(
  item: ChecklistRequirementItem,
  savedFiles: SavedVaultFile[],
  inspections?: InspectionReport[],
): { matched: boolean; file?: SavedVaultFile; note?: string } {
  const reqName = (item.name || '').toLowerCase();
  const isPrimaryIdReq =
    item.isPrimaryId ||
    /\b(primary id|valid.*id|government id|photo id|identipikasyon)\b/i.test(reqName);

  // Filter good documents
  const goodFiles = savedFiles.filter((f) => isDocumentGoodAndCorrect(f, inspections));

  // Case A: Primary Government ID requirement
  if (isPrimaryIdReq) {
    const goodIds = goodFiles.filter((f) => {
      const type = (f.document_type || '').toLowerCase();
      const name = (f.name || '').toLowerCase();
      return (
        type.includes('id') ||
        type.includes('passport') ||
        type.includes('philsys') ||
        type.includes('umid') ||
        type.includes('license') ||
        type.includes('postal') ||
        name.includes('id') ||
        name.includes('passport') ||
        name.includes('philsys')
      );
    });

    if (goodIds.length > 0) {
      const isStrictlyTwoIds =
        /\b(dalawang\s*\(?2\)?\s*valid|2\s*valid\s*government\s*ids)\b/i.test(reqName);
      if (isStrictlyTwoIds) {
        if (goodIds.length >= 2) {
          return {
            matched: true,
            file: goodIds[0],
            note: `2 Valid Primary IDs Verified in My Details (${goodIds[0].document_type || goodIds[0].name}, ${goodIds[1].document_type || goodIds[1].name})`,
          };
        }
        return {
          matched: false,
          note: `1 of 2 Valid IDs ready (${goodIds[0].document_type || goodIds[0].name}) · 1 more Primary ID required`,
        };
      }
      return {
        matched: true,
        file: goodIds[0],
        note: `Verified via My Details: ${goodIds[0].document_type || goodIds[0].name} (All goods)`,
      };
    }
  }

  // Case B: PSA Birth Certificate requirement
  if (/\b(birth|kapanganakan|secpa)\b/i.test(reqName)) {
    const birthFile = goodFiles.find((f) => {
      const t = (f.document_type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      return (
        t.includes('birth') ||
        t.includes('secpa') ||
        n.includes('birth') ||
        n.includes('secpa')
      );
    });
    if (birthFile) {
      return {
        matched: true,
        file: birthFile,
        note: `Verified via My Details: ${birthFile.document_type || birthFile.name} (All goods)`,
      };
    }
  }

  // Case C: Barangay Certification
  if (/\b(barangay|brgy)\b/i.test(reqName)) {
    const brgyFile = goodFiles.find((f) => {
      const t = (f.document_type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      return (
        t.includes('barangay') ||
        t.includes('brgy') ||
        n.includes('barangay') ||
        n.includes('brgy')
      );
    });
    if (brgyFile) {
      return {
        matched: true,
        file: brgyFile,
        note: `Verified via My Details: ${brgyFile.document_type || brgyFile.name} (All goods)`,
      };
    }
  }

  // Case D: Oath of Undertaking
  if (/\b(oath|undertaking|sinumpaang)\b/i.test(reqName)) {
    const oathFile = goodFiles.find((f) => {
      const t = (f.document_type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      return (
        t.includes('oath') ||
        t.includes('undertaking') ||
        n.includes('oath') ||
        n.includes('undertaking')
      );
    });
    if (oathFile) {
      return {
        matched: true,
        file: oathFile,
        note: `Verified via My Details: ${oathFile.document_type || oathFile.name} (Signed & Counter-Ready)`,
      };
    }
  }

  // Case E: PhilHealth PMRF
  if (/\b(pmrf|member registration form)\b/i.test(reqName)) {
    const pmrfFile = goodFiles.find((f) => {
      const t = (f.document_type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      return t.includes('pmrf') || n.includes('pmrf');
    });
    if (pmrfFile) {
      return {
        matched: true,
        file: pmrfFile,
        note: `Verified via My Details: ${pmrfFile.document_type || pmrfFile.name} (All goods)`,
      };
    }
  }

  // Case F: Marriage Certificate
  if (/\b(marriage|kasal|sertipiko ng kasal)\b/i.test(reqName)) {
    const mFile = goodFiles.find((f) => {
      const t = (f.document_type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      return t.includes('marriage') || n.includes('marriage');
    });
    if (mFile) {
      return {
        matched: true,
        file: mFile,
        note: `Verified via My Details: ${mFile.document_type || mFile.name} (All goods)`,
      };
    }
  }

  // Case G: Matching service_code file
  const serviceFile = goodFiles.find((f) => f.service_code === item.service_code);
  if (serviceFile) {
    const t = (serviceFile.document_type || '').toLowerCase();
    const n = (serviceFile.name || '').toLowerCase();
    const reqWords = reqName.split(/\s+/).filter((w) => w.length >= 4);
    if (reqWords.some((w) => t.includes(w) || n.includes(w))) {
      return {
        matched: true,
        file: serviceFile,
        note: `Verified via My Details: ${serviceFile.document_type || serviceFile.name} (All goods)`,
      };
    }
  }

  return { matched: false };
}

/**
 * Reconciles checklist items with saved documents in My Details and citizen profile.
 * - If documents are good and correct -> status becomes 'verified' (checked)!
 * - If requirements are not needed (SPA, single without marriage cert, etc.) -> status becomes 'skipped' (skipped if need)!
 * - If documents have issues -> status becomes 'issue'.
 * - Preserves user manual overrides when desired.
 */
export function reconcileChecklistWithVault(
  items: ChecklistRequirementItem[],
  applicant: ApplicantProfile,
  savedFiles: SavedVaultFile[],
  inspections?: InspectionReport[],
  preserveUserReady = true,
): ChecklistRequirementItem[] {
  return items.map((item) => {
    // 1. Check if matching document is good and correct in My Details
    const match = matchDocumentToRequirement(item, savedFiles, inspections);
    if (match.matched) {
      return {
        ...item,
        status: 'verified',
        issue_note: match.note || 'Verified via My Details (All goods)',
      };
    }

    // 2. Check if there's a document with issues matching this requirement
    const badDoc = savedFiles.find((f) => {
      if (f.status !== 'issues_found') return false;
      const t = (f.document_type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      const reqName = (item.name || '').toLowerCase();
      if (item.isPrimaryId && (t.includes('id') || n.includes('id'))) return true;
      if (
        reqName.includes('barangay') &&
        (t.includes('barangay') || t.includes('brgy') || n.includes('brgy'))
      ) {
        return true;
      }
      if (reqName.includes('birth') && (t.includes('birth') || n.includes('birth'))) {
        return true;
      }
      return false;
    });

    if (badDoc) {
      return {
        ...item,
        status: 'issue',
        issue_note:
          badDoc.issue_summary ||
          badDoc.discrepancy_what ||
          'May isyu sa dokumentong ito sa My Details',
      };
    }

    // 3. Check if requirement should be skipped ("skipped if need")
    const skipCheck = shouldRequirementBeSkipped(item, applicant);
    if (skipCheck.skipped) {
      if (
        preserveUserReady &&
        item.status === 'verified' &&
        item.issue_note?.includes('applicant')
      ) {
        return item;
      }
      return {
        ...item,
        status: 'skipped',
        issue_note: skipCheck.reason,
      };
    }

    // 4. If it was skipped previously but now applies (e.g. user changed civil status to married)
    if (item.status === 'skipped') {
      return {
        ...item,
        status: 'pending',
        issue_note: undefined,
      };
    }

    return item;
  });
}
