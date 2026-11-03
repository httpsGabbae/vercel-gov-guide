import { retrieveCharterChunks, type RetrievedChunk } from '../rag/retrieve';
import { getServiceByCode, listAllServices, type ServiceDefinition } from '../services/registry';

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

/**
 * Gemini Tool Declaration schemas for Function Calling.
 */
export const AGENT_TOOLS_DEFINITIONS = [
  {
    name: 'search_charter',
    description:
      "Performs semantic search over official Philippine Citizen's Charters (NBI, PSA, PhilHealth). Use this tool whenever a citizen asks about rules, eligibility, valid IDs, fees, processing turnaround, or 'HIT' procedures.",
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        query: {
          type: 'STRING' as const,
          description: 'The citizen question or keywords (e.g. "NBI clearance requirements first-time jobseeker")',
        },
        agency_code: {
          type: 'STRING' as const,
          description: 'Optional agency filter: "NBI", "PSA", or "PHILHEALTH"',
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
          description: 'The official service code: "NBI_CLEARANCE", "PSA_BIRTH_CERT", or "PHILHEALTH_REGISTRATION"',
        },
      },
      required: ['service_code'],
    },
  },
];
