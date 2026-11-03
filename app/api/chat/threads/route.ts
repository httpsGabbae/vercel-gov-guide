import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Server-side in-memory cache as resilient backup when running in offline or mock modes
const memoryThreadsStore = new Map<
  string,
  {
    id: string;
    title: string;
    messages: unknown[];
    applicant_name: string;
    content_hash: string;
    created_at: string;
    updated_at: string;
  }
>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || '30'), 100);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return NextResponse.json({ ok: true, source: 'supabase', threads: data });
    }

    // Fallback to in-memory store
    const memList = Array.from(memoryThreadsStore.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    return NextResponse.json({ ok: true, source: 'memory', threads: memList });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const memList = Array.from(memoryThreadsStore.values());
    return NextResponse.json({
      ok: true,
      source: 'memory_fallback',
      warning: errorMessage,
      threads: memList,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, messages, applicantName, citizenId } = body;

    if (!id || !title || !Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid payload: id, title, and messages array are required' },
        { status: 400 },
      );
    }

    // Cryptographic SHA-256 hash of the complete message thread and civic metadata
    const rawPayload = JSON.stringify({ id, title, applicantName: applicantName || 'Citizen', messages });
    const contentHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const now = new Date().toISOString();

    const validCitizenId =
      citizenId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(citizenId))
        ? String(citizenId)
        : null;

    const threadRecord = {
      id: String(id),
      citizen_id: validCitizenId,
      applicant_name: applicantName || 'Citizen Applicant',
      title: String(title).slice(0, 120),
      messages,
      content_hash: contentHash,
      updated_at: now,
    };

    // Keep server memory store warm
    memoryThreadsStore.set(String(id), {
      ...threadRecord,
      created_at: memoryThreadsStore.get(String(id))?.created_at || now,
    });

    // Save to Supabase
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from('chat_threads').upsert(
        {
          id: threadRecord.id,
          citizen_id: threadRecord.citizen_id,
          applicant_name: threadRecord.applicant_name,
          title: threadRecord.title,
          messages: threadRecord.messages,
          content_hash: threadRecord.content_hash,
          updated_at: threadRecord.updated_at,
        },
        { onConflict: 'id' },
      );

      if (error) {
        // Fallback with anon server client if service key was restricted
        const anonClient = createServerSupabaseClient();
        await anonClient.from('chat_threads').upsert(threadRecord, { onConflict: 'id' });
      }
    } catch {
      // Memory store is already populated
    }

    return NextResponse.json({
      ok: true,
      hash: contentHash,
      thread: threadRecord,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save chat thread';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, message: 'Missing thread id' }, { status: 400 });
    }

    memoryThreadsStore.delete(id);

    try {
      const supabase = createServiceClient();
      await supabase.from('chat_threads').delete().eq('id', id);
    } catch {
      // Memory deletion already completed
    }

    return NextResponse.json({ ok: true, deleted_id: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete chat thread';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
