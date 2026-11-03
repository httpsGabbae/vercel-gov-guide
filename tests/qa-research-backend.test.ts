import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  loadQABank,
  searchQABank,
  getQAById,
  getQAsByService,
  getInspectionScenarios,
  getActionConfirmationScenarios,
  getQABankStats,
  detectServiceFromQuery,
} from '../lib/rag/qa-matcher';
import { getServiceByCode, listAllServices } from '../lib/services/registry';
import { searchQABankTool } from '../lib/ai/tools';
import { GET as getQAHandler } from '../app/api/qa/route';

describe('GovGuide PH Research Knowledge & Backend Implementation Tests', () => {
  describe('1. Q&A Research Corpus Loading & Statistics', () => {
    it('loads exactly 1,000 Q&A pairs from the research bundle', () => {
      const { entries } = loadQABank();
      expect(entries.length).toBe(1000);
      expect(entries[0].id).toBe('GGPH-0001');
      expect(entries[999].id).toBe('GGPH-1000');
    });

    it('loads at least 45 verified primary government sources', () => {
      const { sources } = loadQABank();
      expect(sources.size).toBeGreaterThanOrEqual(45);
      const nbiSource = sources.get('S01');
      expect(nbiSource).toBeDefined();
      expect(nbiSource?.title).toContain('NBI');
      expect(nbiSource?.url).toContain('nbi.gov.ph');
    });

    it('loads 20 official open data resources and benchmarks', () => {
      const { resources } = loadQABank();
      expect(resources.length).toBe(20);
      const names = resources.map((r) => r.name);
      expect(names).toContain('PSA Philippine Standard Geographic Code');
      expect(names).toContain('PhilHealth PMRF blank form');
      expect(names).toContain('Open Data Philippines');
    });

    it('validates distribution across all 14 knowledge sections', () => {
      const stats = getQABankStats();
      expect(stats.totalRecords).toBe(1000);
      expect(Object.keys(stats.sections).length).toBeGreaterThanOrEqual(14);
      expect(stats.bases['design']).toBe(150);
      expect(stats.bases['synthetic-scenario']).toBe(450);
      expect(stats.bases['safe-response']).toBe(225);
    });
  });

  describe('2. Multi-Agency Civic Services Coverage (15 Services)', () => {
    const expectedServices = [
      'NBI clearance',
      'PSA birth certificate',
      'PSA marriage certificate',
      'PSA CENOMAR',
      'PhilHealth registration',
      'SSS registration',
      'Pag-IBIG membership',
      'DFA passport preparation',
      'DTI business-name registration',
      'BIR Digital TIN and updates',
      'PRC LERIS services',
      'LTO student permit',
      'DSWD AICS assistance',
      'Digital National ID',
      'PWD ID routing',
    ];

    it('contains research questions for all 15 government services', () => {
      const stats = getQABankStats();
      for (const s of expectedServices) {
        expect(stats.services[s]).toBeDefined();
        expect(stats.services[s]).toBeGreaterThanOrEqual(20);
      }
    });

    it('detects service intents correctly from user query strings', () => {
      expect(detectServiceFromQuery('Paano kumuha ng NBI clearance renewal?')).toBe('NBI clearance');
      expect(detectServiceFromQuery('Kailangan ko ng PSA birth cert para sa school')).toBe('PSA birth certificate');
      expect(detectServiceFromQuery('Saan kumukuha ng CENOMAR singleness certificate?')).toBe('PSA CENOMAR');
      expect(detectServiceFromQuery('Magkano ang bayad sa DFA passport appointment?')).toBe('DFA passport preparation');
      expect(detectServiceFromQuery('Paano magrehistro ng Digital TIN ID sa BIR ORUS?')).toBe('BIR Digital TIN and updates');
      expect(detectServiceFromQuery('Ano ang kailangan sa LTO student permit at medical?')).toBe('LTO student permit');
      expect(detectServiceFromQuery('Requirements for SSS E-1 online number')).toBe('SSS registration');
      expect(detectServiceFromQuery('Paano mag-apply ng PWD ID sa aming munisipyo?')).toBe('PWD ID routing');
    });

    it('expands the services registry to include definitions for all 15 services', () => {
      const allServices = listAllServices();
      expect(allServices.length).toBeGreaterThanOrEqual(15);

      const codes = allServices.map((s) => s.code);
      expect(codes).toContain('NBI_CLEARANCE');
      expect(codes).toContain('PSA_BIRTH_CERT');
      expect(codes).toContain('PSA_MARRIAGE_CERT');
      expect(codes).toContain('PSA_CENOMAR');
      expect(codes).toContain('PHILHEALTH_REGISTRATION');
      expect(codes).toContain('SSS_REGISTRATION');
      expect(codes).toContain('PAGIBIG_MEMBERSHIP');
      expect(codes).toContain('DFA_PASSPORT');
      expect(codes).toContain('DTI_BUSINESS_NAME');
      expect(codes).toContain('BIR_TIN');
      expect(codes).toContain('PRC_LERIS');
      expect(codes).toContain('LTO_STUDENT_PERMIT');
      expect(codes).toContain('DSWD_AICS');
      expect(codes).toContain('NATIONAL_ID');
      expect(codes).toContain('PWD_ID');
    });

    it('resolves common service aliases in getServiceByCode', () => {
      expect(getServiceByCode('SSS')?.code).toBe('SSS_REGISTRATION');
      expect(getServiceByCode('DFA')?.code).toBe('DFA_PASSPORT');
      expect(getServiceByCode('PASSPORT')?.code).toBe('DFA_PASSPORT');
      expect(getServiceByCode('TIN')?.code).toBe('BIR_TIN');
      expect(getServiceByCode('BIR')?.code).toBe('BIR_TIN');
      expect(getServiceByCode('PRC')?.code).toBe('PRC_LERIS');
      expect(getServiceByCode('LTO')?.code).toBe('LTO_STUDENT_PERMIT');
      expect(getServiceByCode('PWD')?.code).toBe('PWD_ID');
      expect(getServiceByCode('CENOMAR')?.code).toBe('PSA_CENOMAR');
    });
  });

  describe('3. Grounded Q&A Retrieval Engine', () => {
    it('retrieves accurate definition and purpose for balik-pila', () => {
      const matches = searchQABank('What does balik-pila mean in this project?');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].entry.id).toBe('GGPH-0004');
      expect(matches[0].entry.answer).toContain('returning to a government queue');
    });

    it('enforces that GovGuide PH does not claim to be a government agency', () => {
      const matches = searchQABank('Is GovGuide PH a government agency?');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].entry.answer).toContain('assistance platform');
      expect(matches[0].entry.answer).toContain('Do not imply government ownership');
    });

    it('enforces ephemeral document lifecycle under RA 10173', () => {
      const matches = searchQABank('What does ephemeral document handling require in practice?');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].entry.answer).toContain('deletion for uploads, temporary files');
    });

    it('retrieves document inspection scenarios (Section 12)', () => {
      const scenarios = getInspectionScenarios('NBI clearance');
      expect(scenarios.length).toBe(20);
      const first = scenarios[0];
      expect(first.section).toContain('12 — Document inspection scenarios');
      expect(first.fixture).toBeDefined();
    });

    it('retrieves action confirmation scenarios (Section 13)', () => {
      const scenarios = getActionConfirmationScenarios();
      expect(scenarios.length).toBe(150);
      const previewCase = scenarios.find((s) => s.template_family === 'action-preview');
      expect(previewCase).toBeDefined();
      expect(previewCase?.expected_behavior).toContain('no execution before confirmation');
    });

    it('resolves primary sources correctly on retrieved Q&As', () => {
      const result = getQAById('GGPH-0151'); // NBI charter question
      expect(result).not.toBeNull();
      expect(result?.entry.question).toContain('NBI Charter');
      expect(result?.sources.length).toBeGreaterThan(0);
      expect(result?.sources[0].id).toBe('S01');
      expect(result?.sources[0].url).toContain('nbi.gov.ph');
    });
  });

  describe('4. Agent Tool search_qa_bank', () => {
    it('returns structured search results with citations and scores', async () => {
      const toolRes = await searchQABankTool({
        query: 'What must a submission preview contain?',
      });

      expect(toolRes.count).toBeGreaterThan(0);
      expect(toolRes.results[0].id).toBe('GGPH-0076');
      expect(toolRes.results[0].answer).toContain('Show the exact destination');
    });

    it('supports service filtering in search_qa_bank tool', async () => {
      const toolRes = await searchQABankTool({
        query: 'Can you promise my clearance will be released today?',
        service: 'NBI clearance',
      });

      expect(toolRes.count).toBeGreaterThan(0);
      expect(toolRes.results[0].answer).toContain('cannot establish your actual processing outcome');
    });
  });

  describe('5. REST API Route (/api/qa)', () => {
    it('returns dataset statistics on GET /api/qa?stats=true', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa?stats=true');
      const res = await getQAHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats.totalRecords).toBe(1000);
      expect(json.stats.sourcesCount).toBeGreaterThanOrEqual(45);
    });

    it('returns a single record with sources on GET /api/qa?id=GGPH-0001', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa?id=GGPH-0001');
      const res = await getQAHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('GGPH-0001');
      expect(json.data.question).toContain('What problem does GovGuide PH address?');
    });

    it('returns 404 for non-existent record ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa?id=GGPH-9999');
      const res = await getQAHandler(req);
      expect(res.status).toBe(404);
    });

    it('performs semantic query search on GET /api/qa?query=...', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa?query=what+is+balik-pila');
      const res = await getQAHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBeGreaterThan(0);
      expect(json.data[0].question).toContain('balik-pila');
    });

    it('returns inspection scenarios on GET /api/qa?type=inspection', async () => {
      const req = new NextRequest('http://localhost:3000/api/qa?type=inspection&service=PSA+birth+certificate');
      const res = await getQAHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(20);
    });
  });
});
