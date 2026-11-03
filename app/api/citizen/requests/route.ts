import { NextResponse } from 'next/server';
import { getCitizenRequests, resetRequestsToDemo } from '@/lib/citizen/requests';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-citizen-id, x-extension-id',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const citizenId = searchParams.get('citizenId') || undefined;

    const requests = getCitizenRequests(citizenId);
    return NextResponse.json(
      {
        success: true,
        data: requests,
        count: requests.length,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Failed to fetch citizen requests:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching requests' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === 'reset_demo') {
      const reset = resetRequestsToDemo();
      return NextResponse.json(
        {
          success: true,
          message: 'Citizen requests reset to demo defaults',
          data: reset,
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Failed to process citizen request mutation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
