import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  PROFILES,
  createInitialChecklists,
  createInitialInspections,
  createInitialSavedFiles,
  createCleanChecklists,
} from '@/lib/citizen/defaults';
import type { Json } from '@/lib/supabase/types';
import type {
  ApplicantProfile,
  SavedVaultFile,
  ChecklistRequirementItem,
  InspectionReport,
} from '@/lib/services/charter-sources';

const DEFAULT_CITIZEN_ID = PROFILES.new_citizen.id;

// Memory cache for active session across hot updates & extension bridge
let latestActiveCitizenId: string = PROFILES.new_citizen.id;
let latestActiveApplicant: ApplicantProfile = PROFILES.new_citizen;
let latestActiveSavedFiles: SavedVaultFile[] = [];
let latestActiveChecklists: ChecklistRequirementItem[] = createCleanChecklists();
let latestActiveInspections: InspectionReport[] = [];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-citizen-id, x-extension-id',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

interface CitizenDetailsPayload {
  applicant: ApplicantProfile;
  saved_files: SavedVaultFile[];
  checklists: ChecklistRequirementItem[];
  inspections: InspectionReport[];
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('citizenId');
    const isExplicitActiveQuery = !queryId || queryId === 'active' || queryId === 'latest';
    const citizenId = isExplicitActiveQuery ? latestActiveCitizenId : (queryId || DEFAULT_CITIZEN_ID);

