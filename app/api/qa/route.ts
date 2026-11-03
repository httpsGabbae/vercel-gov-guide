import { NextRequest, NextResponse } from 'next/server';
import {
  searchQABank,
  getQAById,
  getQAsByService,
  getInspectionScenarios,
  getActionConfirmationScenarios,
  getQABankStats,
  loadQABank,
} from '@/lib/rag/qa-matcher';

/**
 * GET /api/qa
 * Query and inspect the GovGuide PH 1,000 Civic Q&A research knowledge base.
 *
 * Query Params:
 * - query: search string
 * - id: specific record ID (e.g., GGPH-0001)
 * - service: filter by government service name
 * - section: filter by section title (e.g., "04 — Privacy", "12 — Document inspection")
 * - basis: filter by basis ("source-summary", "safe-response", "design", "synthetic-scenario", "research-recommendation")
 * - stats: if "true", returns database statistics and coverage breakdown
 * - limit: max results to return (default: 10, max: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Stats endpoint
    if (searchParams.get('stats') === 'true') {
      const stats = getQABankStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // 2. Fetch specific record by ID
    const id = searchParams.get('id');
    if (id) {
      const record = getQAById(id.toUpperCase().trim());
      if (!record) {
        return NextResponse.json(
          { error: `Record not found with ID: ${id}` },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        data: record.entry,
        sources: record.sources,
      });
    }

    // 3. Inspection scenarios
    if (searchParams.get('type') === 'inspection') {
      const service = searchParams.get('service') || undefined;
      const scenarios = getInspectionScenarios(service);
      return NextResponse.json({
        success: true,
        count: scenarios.length,
        data: scenarios,
      });
    }

    // 4. Action confirmation scenarios
    if (searchParams.get('type') === 'actions') {
      const scenarios = getActionConfirmationScenarios();
      return NextResponse.json({
        success: true,
        count: scenarios.length,
        data: scenarios,
      });
    }

    // 5. Search by query or service
    const query = searchParams.get('query');
    const service = searchParams.get('service') || undefined;
    const section = searchParams.get('section') || undefined;
    const basisParam = searchParams.get('basis');
    const basisFilter = basisParam ? [basisParam as any] : undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    if (query) {
      const matches = searchQABank(query, {
        topK: limit,
        threshold: 0.2,
        serviceFilter: service,
        sectionFilter: section,
        basisFilter,
      });

      return NextResponse.json({
        success: true,
        query,
        count: matches.length,
        data: matches.map((m) => ({
          id: m.entry.id,
          section: m.entry.section,
          question: m.entry.question,
          answer: m.entry.answer,
          basis: m.entry.basis,
          service: m.entry.service,
          score: m.score,
          isDirectMatch: m.isDirectMatch,
          sources: m.sources.map((s) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            edition: s.edition,
          })),
        })),
      });
    }

    // 6. Filter by service if no query
    if (service) {
      const entries = getQAsByService(service);
      return NextResponse.json({
        success: true,
        service,
        count: entries.length,
        data: entries.slice(0, limit),
      });
    }

    // Default: return recent/sample records and total count
    const { entries } = loadQABank();
    return NextResponse.json({
      success: true,
      totalCount: entries.length,
      sample: entries.slice(0, limit),
    });
  } catch (err) {
    console.error('QA API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
