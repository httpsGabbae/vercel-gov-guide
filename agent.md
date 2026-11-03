# agent.md — GovGuide PH UI Design System & Conventions

> Read this before touching any UI in `d:/mock-govguideph/v2`. It documents the visual language, layout, components, motion, and UX rules of the citizen app. Architecture, security, and legal rules live in `AGENTS.md`; this file is the **UI companion**.

---

## 1. Design Philosophy

| Principle | What it means in practice |
|---|---|
| **Calm, ChatGPT/KaagapAI-style shell** | White canvas, hairline borders, generous whitespace, one primary action per surface. No heavy gradients on chrome. |
| **Civic trust** | Every AI answer looks *grounded*: citations become clickable chips, sources appear in a footer, legal badges (RA 10173, RA 11032) are visible. |
| **Anti "balik-pila"** | UI always pushes the citizen toward being **Counter-Ready**: checklists, issue counts (expired / mismatch / missing), next actions. |
| **Labor illusion** | The AI **always** shows a deliberate loading sequence (min. 2.2 s) even if the backend is instant. Never remove this (see §7). |
| **Bilingual-friendly** | Copy may be English or Filipino (Taglish OK). Layouts must tolerate ~30% longer Filipino strings. |
| **Mobile-first** | Everything must work at 360 px width; sidebar collapses to a drawer. |

---

## 2. Tech & File Map

- **Next.js 15 App Router**, React 19, TypeScript strict, **Tailwind 3**, `lucide-react` (new components) + a custom inline SVG icon set (`Icons` in chat page, 1.75 px stroke).
- Font: **Inter** via `next/font` → CSS var `--font-inter` (`app/layout.tsx`).

| File | Role |
|---|---|
| `app/layout.tsx` | Root shell, Inter font, metadata, `themeColor #ffffff`. |
| `app/globals.css` | Design tokens (CSS vars) + all motion/utility classes (§4, §6). |
| `tailwind.config.ts` | shadcn HSL tokens + `civic.*` palette. |
| `app/page.tsx` | Renders `CitizenChatPage` (the chat *is* the landing page). |
| `app/(citizen)/chat/page.tsx` | Main app: shell, sidebar, chat, My Details, Audit Log, Source drawer, Tour, and inline primitives. |
| `components/chat/ChatLoadingAnimation.tsx` | Deliberate AI "thinking" card. |
| `components/chat/AgentResponseView.tsx` | Styled bot answer card (header, copy, cards, next actions, sources footer). |
| `components/chat/CivicMarkdown.tsx` | Lightweight markdown → civic-styled React renderer. |
| `components/chat/ChecklistCard.tsx`, `SourceChips.tsx`, `FallbackContactCard.tsx`, `LanguageToggle.tsx` | Legacy/standalone chat widgets. |
| `components/ui/*` | shadcn-style primitives (button, card, dialog, badge). |
| `components/shared/*` | header, navigation, language toggle, status badge. |

---

## 3. Color System

### 3.1 App tokens (`:root` in `globals.css`) — **use these first**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#ffffff` | Page background |
| `--fg` | `#0a0a0a` | Primary text |
| `--sidebar` | `#f8f8f8` | Sidebar surface |
| `--label-2` | `#6b6b6b` | Secondary text |
| `--label-3` | `#a3a3a3` | Tertiary / meta text |
| `--fill` / `--fill-2` | `#f4f4f4` / `#ebebeb` | Neutral fills, hover rows |
| `--hairline` | `rgba(0,0,0,.08)` | All 1 px borders (`shadow-[0_0_0_1px_var(--hairline)]`) |
| `--brand` / `--brand-hover` / `--brand-soft` | `#1a7f4b` / `#146a3e` / `#e8f3ec` | Primary action, success, "done" |
| `--accent` / `--accent-soft` / `--accent-ink` | `#f4c430` / `#fdf3c8` / `#6b5200` | Warnings, highlights, spinner tip |
| `--danger` / `--danger-soft` / `--danger-ink` | `#dc2626` / `#fef2f2` / `#991b1b` | Errors, guardrails, expired |

### 3.2 Civic palette (from `AGENTS.md`, `tailwind civic.*`)
Deep Navy `#0f172a` · Pearl White `#f8fafc` · Golden Sun `#f59e0b` · Royal Blue `#2563eb` · Emerald `#10b981`/`#059669` · Crimson `#dc2626`.

### 3.3 Semantic mapping (must stay consistent)

