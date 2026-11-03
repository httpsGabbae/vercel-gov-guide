import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { loadQABank, type GovGuideQAEntry } from '../lib/rag/qa-matcher';
import { embedText, EMBEDDING_DIMENSION } from '../lib/ai/models';
import { createServiceClient } from '../lib/supabase/service';

dotenv.config();

interface IngestQAReport {
  totalProcessed: number;
  indexedCount: number;
  supabaseInserted: number;
  supabaseErrors: number;
}

export async function runQAIngestion(options: { maxItems?: number; dryRun?: boolean } = {}) {
  console.log('\n🇵🇭 [GovGuide PH] Starting 1,000 Q&A Research Corpus Ingestion...\n');

  const { entries, sources, resources } = loadQABank();
  console.log(`📚 Loaded ${entries.length} Q&A records, ${sources.size} primary sources, ${resources.length} open data resources.`);

  const isSupabaseConfigured =
    !options.dryRun &&
    Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !process.env.SUPABASE_URL?.includes('mock') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('mock');

  const supabase = isSupabaseConfigured ? createServiceClient() : null;

  const targetEntries = options.maxItems ? entries.slice(0, options.maxItems) : entries;
  const localIndex: { entry: GovGuideQAEntry; embedding: number[] }[] = [];
  const report: IngestQAReport = {
    totalProcessed: targetEntries.length,
    indexedCount: 0,
    supabaseInserted: 0,
    supabaseErrors: 0,
  };

  console.log(`🔄 Generating vector embeddings for ${targetEntries.length} Q&As...\n`);

  for (let i = 0; i < targetEntries.length; i++) {
    const entry = targetEntries[i];
    const textToEmbed = `Question: ${entry.question}\nAnswer: ${entry.answer}\nService: ${entry.service || ''}\nSection: ${entry.section}`;

    if ((i + 1) % 50 === 0 || i === targetEntries.length - 1) {
      process.stdout.write(`   Processing [${i + 1}/${targetEntries.length}] (${entry.id})...\r`);
    }

    const embedding = await embedText(textToEmbed);
    localIndex.push({ entry, embedding });
    report.indexedCount++;

    if (supabase) {
      try {
        const client = supabase as unknown as {
          from: (table: string) => {
            upsert: (
              data: Record<string, unknown>,
              opts?: { onConflict: string },
            ) => Promise<{ error: { message: string } | null }>;
          };
        };

        const { error } = await client.from('charter_chunks').upsert(
          {
            title: `[${entry.id}] ${entry.question}`,
            content: `### Question\n${entry.question}\n\n### Answer\n${entry.answer}\n\n### Basis\n${entry.basis}`,
            metadata: {
              type: 'qa_pair',
              qaId: entry.id,
              section: entry.section,
              service: entry.service,
              sourceIds: entry.source_ids,
              reviewStatus: entry.review_status,
            },
            embedding,
          },
          { onConflict: 'title' },
        );

        if (error) {
          report.supabaseErrors++;
        } else {
          report.supabaseInserted++;
        }
      } catch {
        report.supabaseErrors++;
      }
    }
  }

  // Save in-memory / local index file
  const outPath = path.resolve(process.cwd(), 'data/research/qa-index.json');
  fs.writeFileSync(outPath, JSON.stringify(localIndex, null, 2), 'utf-8');

  console.log('\n\n======================================================');
  console.log('🎉 Q&A Corpus Ingestion Completed!');
  console.log(`📊 Total Records Processed: ${report.totalProcessed}`);
  console.log(`📐 Embedding Dimension: ${EMBEDDING_DIMENSION}`);
  console.log(`💾 Local QA Index Saved: ${outPath}`);
  if (isSupabaseConfigured) {
    console.log(`☁️ Supabase Inserted: ${report.supabaseInserted}`);
    console.log(`⚠️ Supabase Errors: ${report.supabaseErrors}`);
  } else {
    console.log(`ℹ️ Supabase: Skipped (offline/dry-run mode). Local index ready for zero-latency retrieval.`);
  }
  console.log('======================================================\n');
}

// Direct invocation CLI handler
if (process.argv[1] && process.argv[1].endsWith('ingest-qa.ts')) {
  const args = process.argv.slice(2);
  const maxIdx = args.indexOf('--limit');
  const maxItems = maxIdx !== -1 && args[maxIdx + 1] ? parseInt(args[maxIdx + 1], 10) : undefined;
  const dryRun = args.includes('--dry-run');

  runQAIngestion({ maxItems, dryRun }).catch((err) => {
    console.error('❌ Q&A Ingestion failed:', err);
    process.exit(1);
  });
}
