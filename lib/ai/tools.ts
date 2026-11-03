import { retrieveCharterChunks, type RetrievedChunk } from '../rag/retrieve';
import { getServiceByCode, listAllServices, type ServiceDefinition } from '../services/registry';
import { searchQABank, type QAMatchResult } from '../rag/qa-matcher';
import { queryDpwhProjects, type DpwhProject, type IslandGroup, type DpwhProjectCategory } from '../dpwh/projects';
import {
  DFA_CONSULAR_OFFICES,
  DFA_APPLICATION_CATEGORIES,
  getDfaSlotsForSiteAndDate,
  type DfaConsularOffice,
  type DfaTimeSlot,
} from '../dfa/appointments';

export interface SearchCharterToolResult {
  query: string;
  count: number;
  results: {
    agency: string;
    service: string;
    section: string;
    breadcrumb: string;
    similarity: number;
    content: string;
  }[];
}

export interface SearchQABankToolResult {
  query: string;
  count: number;
  results: {
    id: string;
    section: string;
    question: string;
    answer: string;
    basis: string;
    score: number;
    sources: { id: string; title: string; url: string }[];
  }[];
}

export interface ServiceRequirementsToolResult {
  found: boolean;
  service?: ServiceDefinition;
  availableServices?: { code: string; name: string; agency: string }[];
}

/**
 * Tool: search_charter
 * Semantic vector search over official Philippine Citizen's Charters.
 */
export async function searchCharterTool(args: {
  query: string;
  agency_code?: string;
}): Promise<SearchCharterToolResult> {
  const chunks: RetrievedChunk[] = await retrieveCharterChunks(args.query, {
    agencyCode: args.agency_code,
    threshold: 0.65,
    limit: 4,
  });

  return {
    query: args.query,
    count: chunks.length,
    results: chunks.map(({ chunk, similarity }) => ({
      agency: chunk.agencyName,
      service: chunk.serviceName,
      section: chunk.sectionTitle,
      breadcrumb: chunk.fullBreadcrumb,
      similarity,
      content: chunk.content,
    })),
  };
}

/**
 * Tool: search_qa_bank
 * Semantic & keyword search over the 1,000 research-vetted Philippine civic Q&As,
 * covering 15 government agencies, edge cases, document inspection risks, and confirmation rules.
 */
export async function searchQABankTool(args: {
  query: string;
  service?: string;
  section?: string;
}): Promise<SearchQABankToolResult> {
  const matches: QAMatchResult[] = searchQABank(args.query, {
    topK: 4,
    threshold: 0.25,
    serviceFilter: args.service,
    sectionFilter: args.section,
  });

  return {
    query: args.query,
    count: matches.length,
    results: matches.map(({ entry, score, sources }) => ({
      id: entry.id,
      section: entry.section,
      question: entry.question,
      answer: entry.answer,
      basis: entry.basis,
      score,
      sources: sources.map((s) => ({ id: s.id, title: s.title, url: s.url })),
    })),
  };
}

/**
 * Tool: get_service_requirements
 * Retrieves official structured checklist and counter fees for registered Philippine services.
 */
export async function getServiceRequirementsTool(args: {
  service_code: string;
}): Promise<ServiceRequirementsToolResult> {
  const service = getServiceByCode(args.service_code);
  if (!service) {
    return {
      found: false,
      availableServices: listAllServices().map((s) => ({
        code: s.code,
        name: s.name,
        agency: s.agencyName,
      })),
    };
  }

  return {
    found: true,
    service,
  };
}

export interface DpwhToolResult {
  count: number;
  totalNationwide: number;
  averageProgress: number;
  projects: {
    contractId: string;
    title: string;
    category: string;
    islandGroup: string;
    region: string;
    location: string;
    progress: number;
    budgetBillions: number;
    targetCompletion: string;
    description: string;
  }[];
}

/**
 * Tool: query_dpwh_projects
 * Searches nationwide active DPWH infrastructure projects across Luzon, Visayas, and Mindanao.
 */
export async function queryDpwhProjectsTool(args: {
  search?: string;
  islandGroup?: IslandGroup | 'ALL';
  category?: DpwhProjectCategory | 'ALL';
}): Promise<DpwhToolResult> {
  const result = queryDpwhProjects({
    search: args.search,
    islandGroup: args.islandGroup,
    category: args.category,
  });

  return {
    count: result.projects.length,
    totalNationwide: result.stats.nationwideTotal,
    averageProgress: result.stats.averageProgress,
    projects: result.projects.map((p) => ({
      contractId: p.contractId,
      title: p.title,
      category: p.category,
      islandGroup: p.islandGroup,
      region: p.region,
      location: `${p.cityMunicipality}, ${p.province}`,
      progress: p.physicalProgress,
      budgetBillions: Math.round((p.budgetPhp / 1_000_000_000) * 100) / 100,
      targetCompletion: p.targetCompletionDate,
      description: p.description,
    })),
  };
}

