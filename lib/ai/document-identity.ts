import type { ApplicantProfile, InspectionReport } from '@/lib/services/charter-sources';

const placeholders =
  /^(not specified|unknown|n\/a|none|string|citizen applicant|citizen account|guest account)$/i;
export function usableIdentity(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && !placeholders.test(value.trim());
}
function normalized(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}
const identityFields = [
  {
    key: 'full_name',
    profile: 'display_name',
    aliases: ['full_name', 'name', 'child_name', 'child_full_name', 'display_name'],
    label: 'Full name',
  },
  {
    key: 'birth_date',
    profile: 'birth_date',
    aliases: ['birth_date', 'date_of_birth', 'dob'],
    label: 'Date of birth',
  },
  { key: 'father_name', profile: 'father_name', aliases: ['father_name'], label: "Father's name" },
  {
    key: 'mother_maiden_name',
    profile: 'mother_maiden_name',
    aliases: ['mother_maiden_name', 'mother_name'],
    label: "Mother's maiden name",
  },
] as const;

/** Compare OCR evidence to the pre-upload profile, never to the OCR-updated profile. */
export function compareDocumentIdentity(
  report: InspectionReport,
  profile: ApplicantProfile,
): InspectionReport {
  const fields = report.fields.map((field) => ({ ...field }));
  const issues = [...report.issues];
  for (const spec of identityFields) {
    const expected = profile[spec.profile];
    if (!usableIdentity(expected)) continue;
    const candidates = fields.filter(
      (f) =>
        (spec.aliases as readonly string[]).includes(f.key.toLowerCase()) &&
        usableIdentity(f.value),
    );
    for (const field of candidates) {
      field.expected = expected;
      if (normalized(field.value) === normalized(expected)) continue;
      field.status = 'mismatch';
      field.note =
        'Different from the saved profile; confirm the document owner and correct details before proceeding.';
      if (!issues.some((i) => i.id === `identity-${spec.key}`))
        issues.push({
          id: `identity-${spec.key}`,
          category: 'mismatch',
          severity: 'warning',
          field_key: field.key,
          title: `${spec.label} differs from saved profile`,
          detail: `Document: ${field.value}. Saved profile: ${expected}.`,
          how_to_fix:
            'Confirm whose document this is. Review the extracted value and saved details; do not change either automatically.',
          charter_rule:
            'Profile consistency check; this is not an agency rejection or an authenticity determination.',
          source_id: report.source_id,
        });
    }
  }
  // A model may mark a field as mismatched without emitting an issue.
  for (const field of fields.filter((f) => f.status === 'mismatch')) {
    if (!issues.some((i) => i.category === 'mismatch' && i.field_key === field.key))
      issues.push({
        id: `field-${field.key}`,
        category: 'mismatch',
        severity: 'warning',
        field_key: field.key,
        title: `${field.label} requires review`,
        detail:
          field.note || `${field.value} differs from ${field.expected || 'the comparison record'}.`,
        how_to_fix: 'Review the document and comparison record before proceeding.',
        charter_rule: 'Identity consistency review.',
        source_id: report.source_id,
      });
  }
  const reviewedIssues = issues.some((i) => i.category !== 'valid')
    ? issues.filter((i) => i.category !== 'valid')
    : issues;
  const summary_counts = { expired: 0, mismatch: 0, missing: 0, valid: 0 };
  for (const issue of reviewedIssues)
    if (issue.category in summary_counts) summary_counts[issue.category]++;
  return {
    ...report,
    fields,
    issues: reviewedIssues,
    summary_counts,
    overall_status:
      summary_counts.expired + summary_counts.mismatch + summary_counts.missing > 0
        ? 'issues_found'
        : 'counter_ready',
  };
}