    // Instant return if querying active session and in-memory cache has applicant data
    if (isExplicitActiveQuery && latestActiveApplicant && latestActiveApplicant.id === citizenId) {
      return NextResponse.json(
        {
          ok: true,
          source: 'active_session_cache',
          applicant: latestActiveApplicant,
          savedFiles: latestActiveSavedFiles,
          checklistItems: latestActiveChecklists,
          inspections: latestActiveInspections,
        },
        { headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', citizenId)
      .maybeSingle();

    if (profile) {
      const consent = (profile.consent_settings as CitizenDetailsPayload) || {};
      const savedApplicant = consent.applicant;

      if (savedApplicant) {
        const isDemoPersona = profile.id === PROFILES.jobseeker.id || profile.id === PROFILES.married_applicant.id;
        const cleanDisplayName = (!isDemoPersona && savedApplicant.display_name === 'Juan Santos Dela Cruz')
          ? (profile.full_name || '')
          : (savedApplicant.display_name || profile.full_name || '');
        const cleanApplicant: ApplicantProfile = (!isDemoPersona && savedApplicant.display_name === 'Juan Santos Dela Cruz')
          ? {
              ...savedApplicant,
              display_name: cleanDisplayName,
              first_name: profile.first_name || '',
              middle_name: profile.middle_name || '',
              last_name: profile.last_name || '',
              birth_date: profile.birth_date || '',
              civil_status: profile.civil_status || '',
              barangay: profile.barangay || '',
              city: profile.city || '',
            }
          : {
              ...savedApplicant,
              display_name: cleanDisplayName,
            };

        if (!isDemoPersona) {
          const hasPhilsysDoc = Array.isArray(consent.saved_files) && consent.saved_files.some((f: any) =>
            /philsys|national[- ]id|pambansang|ephilid/i.test(`${f.document_type || ''} ${f.name || ''} ${f.file_name || ''}`)
          );
          const hasPhilhealthDoc = Array.isArray(consent.saved_files) && consent.saved_files.some((f: any) =>
            /philhealth|pmrf|mdr/i.test(`${f.document_type || ''} ${f.name || ''} ${f.file_name || ''}`)
          );
          const hasTinDoc = Array.isArray(consent.saved_files) && consent.saved_files.some((f: any) =>
            /tin|bir|orus|1901|1902|1904/i.test(`${f.document_type || ''} ${f.name || ''} ${f.file_name || ''}`)
          );
          const hasSssDoc = Array.isArray(consent.saved_files) && consent.saved_files.some((f: any) =>
            /sss|umid|crn|e-1/i.test(`${f.document_type || ''} ${f.name || ''} ${f.file_name || ''}`)
          );

          if (!hasPhilsysDoc && (cleanApplicant.philsys_id === '1234-5678-9012-3456' || cleanApplicant.philsys_id === '8765-4321-0987-6543')) {
            cleanApplicant.philsys_id = '';
            cleanApplicant.philsys_card_number = '';
          }
          if (!hasPhilhealthDoc && (cleanApplicant.philhealth_number === '12-345678901-2' || cleanApplicant.philhealth_number === '23-456789012-3')) {
            cleanApplicant.philhealth_number = '';
          }
          if (!hasTinDoc && (cleanApplicant.tin === '123-456-789-000' || cleanApplicant.tin === '234-567-890-000')) {
            cleanApplicant.tin = '';
            cleanApplicant.tin_number = '';
          }
          if (!hasSssDoc && (cleanApplicant.sss_number === '03-9876543-2' || cleanApplicant.sss_number === '04-8765432-1')) {
            cleanApplicant.sss_number = '';
          }
        }

        return NextResponse.json(
          {
            ok: true,
            source: 'supabase_profile',
            applicant: {
              ...cleanApplicant,
              id: profile.id,
            },
            savedFiles: Array.isArray(consent.saved_files) ? consent.saved_files : [],
            checklistItems: Array.isArray(consent.checklists) ? consent.checklists : createCleanChecklists(),
            inspections: Array.isArray(consent.inspections) ? consent.inspections : [],
          },
          { headers: corsHeaders }
        );
      }

      // Profile exists but no saved consent applicant yet: return clean profile data
      return NextResponse.json(
        {
          ok: true,
          source: 'supabase_profile_fresh',
          applicant: {
            id: profile.id,
            role: 'citizen',
            display_name: profile.full_name || '',
            first_name: profile.first_name || '',
            middle_name: profile.middle_name || '',
            last_name: profile.last_name || '',
            suffix: profile.suffix || '',
            initials: (profile.full_name || 'CA').slice(0, 2).toUpperCase(),
            title: 'Citizen Account',
            birth_date: profile.birth_date || '',
            civil_status: profile.civil_status || '',
            barangay: profile.barangay || '',
            city: profile.city || '',
            phone: profile.phone || '',
            email: profile.email || '',
          },
          savedFiles: [],
          checklistItems: createCleanChecklists(),
          inspections: [],
        },
        { headers: corsHeaders }
      );
    }

    const isMockJobseeker =
      citizenId === PROFILES.jobseeker.id ||
      citizenId === 'jobseeker' ||
      citizenId === 'demo_jobseeker';
    const isMockMarried =
      citizenId === PROFILES.married_applicant.id ||
      citizenId === 'married_applicant' ||
      citizenId === 'demo_married';

    // Mock accounts belong strictly to the guest account demo modes
    if (isMockJobseeker) {
      return NextResponse.json(
        {
          ok: true,
          source: 'mock_guest_demo',
          applicant: PROFILES.jobseeker,
          savedFiles: createInitialSavedFiles(),
          checklistItems: createInitialChecklists(),
          inspections: createInitialInspections(),
        },
        { headers: corsHeaders }
      );
    }

    if (isMockMarried) {
      return NextResponse.json(
        {
          ok: true,
          source: 'mock_guest_demo',
          applicant: PROFILES.married_applicant,
          savedFiles: [],
          checklistItems: createInitialChecklists(),
          inspections: [],
        },
        { headers: corsHeaders }
      );
    }

    // Default Fresh Account (clean slate, zero mock data)
    const freshApplicant: ApplicantProfile = {
      id: citizenId,
      role: 'new_citizen',
      display_name: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      initials: '',
      title: 'Guest Account',
      birth_date: '',
      civil_status: '',
      barangay: '',
      city: '',
      province: '',
      region: '',
      street_address: '',
      residential_address: '',
      zip_code: '',
      place_of_birth: '',
      email: '',
      phone: '',
      contact_number: '',
      maiden_name: '',
      father_name: '',
      father_first_name: '',
      father_middle_name: '',
      father_last_name: '',
      father_suffix: '',
      mother_maiden_name: '',
      mother_first_name: '',
      mother_middle_name: '',
      mother_last_name: '',
      mother_suffix: '',
      philsys_id: '',
      philsys_card_number: '',
      philhealth_number: '',
      tin: '',
      tin_number: '',
      sss_number: '',
      pagibig_number: '',
      passport_number: '',
    };

    return NextResponse.json(
      {
        ok: true,
        source: 'fresh_clean_account',
        applicant: freshApplicant,
        savedFiles: [],
        checklistItems: createCleanChecklists(),
        inspections: [],
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve citizen details';
    return NextResponse.json({ ok: false, message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      citizenId = DEFAULT_CITIZEN_ID,
      applicant,
      savedFiles,
      checklistItems,
      inspections,
    } = body;

    if (!applicant) {
      return NextResponse.json(
        { ok: false, message: 'Invalid payload: applicant profile is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Always update the active session memory cache immediately
    latestActiveCitizenId = citizenId;
    latestActiveApplicant = applicant;
    if (Array.isArray(savedFiles)) latestActiveSavedFiles = savedFiles;
    if (Array.isArray(checklistItems)) latestActiveChecklists = checklistItems;
    if (Array.isArray(inspections)) latestActiveInspections = inspections;

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', citizenId)
      .maybeSingle();

    const emailToSave = applicant.email || existingProfile?.email || 'citizen@govguide.ph';
    const fullNameToSave = applicant.display_name || existingProfile?.full_name || 'Citizen Applicant';

    const upsertData: Record<string, unknown> = {
      id: citizenId,
      full_name: fullNameToSave,
      email: emailToSave,
      role: 'citizen',
      phone: applicant.phone || null,
      consent_settings: {
        ephemeral_biometrics: true,
        audit_logging: true,
        ai_assisted: true,
        applicant,
        saved_files: Array.isArray(savedFiles) ? savedFiles : [],
        checklists: Array.isArray(checklistItems) ? checklistItems : [],
        inspections: Array.isArray(inspections) ? inspections : [],
      },
      updated_at: now,
    };

    const { error } = await supabase.from('profiles').upsert(upsertData as any, { onConflict: 'id' });

    if (error) {
      console.error('[citizen/details/POST] Supabase error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true, source: 'supabase', updated_at: now }, { headers: corsHeaders });
  } catch (err) {
    console.error('[citizen/details/POST] Catch error:', err);
    const message = err instanceof Error ? err.message : 'Failed to save citizen details';
    return NextResponse.json({ ok: false, message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const citizenId = searchParams.get('citizenId') || DEFAULT_CITIZEN_ID;

    const isMarried = citizenId === PROFILES.married_applicant.id;
    const initialApplicant = isMarried ? PROFILES.married_applicant : PROFILES.jobseeker;
    const initialFiles = createInitialSavedFiles();
    const initialChecklists = createInitialChecklists();
    const initialInspections = createInitialInspections();

    const supabase = createServiceClient();
    await supabase.from('profiles').update({
      full_name: initialApplicant.display_name,
      consent_settings: {
        ephemeral_biometrics: true,
        audit_logging: true,
        ai_assisted: true,
        applicant: initialApplicant,
        saved_files: initialFiles,
        checklists: initialChecklists,
        inspections: initialInspections,
      } as unknown as Json,
      updated_at: new Date().toISOString(),
    }).eq('id', citizenId);

    return NextResponse.json({ ok: true, reset_citizen_id: citizenId }, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset citizen details';
    return NextResponse.json({ ok: false, message }, { status: 500, headers: corsHeaders });
  }
}