| Meaning | Color |
|---|---|
| Valid / Counter-Ready / Verified / Free (₱0) | Emerald / `--brand` |
| Expired / Critical / Blocked | Red / `--danger` |
| Mismatch / Warning / Pending fix | Amber / `--accent` |
| Missing | Amber-orange or slate (never green) |
| Info / links / phone & email | Royal Blue |
| Citizen (user) bubble | Navy gradient `from-slate-900 to-slate-800`, white text |

---

## 4. Typography, Radius, Elevation

- **Font sizes** (px, via `text-[..]`): 11 meta · 12–13 labels/chips · 14–15 body · 15 chat text · 24–28 hero greeting. Line-height `leading-relaxed` for prose.
- **Weights:** 400 body, 500 labels/buttons, 600 titles, 700 badges/agency eyebrows (uppercase, `tracking-wider`).
- **Radius:** buttons 9–10 px · cards 16 px (`.card`) / `rounded-2xl` · chat bubbles 18 px with one "tail" corner squared (`rounded-tr-sm` user, `rounded-tl-sm` bot) · chips/pills `999px`.
- **Elevation:** prefer ring-shadows over borders:
  - `.card`: `0 0 0 1px rgba(0,0,0,.09), 0 1px 2px rgba(0,0,0,.04), 0 8px 20px rgba(0,0,0,.04)`
  - Bot answer: `0 1px 3px rgba(0,0,0,.03), 0 8px 20px -8px rgba(0,0,0,.05)`
- **Focus:** global `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px }` — never remove.
- Scrollbars are hidden globally (`* { scrollbar-width: none }`).

---

## 5. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ .shell (h-dvh, grid)                                         │
│ ┌────────────┐ ┌───────────────────────────────────────────┐ │
│ │ .sidebar   │ │ header (title · language · persona menu)  │ │
│ │ New chat   │ ├───────────────────────────────────────────┤ │
│ │ Threads    │ │ view router: chat | details | referrals | │ │
│ │ Nav: Chat, │ │              tasks | log                  │ │
│ │ My Details,│ │  ┌─ scroll area (max-w-[760px] centered) ┐│ │
│ │ Audit Log  │ │  │ messages / empty-state greeting       ││ │
│ │ Persona ▾  │ │  └───────────────────────────────────────┘│ │
│ └────────────┘ │  shortcut pills (empty state only)        │ │
│                │  .composer (textarea · attach · send)     │ │
│                └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
          + SourceDrawer (right panel) · Lightbox · TourOverlay
```

- `.shell[data-collapsed='true']` collapses the sidebar; on mobile it becomes a drawer with `.mobile-backdrop`.
- Content column: `mx-auto max-w-[760px] px-6`, message gap `gap-6`.
- **Empty state:** centered `LogoMark` (64 px) + `"{Good morning|afternoon|evening}, {FirstName}. How can I help?"` + 4 shortcut pills (2-col mobile, 4-col ≥ sm). Composer animates down via FLIP (`useLayoutEffect`, 520 ms, `cubic-bezier(0.32,0.72,0,1)`) when the first message is sent.
- Views (`view` state): `chat`, `details` / `referrals` / `tasks` (all render `MyDetailsView`), `log` (`AuditLogView`).

---

## 6. Motion System

Easing tokens: `--ease-enter (0.22,1,0.36,1)` · `--ease-move (0.25,1,0.5,1)` · `--ease-drawer (0.32,0.72,0,1)` · `--ease-press (0.25,0.46,0.45,0.94)`.

| Class | Purpose |
|---|---|
| `.press` | Scale-down on `:active` for every tappable element. |
| `.enter`, `.enter-card` | Fade/slide-in for new messages & cards. |
| `.pill[data-leaving]` | Attachment pill exit. |
| `.popover[data-open][data-placement]` | Menus (`bottom-end`, `bottom-start`, `top-start`, `top-end`). |
| `.dialog-root/.dialog-backdrop/.dialog-panel` | Modals. |
| `.panel[data-open]` | Right-side Source drawer. |
| `.seg-pill/.seg-option` | Sliding segmented control. |
| `.swap` | Cross-fade between two states (e.g. spinner → check). |
| `.disclosure[data-open]` + `.chev` | Grid-row accordion + rotating chevron. |
| `.spinner-main` | Conic brand→accent ring with accent dot (`kg-spin`). |
| `.spinner-inline` | Small 14 px ring. |
| `.shimmer` | Text gradient sweep for "in-progress" labels. |
| `.civic-dot-1/2/3` | Bouncing 3 dots (Emerald, Gold, Blue). |
| `.civic-aura` | Pulsing brand ring around the AI avatar. |
| `.civic-skeleton` | Shimmering placeholder bars. |
| `.badge`, `.pop`, `.check-circle`, `.check-path` | Count badges and animated check strokes. |
| `.tour-*` | Onboarding spotlight tour. |

Rules: durations 160–520 ms; always transform/opacity only; state is expressed through `data-*` attributes, not toggled class names.

---

## 7. Chat Experience (core)

### 7.1 Message model
```ts
ChatMessage { id; from: 'user'|'agent'; text?; files?; previews?;
  phase?: 'booting'|'working'|'done'; steps?: StepItem[];
  reply?: { text; cards: ChatCardPayload[]; next: NextActionItem[] }; error? }
