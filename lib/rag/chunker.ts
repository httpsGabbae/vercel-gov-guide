export interface CharterChunk {
  id: string;
  agencyCode: string;
  agencyName: string;
  serviceCode: string;
  serviceName: string;
  sectionTitle: string;
  content: string;
  fullBreadcrumb: string;
  metadata: {
    sourceFile: string;
    sectionNumber?: string;
    hasFees?: boolean;
    hasRequirements?: boolean;
    keywords?: string[];
  };
}

/**
 * Parses Citizen Charter markdown documents into semantically coherent,
 * self-contained chunks suitable for vector retrieval and grounded RAG.
 */
export function chunkCharterMarkdown(markdown: string, sourceFile: string): CharterChunk[] {
  const lines = markdown.split('\n');

  let agencyCode = 'UNKNOWN';
  let agencyName = 'Unknown Agency';
  let serviceCode = 'UNKNOWN_SERVICE';
  let serviceName = 'Unknown Service';

  // Infer Agency & Service from filename and front content
  const lowerFile = sourceFile.toLowerCase();
  if (lowerFile.includes('nbi')) {
    agencyCode = 'NBI';
    agencyName = 'National Bureau of Investigation';
    serviceCode = 'NBI_CLEARANCE';
    serviceName = 'Issuance of NBI Clearance';
  } else if (lowerFile.includes('psa')) {
    agencyCode = 'PSA';
    agencyName = 'Philippine Statistics Authority';
    serviceCode = 'PSA_BIRTH_CERT';
    serviceName = 'Issuance of Birth Certificate (SECPA)';
  } else if (lowerFile.includes('philhealth')) {
    agencyCode = 'PHILHEALTH';
    agencyName = 'Philippine Health Insurance Corporation';
    serviceCode = 'PHILHEALTH_REGISTRATION';
    serviceName = 'Member Registration & PIN/MDR Issuance';
  }

  const sections: { title: string; lines: string[] }[] = [];
  let currentTitle = 'Overview';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for H1 or H2 markdown headings
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, lines: [...currentLines] });
        currentLines = [];
      }
      currentTitle = trimmed.replace(/^#+\s*/, '').trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, lines: [...currentLines] });
  }

  const chunks: CharterChunk[] = [];

  sections.forEach((sec, idx) => {
    const bodyText = sec.lines.join('\n').trim();
    if (!bodyText || bodyText.length < 20) return;

    const fullBreadcrumb = `${agencyCode} — ${serviceName} > ${sec.title}`;
    const formattedContent = `### ${fullBreadcrumb}\n\n${bodyText}`;

    // Extract quick flags for metadata
    const lowerBody = bodyText.toLowerCase();
    const hasFees =
      lowerBody.includes('fee') ||
      lowerBody.includes('cost') ||
      lowerBody.includes('₱') ||
      lowerBody.includes('free');
    const hasRequirements =
      lowerBody.includes('requirement') ||
      lowerBody.includes('id') ||
      lowerBody.includes('form') ||
      lowerBody.includes('document');

    const keywords: string[] = [];
    if (lowerBody.includes('hit')) keywords.push('HIT');
    if (lowerBody.includes('first-time') || lowerBody.includes('ra 11261')) keywords.push('first_time_jobseeker');
    if (lowerBody.includes('secpa')) keywords.push('SECPA');
    if (lowerBody.includes('pmrf')) keywords.push('PMRF');
    if (lowerBody.includes('delivery')) keywords.push('delivery');

    chunks.push({
      id: `${agencyCode.toLowerCase()}-${idx + 1}`,
      agencyCode,
      agencyName,
      serviceCode,
      serviceName,
      sectionTitle: sec.title,
      content: formattedContent,
      fullBreadcrumb,
      metadata: {
        sourceFile,
        hasFees,
        hasRequirements,
        keywords,
      },
    });
  });

  return chunks;
}
