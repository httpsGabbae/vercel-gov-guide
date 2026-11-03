import { NextRequest, NextResponse } from 'next/server';
import {
  queryDpwhProjects,
  getDpwhProjectById,
  submitDpwhCitizenReport,
  listDpwhCitizenReports,
  type IslandGroup,
  type DpwhProjectCategory,
  type DpwhProjectStatus,
} from '@/lib/dpwh/projects';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const project = getDpwhProjectById(id);
      if (!project) {
        return NextResponse.json({ error: `Project not found: ${id}` }, { status: 404 });
      }
      const reports = listDpwhCitizenReports(project.id);
      return NextResponse.json({
        success: true,
        project,
        reports,
      });
    }

    const islandGroup = (searchParams.get('islandGroup') || 'ALL') as IslandGroup | 'ALL';
    const region = searchParams.get('region') || 'ALL';
    const category = (searchParams.get('category') || 'ALL') as DpwhProjectCategory | 'ALL';
    const status = (searchParams.get('status') || 'ALL') as DpwhProjectStatus | 'ALL';
    const search = searchParams.get('search') || '';

    const result = queryDpwhProjects({
      islandGroup,
      region,
      category,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      ...result,
      reports: listDpwhCitizenReports(),
    });
  } catch (err) {
    console.error('[GET /api/dpwh/projects] Error:', err);
    return NextResponse.json({ error: 'Failed to load DPWH projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, reporterName, observationType, comment } = body ?? {};

    if (!projectId || !comment) {
      return NextResponse.json(
        { error: 'projectId and comment are required.' },
        { status: 400 },
      );
    }

    const report = submitDpwhCitizenReport({
      projectId: String(projectId),
      reporterName: String(reporterName || 'Citizen Observer'),
      observationType: observationType || 'Progress Verification',
      comment: String(comment),
    });

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit report';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
