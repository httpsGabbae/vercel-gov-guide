# AGENTS.md — GovGuide PH Architecture, Conventions & Roadmap

## 🇵🇭 Project Overview
**GovGuide PH** is a citizen-first, mobile-responsive web platform designed to eliminate "balik-pila" (repeat queueing) at Philippine government agency counters. It bridges official Citizen's Charters with multimodal AI guidance, proactive document inspection, grounded retrieval (RAG), and confirmation-gated service actions.

---

## 🏛️ System Architecture

- **Framework:** Next.js 15+ (App Router, TypeScript strict mode)
- **Styling:** Tailwind CSS with shadcn/ui aesthetic (warm Philippine civic palette: Deep Navy `#0f172a`, Pearl White `#f8fafc`, Golden Sun `#f59e0b`, Royal Blue `#2563eb`, Emerald Green `#10b981`)
- **Package Manager:** `pnpm`
- **Database & Auth:** Supabase PostgreSQL with `pgvector` for Charter RAG and Row-Level Security (RLS)
- **AI Models (`lib/ai/models.ts`):**
  - Generative & Vision: Google Gemini Flash (`gemini-2.5-flash` / `gemini-1.5-flash`) via official `@google/genai`
  - Embeddings: `text-embedding-004` (768 dimensions)
- **Testing & Quality:** Vitest for unit/integration tests, ESLint for linting, Prettier for formatting, `tsc --noEmit` for type checking.

---

## 📁 Repository Directory Structure

```
d:/mock-govguideph/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth routes (login, register, callback)
│   ├── (citizen)/              # Citizen portal (chat, services, requests, appointments)
│   ├── (agency)/               # Agency admin dashboard
│   ├── (admin)/                # Platform admin console
│   ├── api/                    # Serverless API routes (chat, inspect, propose, appointments)
│   ├── layout.tsx              # Root HTML & body shell with font and providers
│   ├── page.tsx                # Landing & conversational entrypoint
│   └── globals.css             # Tailwind base & custom design tokens
├── components/                 # Reusable UI components
│   ├── ui/                     # shadcn-inspired primitives (button, card, dialog, badge)
│   ├── chat/                   # Citizen chat bubbles, scorecards, source chips
│   └── shared/                 # Navigation, header, language toggle, status badges
├── data/
│   └── charters/               # Official Philippine Citizen's Charter Markdown sources
│       ├── nbi-clearance.md
│       ├── psa-birth-certificate.md
│       └── philhealth-registration.md
├── lib/
│   ├── ai/
│   │   └── models.ts           # Gemini SDK client, model constants, and embedding helpers
│   ├── auth/
│   │   └── roles.ts            # Role-based access control and redirect logic
│   ├── rag/
│   │   ├── chunker.ts          # Markdown section chunking engine
│   │   ├── retrieve.ts         # Vector search with threshold filtering
│   │   └── answer.ts           # Grounded RAG answer synthesis with citations
│   ├── services/               # Government services registry & form configurations
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server-side Supabase client
│       ├── service.ts          # Service-role Supabase client
│       └── types.ts            # Database TypeScript definitions
├── scripts/
│   ├── ingest.ts               # Charter chunking & vector ingestion pipeline
│   └── ask-cli.ts              # Interactive RAG CLI for grounded Q&A
├── supabase/
│   └── migrations/             # SQL schema, RLS policies, and RPC functions
│       └── 20261028000001_mvp_schema.sql
├── tests/                      # Vitest test suite
│   ├── chunker.test.ts
│   ├── rag.test.ts
│   └── rls.test.ts
├── .env.example
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 🔒 Security, Privacy & Philippine Legal Compliance

1. **RA 10173 (Data Privacy Act of 2012):**
   - Citizen identity documents are processed ephemerally with zero permanent storage of biometric images unless explicitly consented.
   - PII is strictly encrypted in transit and isolated by Supabase Row-Level Security (RLS).
2. **Citizen's Charter Grounding:**
   - AI responses must cite official sources (e.g., `[NBI Citizen's Charter 2024]`).
   - If an inquiry falls below the RAG similarity threshold (`0.65`), the bot must gracefully provide the official agency contact number/email rather than hallucinating rules.
3. **Audit Trail:**
   - Every confirmation-gated action and submission writes an immutable log to `audit_logs`.