export interface DfaSlotsToolResult {
  siteCode: string;
  siteName: string;
  city: string;
  operatingHours: string;
  date: string;
  slots: {
    id: string;
    timeWindow: string;
    availableCount: number;
    status: 'OPEN' | 'LIMITED' | 'FULL';
  }[];
}

/**
 * Tool: get_dfa_appointment_slots
 * Checks real-time appointment slot availability for a specific DFA Consular Office and date.
 */
export async function getDfaAppointmentSlotsTool(args: {
  siteCode?: string;
  date?: string;
}): Promise<DfaSlotsToolResult> {
  const code = args.siteCode || 'DFA-ASEANA';
  const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
  const date = args.date || tomorrow;

  const office = DFA_CONSULAR_OFFICES.find((o) => o.code === code) || DFA_CONSULAR_OFFICES[0];
  const slots: DfaTimeSlot[] = getDfaSlotsForSiteAndDate(office.code, date);

  return {
    siteCode: office.code,
    siteName: office.name,
    city: office.city,
    operatingHours: office.operatingHours,
    date,
    slots: slots.map((s) => ({
      id: s.id,
      timeWindow: s.timeWindow,
      availableCount: s.availableCount,
      status: s.availableCount <= 0 ? 'FULL' : s.availableCount <= 5 ? 'LIMITED' : 'OPEN',
    })),
  };
}

/**
 * Gemini Tool Declaration schemas for Function Calling.
 */
export const AGENT_TOOLS_DEFINITIONS = [
  {
    name: 'search_charter',
    description:
      "Performs semantic search over official Philippine Citizen's Charters. Use this tool whenever a citizen asks about rules, eligibility, valid IDs, fees, processing turnaround, or 'HIT' procedures.",
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        query: {
          type: 'STRING' as const,
          description: 'The citizen question or keywords (e.g. "NBI clearance requirements first-time jobseeker")',
        },
        agency_code: {
          type: 'STRING' as const,
          description: 'Optional agency filter: "NBI", "PSA", "PHILHEALTH", "SSS", "PAGIBIG", "DFA", "BIR", etc.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_qa_bank',
    description:
      "Searches the GovGuide PH 1,000 vetted Civic Q&A knowledge base. Use for specific edge cases, document inspection questions (glare, blur, expiration), action confirmation safety (double clicks, cancellations), privacy rules (RA 10173), or services across all 15 agencies.",
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        query: {
          type: 'STRING' as const,
          description: 'The specific question or scenario to search for.',
        },
        service: {
          type: 'STRING' as const,
          description: 'Optional service filter (e.g. "NBI clearance", "DFA passport preparation", "BIR Digital TIN and updates").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_service_requirements',
    description:
      'Retrieves the exact official documentary requirements checklist, fees, and tips for a specific registered government service.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        service_code: {
          type: 'STRING' as const,
          description:
            'The official service code: "NBI_CLEARANCE", "PSA_BIRTH_CERT", "PSA_MARRIAGE_CERT", "PSA_CENOMAR", "PHILHEALTH_REGISTRATION", "SSS_REGISTRATION", "PAGIBIG_MEMBERSHIP", "DFA_PASSPORT", "DTI_BUSINESS_NAME", "BIR_TIN", "PRC_LERIS", "LTO_STUDENT_PERMIT", "DSWD_AICS", "NATIONAL_ID", "PWD_ID", "DPWH_PROJECTS"',
        },
      },
      required: ['service_code'],
    },
  },
  {
    name: 'query_dpwh_projects',
    description:
      'Queries active nationwide DPWH infrastructure projects across Luzon, Visayas, and Mindanao (bridges, expressways, flood control, mountain tunnels, specialty hospitals).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        search: {
          type: 'STRING' as const,
          description: 'Search keyword (e.g. "Bataan-Cavite", "Davao bypass", "Panguil Bay", "Cebu")',
        },
        islandGroup: {
          type: 'STRING' as const,
          description: 'Optional filter: "Luzon", "Visayas", "Mindanao", or "ALL"',
        },
      },
    },
  },
  {
    name: 'get_dfa_appointment_slots',
    description:
      'Checks live available hourly passport appointment slots, daily capacity, and requirements across 10 DFA Consular Offices nationwide.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        siteCode: {
          type: 'STRING' as const,
          description: 'DFA Consular Office code: "DFA-ASEANA", "DFA-MEGAMALL", "DFA-NORTH", "DFA-CEBU", "DFA-DAVAO", etc.',
        },
        date: {
          type: 'STRING' as const,
          description: 'Desired appointment date in YYYY-MM-DD format.',
        },
      },
    },
  },
];
