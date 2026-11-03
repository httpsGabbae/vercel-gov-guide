import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { chunkCharterMarkdown, type CharterChunk } from '../lib/rag/chunker';
import { embedText, EMBEDDING_DIMENSION } from '../lib/ai/models';
import { createServiceClient } from '../lib/supabase/service';

dotenv.config();

interface IngestReport {
  file: string;
  agencyCode: string;
  chunksCount: number;
}

async function runIngestion() {
  console.log('\n🇵🇭 [GovGuide PH] Starting Citizen Charter Vector Ingestion Pipeline...\n');

  const chartersDir = path.resolve(process.cwd(), 'data/charters');
  if (!fs.existsSync(chartersDir)) {
    console.error(`❌ Directory not found: ${chartersDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(chartersDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.warn('⚠️ No markdown charter files found in data/charters.');
    return;
  }

  const reports: IngestReport[] = [];
  const localIndex: { chunk: CharterChunk; embedding: number[] }[] = [];
  const isSupabaseConfigured =
    Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !process.env.SUPABASE_URL?.includes('mock') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('mock');

  const supabase = isSupabaseConfigured ? createServiceClient() : null;

  for (const file of files) {
    const filePath = path.join(chartersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkCharterMarkdown(content, file);

    console.log(`📄 Processing ${file} -> Generated ${chunks.length} semantic chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      process.stdout.write(`   Embedding chunk [${i + 1}/${chunks.length}] "${chunk.sectionTitle}"... `);

      const embedding = await embedText(chunk.content);
      localIndex.push({ chunk, embedding });

      // Try inserting into Supabase if available
      if (supabase) {
        try {
          const client = supabase as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> };
              };
              upsert: (
                data: Record<string, unknown>,
                opts?: { onConflict: string },
              ) => { select: (cols: string) => { single: () => Promise<{ data: { id: string } | null }> } };
              insert: (data: Record<string, unknown>) => Promise<unknown>;
            };
          };

          const { data: agency } = await client
            .from('agencies')
            .select('id')
            .eq('code', chunk.agencyCode)
            .maybeSingle();

          let agencyId = agency?.id;
          if (!agencyId) {
            const { data: newAgency } = await client
              .from('agencies')
              .upsert(
                {
                  code: chunk.agencyCode,
                  name: chunk.agencyName,
                },
                { onConflict: 'code' },
              )
              .select('id')
              .single();
            agencyId = newAgency?.id;
          }

          if (agencyId) {
            const { error: insErr } = await (client as unknown as {
              from: (t: string) => { insert: (d: unknown) => Promise<{ error: { message: string } | null }> };
            })
              .from('charter_chunks')
              .insert({
                agency_id: agencyId,
                title: chunk.fullBreadcrumb,
                content: chunk.content,
                metadata: {
                  ...chunk.metadata,
                  agencyCode: chunk.agencyCode,
                  serviceCode: chunk.serviceCode,
                  sectionTitle: chunk.sectionTitle,
                },
                embedding,
              });
            if (insErr) {
              console.warn(`\n[Supabase Chunk Insert Error]:`, insErr.message);
            }
          }
        } catch (dbErr) {
          console.warn(`\n[Supabase DB Error]:`, dbErr);
        }
      }

      console.log('✓');
    }

    reports.push({
      file,
      agencyCode: chunks[0]?.agencyCode || 'UNKNOWN',
      chunksCount: chunks.length,
    });
  }

  // Save local vector cache
  const indexPath = path.resolve(process.cwd(), 'data/charters-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(localIndex, null, 2), 'utf-8');

  console.log('\n======================================================');
  console.log('🎉 Ingestion Pipeline Completed Successfully!');
  console.log(`📊 Total Chunks Ingested: ${localIndex.length}`);
  console.log(`📐 Embedding Dimension: ${EMBEDDING_DIMENSION}`);
  console.log(`💾 Local Vector Index Saved: ${indexPath}`);
  console.log('======================================================\n');
  console.table(reports);
}

runIngestion().catch((err) => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});
