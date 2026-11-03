import { describe, it, expect } from 'vitest';
import { searchCharterTool, getServiceRequirementsTool } from '../lib/ai/tools';
import { listAllServices } from '../lib/services/registry';

describe('M3 Agent Tools Tests', () => {
  describe('search_charter Tool', () => {
    it('finds charter chunks for NBI clearance questions', async () => {
      const res = await searchCharterTool({
        query: 'Paano kumuha ng NBI clearance at magkano ang bayad?',
      });

      expect(res.count).toBeGreaterThan(0);
      expect(res.results[0].agency).toBeDefined();
      expect(res.results[0].breadcrumb).toContain('NBI');
      expect(res.results[0].similarity).toBeGreaterThanOrEqual(0.65);
    });

    it('filters by agency_code when specified', async () => {
      const res = await searchCharterTool({
        query: 'requirements for birth certificate SECPA',
        agency_code: 'PSA',
      });

      expect(res.count).toBeGreaterThan(0);
      res.results.forEach((r) => {
        expect(r.agency).toContain('Statistics');
      });
    });

    it('returns 0 results for non-existent or irrelevant queries', async () => {
      const res = await searchCharterTool({
        query: 'astronomy black hole gravitational lensing',
      });

      expect(res.count).toBe(0);
      expect(res.results.length).toBe(0);
    });
  });

  describe('get_service_requirements Tool', () => {
    it('returns exact requirements and fee for NBI_CLEARANCE', async () => {
      const res = await getServiceRequirementsTool({ service_code: 'NBI_CLEARANCE' });

      expect(res.found).toBe(true);
      expect(res.service).toBeDefined();
      expect(res.service?.processingFee).toBe(130.0);
      expect(res.service?.convenienceFee).toBe(25.0);
      expect(res.service?.requirements.length).toBeGreaterThanOrEqual(3);

      const hasBarangay = res.service?.requirements.some((r) =>
        r.name.includes('Barangay Certification'),
      );
      expect(hasBarangay).toBe(true);
    });

    it('returns exact requirements and fee for PSA_BIRTH_CERT', async () => {
      const res = await getServiceRequirementsTool({ service_code: 'PSA_BIRTH_CERT' });

      expect(res.found).toBe(true);
      expect(res.service?.processingFee).toBe(155.0);
      expect(res.service?.agencyCode).toBe('PSA');
    });

    it('returns exact requirements and free fee for PHILHEALTH_REGISTRATION', async () => {
      const res = await getServiceRequirementsTool({ service_code: 'PHILHEALTH_REGISTRATION' });

      expect(res.found).toBe(true);
      expect(res.service?.processingFee).toBe(0.0);

      const hasPmrf = res.service?.requirements.some((r) => r.name.includes('PMRF'));
      expect(hasPmrf).toBe(true);
    });

    it('gracefully handles unknown service codes with suggestion list', async () => {
      const res = await getServiceRequirementsTool({ service_code: 'UNKNOWN_SERVICE' });

      expect(res.found).toBe(false);
      expect(res.availableServices).toBeDefined();
      expect(res.availableServices?.length).toBeGreaterThanOrEqual(4);
    });

    it('lists all registered MVP services', () => {
      const all = listAllServices();
      expect(all.length).toBeGreaterThanOrEqual(4);
      const codes = all.map((s) => s.code);
      expect(codes).toContain('NBI_CLEARANCE');
      expect(codes).toContain('PSA_BIRTH_CERT');
      expect(codes).toContain('PHILHEALTH_REGISTRATION');
      expect(codes).toContain('PSA_HELPLINE');
    });
  });
});
