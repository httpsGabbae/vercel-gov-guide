import dotenv from 'dotenv';
import { generateGroundedAnswer } from '../lib/rag/answer';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const query =
    args.join(' ').trim() ||
    'Libre ba ang NBI clearance para sa first time jobseeker at ano ang mga requirements?';

  console.log('\n================================================================');
  console.log('🇵🇭  GovGuide PH — Citizen Charter Grounded Retrieval CLI');
  console.log('================================================================');
  console.log(`\n💬 Citizen Query: "${query}"\n`);
  console.log('🔍 Searching Citizen Charters & computing vector similarity...\n');

  const startTime = Date.now();
  const result = await generateGroundedAnswer(query);
  const elapsed = Date.now() - startTime;

  console.log('----------------------------------------------------------------');
  console.log(`🛡️  Grounding Status: ${result.isGrounded ? '✅ GROUNDED IN CHARTER' : '⚠️ UNANSWERED / FALLBACK'}`);
  console.log(`⏱️  Elapsed Time: ${elapsed}ms`);
  console.log('----------------------------------------------------------------\n');

  console.log('📖 Answer:');
  console.log(result.answer);
  console.log('\n');

  if (result.qaMatch) {
    console.log(`💡 Research Knowledge Bank Grounding: [${result.qaMatch.id}] (Basis: ${result.qaMatch.basis}, Review Status: ${result.qaMatch.reviewStatus})\n`);
  }

  if (result.checklist.length > 0) {
    console.log('📋 Document Requirements Checklist:');
    result.checklist.forEach((item, idx) => {
      console.log(`   [ ] ${idx + 1}. ${item}`);
    });
    console.log('');
  }

  if (result.fees.length > 0) {
    console.log('💰 Counter Fees & Schedule:');
    result.fees.forEach((fee) => {
      console.log(`   • ${fee}`);
    });
    console.log('');
  }

  if (result.sources.length > 0) {
    console.log('📚 Official Sources Cited:');
    result.sources.forEach((src, idx) => {
      const matchPct = (src.similarity * 100).toFixed(1);
      console.log(`   [Source ${idx + 1}] (${matchPct}% Match) ${src.breadcrumb}`);
      console.log(`      "${src.snippet.replace(/\n+/g, ' ')}"`);
    });
    console.log('');
  }

  if (result.fallbackContact) {
    console.log('🏛️ Official Escalation Contact:');
    console.log(`   Agency:  ${result.fallbackContact.agency}`);
    console.log(`   Hotline: ${result.fallbackContact.hotline}`);
    console.log(`   Email:   ${result.fallbackContact.email}\n`);
  }

  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('❌ CLI Error:', err);
  process.exit(1);
});