```

### 7.2 User bubble
Right-aligned, `max-w-[78%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4 py-2.5 text-[14.5px]`. Attachments render above as image thumbnails (click → Lightbox) or file chips.

### 7.3 Deliberate loading (`ChatLoadingAnimation`) — **MANDATORY**
Shown whenever `phase !== 'done'`. Driven by `sendTurn`:

| Time | Step shown |
|---|---|
| 0 ms | "Loading official Citizen's Charter rules" (running) |
| 700 ms | step 0 done → "Scanning {file} for expired dates, mismatched info & missing seals" / "Cross-checking requirements checklist…" |
| 1450 ms | step 1 done → "Formulating counter-ready guidance & anti-rejection rules" |
| ≥ 2200 ms | Reply revealed (`Promise.all([fetch, delay(2200)])`) |

Card anatomy: avatar with `.civic-aura` + ping → "GovGuide AI · Deep Inspection" pill → "Thinking ● ● ●" → shimmering active step + `% Verified` → gradient progress bar (25 → 60 → 88 → 100) → 3 skeleton lines → expandable step list → RA 10173 / RA 11032 footer.
**Do not** shorten below 2.2 s, skip on cache hits, or remove the stages. Timers must be cleared in success and `catch`.

### 7.4 Bot answer (`AgentResponseView`)
- Card: `rounded-2xl rounded-tl-sm border-slate-200/90 bg-white p-5`.
- Header: emerald gradient avatar + **GovGuide AI** + "Charter Grounded" badge + subtitle "Official Anti-Red Tape Pre-Flight Guidance" + **Copy** button (shows "Copied!" for 2 s).
- Body: `CivicMarkdown`.
- Then embedded cards (§8), then `NextActionsCard` (only on the last message and when not busy).
- Footer: "Official Sources:" agency chips (NBI, PSA, PhilHealth → open `SourceDrawer`) + "Grounded in Anti-Red Tape Act (RA 11032)".
- Errors: rose callout `border-rose-200 bg-rose-50 text-rose-800`.

### 7.5 `CivicMarkdown` rendering rules
| Input | Output |
|---|---|
| Blank line | New paragraph block |
| Paragraph starting `🚨`/`🛡️` or containing `**Guardrail Alert` | Rose callout with `ShieldAlert` |
| Paragraph starting `🇵🇭` or containing "Citizen's Charter 2025" | Blue guide callout with `Sparkles` |
| `- ` / `* ` lines | Emerald-dot bullet list |
| `1. ` lines | Numbered emerald circles |
| `**bold**` / `*italic*` | `font-semibold text-slate-900` / italic slate |
| `` `[… Charter …]` `` | Emerald citation chip (BookOpen) → `onOpenSource(src-nbi|psa|philhealth-2025)` |
| `` `(02) 8441-7442` `` | Blue `tel:` chip |
| `` `x@y.gov.ph` `` | Blue `mailto:` chip |
| `` `₱130.00` `` / `LIBRE` | Emerald fee badge |
| other `` `code` `` | Slate mono chip |

Backend replies (`/api/inspect`, `lib/ai/guardrails.ts`) should therefore format citations, hotlines, emails and fees inside backticks.

---

## 8. Embedded Cards (inside a bot answer)

| Card | Trigger (`card.kind`) | Key UI |
|---|---|---|
| `InspectionReportCard` | `inspection_report` | 2-col (`230px / 1fr`): mono "scanned specimen" summary + "View Official Charter Rule"; issue list by category; editable extracted fields; Confirm → saving (550 ms) → saved, syncs My Details. |
| `InteractiveChecklistCard` | `checklist_card` | Agency eyebrow, service name, fee, verified/issue counts, per-item toggle, "Check in chat" per requirement, "Charter Source" chip. |
| `GuardrailAlertCard` | `guardrail_notice` | Red (critical) / amber header with lock icon, title, policy code, "Logged to RA 10173 Audit Trail", law citation, "View Charter Rules". |
| `NextActionsCard` | `reply.next` | "What's next" label + list rows (icon circle `--brand-soft`, label, hint); actions: `message`, `attach`, `demo_file`, `view`. |

Wrapper primitives: `CardBox` (white, 16 px, ring shadow, overflow hidden), `Hairline` (inset divider).

---

## 9. Other Surfaces

- **MyDetailsView** — tabs `all | profile_files | checklists | inspections`; editable applicant profile, document vault (upload, preview, inspect-in-chat, remove), checklists, inspection history; "Reset to demo".
- **AuditLogView** — hash-chained log table (id, ts, user, action, tool, outcome, flagged, prev_hash → hash). Flagged rows use danger tokens.
- **SourceDrawer** — right `.panel` showing a `CHARTER_SOURCES` doc (agency, title, recorded date, cited rows highlighted).
- **TourOverlay** — spotlight onboarding (`TOUR_STEPS`, targets via `data-tour="…"` attributes, e.g. `data-tour="pills"`).
- **Lightbox** — full-screen image preview for attachments/vault files.
- **Persona switcher** — sidebar bottom; demo profiles `jobseeker` (RA 11261) and `married_applicant`.
- **Language** — `Auto | English | Filipino` passed to the API.

Persistence (localStorage): `govguide_my_details_profile_v1`, `…_files_v1`, `…_checklists_v1`, `…_inspections_v1`, `govguide_chat_threads_v1`, `govguide_active_thread_id_v1`. Threads also sync to `/api/chat/threads` (non-blocking).

---

## 10. Primitives (in `chat/page.tsx`)

`Icon`/`Icons` · `LogoMark` (`/logo-mark.png`) · `Spinner` (`main` | `inline`, optional `label` → `role="status"`) · `Swap` · `CardBox` · `Hairline` · `SegmentedControl<T>` · `Popover` + `MenuItemRadio` · `StepsProgress` (legacy steps view; replaced in chat by `ChatLoadingAnimation`) · `FileThumb`.

Button classes: `.btn` + `.btn-primary | .btn-secondary | .btn-ghost`, `.btn-sm`, `.btn-icon`, `.chip-btn`, `.tag` / `.tag-accent`, `.row-btn`.

---

## 11. Accessibility

- Chat log: `role="log" aria-live="polite"`.
- Spinners with labels expose `role="status"`; decorative icons are `aria-hidden`.
- Disclosures/popovers set `aria-expanded`; icon-only buttons need `title`/`aria-label`.
- Contrast: body text ≥ 4.5:1 (`--label-3` is meta-only, never for essential info).
- Tap targets ≥ 36 px (`min-h-9`); keep `:focus-visible` outline.
- Respect `prefers-reduced-motion` when adding new animations (wrap new keyframes in a media query).

---

## 12. Copy & Content Rules

- Brand: **GovGuidePH** (product) / **GovGuide AI** (assistant persona).
- Always cite: `[NBI Citizen's Charter 2025]`-style chips. Below RAG threshold (0.65) → show agency hotline/email (`FallbackContactCard` style), never invent rules.
- Status vocabulary: **Counter-Ready**, **Expired**, **Mismatch**, **Missing**, **Verified**, **Issues found**.
- Fees: `₱130.00`, free = `LIBRE (₱0.00)`.
- Laws referenced in UI: RA 10173 (Data Privacy), RA 11032 (Anti-Red Tape), RA 11261 (First-Time Jobseekers), RA 11223 (UHC), RA 10645 (Seniors).

---

## 13. Do / Don't for Agents

**Do**
- Reuse CSS tokens (`var(--brand)` etc.) and existing motion classes.
- Put new chat widgets in `components/chat/` and keep them client components (`'use client'`).
- Run `pnpm typecheck`, `pnpm test`, `pnpm build` after UI changes.

**Don't**
- Remove or shorten the deliberate loading sequence (§7.3).
- Introduce new color hues outside §3 or new fonts.
- Use raw borders where the ring-shadow hairline pattern exists.
- Render AI text as a plain `<p>` — always go through `CivicMarkdown`.
- Store biometric images permanently (RA 10173) — previews are object URLs / local only.

