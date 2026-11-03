import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { chunkCharterMarkdown } from '../lib/rag/chunker';

describe('M2 Citizen Charter Chunker Tests', () => {
  it('correctly chunks the NBI clearance charter', () => {
    const filePath = path.resolve(process.cwd(), 'data/charters/nbi-clearance.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkCharterMarkdown(content, 'nbi-clearance.md');

    expect(chunks.length).toBeGreaterThan(3);
    const firstChunk = chunks[0];
    expect(firstChunk.agencyCode).toBe('NBI');
    expect(firstChunk.serviceCode).toBe('NBI_CLEARANCE');
    expect(firstChunk.fullBreadcrumb).toContain('NBI');

    // Check that fees and requirements metadata are detected
    const reqChunk = chunks.find((c) => c.sectionTitle.includes('Documentary Requirements'));
    expect(reqChunk).toBeDefined();
    expect(reqChunk?.metadata.hasRequirements).toBe(true);

    const feeChunk = chunks.find((c) => c.sectionTitle.includes('Processing Fees'));
    expect(feeChunk).toBeDefined();
    expect(feeChunk?.metadata.hasFees).toBe(true);
  });

  it('correctly chunks the PSA birth certificate charter', () => {
    const filePath = path.resolve(process.cwd(), 'data/charters/psa-birth-certificate.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkCharterMarkdown(content, 'psa-birth-certificate.md');

    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].agencyCode).toBe('PSA');
    expect(chunks[0].serviceCode).toBe('PSA_BIRTH_CERT');

    const secpaChunk = chunks.find((c) => c.content.includes('SECPA'));
    expect(secpaChunk).toBeDefined();
  });

  it('correctly chunks the PhilHealth registration charter', () => {
    const filePath = path.resolve(process.cwd(), 'data/charters/philhealth-registration.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkCharterMarkdown(content, 'philhealth-registration.md');

    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].agencyCode).toBe('PHILHEALTH');
    expect(chunks[0].serviceCode).toBe('PHILHEALTH_REGISTRATION');

    const pmrfChunk = chunks.find((c) => c.content.includes('PMRF'));
    expect(pmrfChunk).toBeDefined();
  });
});
