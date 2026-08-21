# FRD — NutriMurt Migration to Vercel

**Status:** Approved for implementation
**Date:** 2026-08-16
**Owner:** Caio Pavanelli
**Target branch:** `vercel-migration`

---

## 1. Summary

NutriMurt is currently a three-tier Docker stack on a Digital Ocean droplet: a .NET 8 Web API, a
Python FastAPI service, a React/Vite SPA, and a self-hosted PostgreSQL container, all behind an
nginx gateway that terminates TLS and enforces rate limits.

The two API tiers exist for study purposes, not for architectural reasons. They share one database,
one Clerk identity provider, and one frontend. This migration collapses the entire stack into a
single **Next.js 15 (App Router, TypeScript)** application deployed on Vercel, backed by **Neon
Postgres**, with all server logic living in Route Handlers under `app/api/`.

### Outcome

| Before | After |
|---|---|
| .NET 8 API (~1,800 LOC) | Next.js Route Handlers (TypeScript) |
| FastAPI service (~1,000 LOC) | *merged into the above* |
| React 19 + Vite SPA | Next.js App Router (same components) |
| Postgres in Docker | Neon Serverless Postgres |
| EF Core + SQLAlchemy | Drizzle ORM (single source of truth) |
| nginx (TLS, routing, rate limit, CSP) | Vercel platform + middleware + Upstash |
| QuestPDF (.NET) | `@react-pdf/renderer` |
| Mailgun via Python `requests` | Mailgun via `fetch` |
| Manual `docker compose` deploy + certbot | `git push` |

### Non-goals

- No new product features. Behaviour parity is the acceptance bar.
- No Server Component rewrite in this phase (see §7, Phase 2).
- No change to Clerk as the identity provider.
- No auth model changes — per-user row scoping via `user_id` stays exactly as it is.

---

## 2. Approved decisions

These were settled before drafting and are not open for re-litigation during implementation.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Unified API stack | **Next.js App Router (TypeScript)** | One project, one language, one deploy. Clerk has a first-class Next SDK. |
| D2 | Database host | **Neon via Vercel Marketplace** | Auto-injected env vars, HTTP driver survives serverless connection churn, per-preview branching. |
| D3 | ORM | **Drizzle** | Tiny bundle, no query-engine binary, native Neon HTTP driver, SQL-first. |
| D4 | Existing data | **Start fresh** — no data migration | Current production data is disposable. Removes dump/restore, freeze window, and verification from scope. |
| D5 | API contract | **Redesign into one clean `/api` surface** | Frontend call sites are rewritten anyway; drops the `/py` prefix and camelCase RPC paths. |
| D6 | PDF generation | **`@react-pdf/renderer`** | Closest match to QuestPDF's declarative model; no Chromium binary. |
| D7 | Edge policy | **Vercel headers + Upstash Redis rate limiting** | Serverless functions share no memory, so rate limit state must be external. |
| D8 | Email | **Keep Mailgun** | DNS already verified and warmed; the port is ~20 lines. |
| D9 | Frontend port | **Lift-and-shift as client components** | Existing components change almost not at all. RSC conversion deferred. |
| D10 | Cutover | **Immediate DNS cutover once deployed** | Accepted trade-off: no rollback target. Mitigations in §8. |
| D11 | Delivery | **7 staged PRs on a long-lived branch** | Each independently reviewable and testable. |

---

## 3. Current-state inventory

### 3.1 .NET API surface (`nutrimurt.Api`)

All routes require Clerk JWT (`[Authorize]` at controller level). User scoping via the `sub` claim.

| Controller | Routes |
|---|---|
| `DashboardController` | `GET /api/dashboard` |
| `PatientsController` | `GET/POST /api/patients`, `GET/PUT/DELETE /api/patients/{id}`, `GET /api/patients/getWithAll/{id}` |
| `PatientLinksController` | `GET /api/patients/{patientId}/links`, `POST .../links/send`, `DELETE .../links/{linkId}` |
| `QuestionnariesController` | `GET/POST /api/questionnaries`, `GET/PUT/DELETE /api/questionnaries/{id}` |
| `QuestionsController` | `GET/POST /api/questions`, `GET/PUT/DELETE /api/questions/{id}` |
| `PatientMealPlansController` | `GET/POST /api/patientmealplans`, `GET/PUT/DELETE /api/patientmealplans/{id}`, `GET /api/patientmealplans/{id}/pdf` |

Cross-cutting: EF Core with snake_case naming, `Database.Migrate()` on startup, fixed-window rate
limiter (30 req/min per IP), CORS allowlist, QuestPDF with embedded TTF fonts.

### 3.2 Python service surface (`nutrimurt.PyService`)

| Route | Auth | Notes |
|---|---|---|
| `GET /py/`, `GET /py/health` | none | Liveness |
| `POST /py/patient-questionary/{pid}/{qid}` | Clerk | **Dead code** — returns a stub, no DB writes |
| `POST /py/sendEmail/{urlID}` | Clerk | Mailgun send + daily send-counter guardrail |
| `GET /py/getPatientQuestionary/{urlID}` | Clerk | |
| `GET /py/getQuestionaryPatientLink/{urlID}` | Clerk | Legacy, superseded by `/answer/staff` |
| `GET /py/getDiaryPatientLink/{urlID}` | Clerk | Legacy, superseded by `/answer/staff` |
| `GET /py/getPatientLink/{urlID}` | Clerk | Legacy, superseded by `/answer/staff` |
| `GET /py/answer/public/{urlID}` | **public** | Rate limited 10/s. Returns minimal PII (name only) |
| `GET /py/answer/staff/{urlID}` | Clerk | Full patient data |
| `POST /py/savePatientAnswers` | **public** | Rate limited 5/s |
| `POST /py/savePatientDiary` | **public** | Rate limited 5/s |

Auth is a hand-rolled JWKS fetch + `jwt.decode` against `https://clerk.nutrimurt.com.br`, with a
1-hour JWKS cache and 5-minute leeway.

### 3.3 Database schema (12 tables, snake_case)

`patients`, `questionnaries`, `questions`, `question_alternatives`, `patient_links`,
`patient_question_answers`, `patient_question_answer_alternatives`, `patient_diaries`,
`patient_diary_entries`, `patient_meal_plans`, `patient_meal_plan_entries`,
`user_email_send_counters`.

Indexes on `user_id` for `patients`, `questionnaries`, `patient_links`, `patient_meal_plans`.

Enums are stored as integers, not Postgres enums:
- `PatientLinkTypes`: `Question = 1`, `Diary = 2`
- `QuestionTypes`: `ShortAnswer = 1`, `TrueFalse = 2`, `MultipleChoice = 3`
- `MealType`: `CafeDaManha = 1`, `Almoco = 2`, `CafeDaTarde = 3`, `Jantar = 4`, `Lanche = 5`

### 3.4 Guardrails (`Constants/Guardrails.cs`)

> ⚠️ The values in `README.md` are stale. These are the real ones and must be carried over verbatim.

| Limit | Value |
|---|---|
| `MaxPatients` | 10 |
| `MaxQuestionnaries` | 10 |
| `MaxQuestions` | 10 |
| `MaxAlternatives` | 10 |
| `MaxLinksPerPatient` | 10 |
| `MaxEmailSendsPerDay` | 10 |
| `MaxMealPlans` | 20 |
| `MaxMealPlanEntriesPerPlan` | 50 |

Violations return `409 Conflict`. The web tier mirrors `MaxQuestions` and `MaxAlternatives` in
`src/constants/guardrails.ts`.

### 3.5 Frontend routes (React Router)

`/answer/:urlid` (public, outside `Layout`), `/sign-in`, `/`, `/patients`, `/questionaries`,
`/viewAnswer/:urlid`, `/patientSummary/:patientId`, `/mealplans`, `/mealplans/new`,
`/mealplans/:id`, `/mealplans/:id/edit`.

All authenticated routes are wrapped in `<ProtectedRoute>` inside a shared `<Layout>`.

---

## 4. Target architecture

```
                     ┌──────────────────────────────┐
  Browser ──────────►│  Vercel Edge Network         │
                     │  TLS · CDN · security headers│
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────▼───────────────┐
                     │  middleware.ts               │
                     │  Clerk session · rate limit  │──► Upstash Redis
                     └──────────────┬───────────────┘
                                    │
              ┌─────────────────────┴────────────────────┐
              │                                          │
   ┌──────────▼──────────┐                  ┌────────────▼───────────┐
   │  app/(app)/**       │                  │  app/api/**            │
   │  React pages        │                  │  Route Handlers        │
   │  (client components)│                  │  Node.js runtime       │
   └─────────────────────┘                  └────────────┬───────────┘
                                                         │
                                        ┌────────────────┼──────────────┐
                                        │                │              │
                                 ┌──────▼─────┐  ┌───────▼──────┐  ┌────▼─────┐
                                 │ Neon       │  │ Mailgun API  │  │ react-pdf│
                                 │ Postgres   │  │              │  │          │
                                 │ (Drizzle)  │  └──────────────┘  └──────────┘
                                 └────────────┘
```

### 4.1 Repository strategy

**The new application is scaffolded at the repository root.** The old tiers remain in the working
tree during PRs 1–6 and are deleted in PR 7 — not archived in place.

**Why delete rather than keep.** The goal of this migration is a single API tier. A
`nutrimurt.PyService/` directory left in `main` after cutover is dead code that still appears in
greps, still reads as authoritative to a future maintainer, and still forces the question "is this
live?" on every encounter. Git history preserves it perfectly at zero ongoing cost.

The safety net is a tag, not a directory. Before PR 7 removes the old tiers:

```bash
git tag pre-vercel-migration <last commit containing the old stack>
git push origin pre-vercel-migration
```

**Why the root rather than a subdirectory.** The repository root currently has no `package.json`,
`tsconfig.json`, `app/`, or `lib/`, so there are no collisions. Root scaffolding means Vercel's
default Root Directory (`./`) works with no configuration, and matches the Next.js convention of
`app/`, `lib/`, and `components/` at the top level. Scaffolding into `nutrimurt.App/` would buy
tidier separation for roughly nine days at the cost of a permanent Vercel Root Directory setting
and a nested shape that a single-application repository does not need.

**Coexistence is deliberate.** The .NET controllers and Python services are the specification for
the port and must stay readable alongside the new code until each surface is replaced.

| Stage | Repository root contains |
|---|---|
| PRs 1–5 | `app/ lib/ components/ package.json` **plus** `nutrimurt.Api/ nutrimurt.PyService/ nutrimurt.Web/ infra/ docker-compose*.yml` |
| PR 6 | as above, minus `nutrimurt.Web/` |
| PR 7 | `app/ lib/ components/ drizzle/ docs/ package.json next.config.ts` — old tiers removed |

**Scaffolding procedure.** `create-next-app` refuses to initialise into a directory containing
certain pre-existing files, and it is unconfirmed whether the existing `README.md` and `docs/`
trigger that check. Scaffold into a scratch directory and merge in, rather than fighting it:

```bash
npx create-next-app@latest /tmp/nm-scaffold --typescript --tailwind --app --eslint
cp -r /tmp/nm-scaffold/. .
```

**Two files must be reconciled by hand after the merge:**

- **`.gitignore`** — merge the Next.js entries (`node_modules/`, `.next/`, `.vercel/`,
  `*.tsbuildinfo`) into the existing file. Do not let the scaffold overwrite it; the current file
  carries `infra/certs/` and `.env.*` rules that stay relevant until PR 7.
- **Root `.env`** — currently holds `DB_PASSWORD` for docker-compose. Next.js auto-loads root
  `.env`, so a stale entry there is harmless but misleading. Put new local secrets in `.env.local`
  (already gitignored, and preferred by Next.js) and let the old `.env` be removed with PR 7.

### 4.2 Repository layout

```
nutrimurt/
├── app/
│   ├── layout.tsx                    # ClerkProvider, ToastContainer, global CSS
│   ├── (app)/                        # authenticated shell (former <Layout>)
│   │   ├── layout.tsx                # Sidebar + Footer + auth gate
│   │   ├── page.tsx                  # dashboard  (was App.tsx)
│   │   ├── patients/page.tsx
│   │   ├── patients/[patientId]/page.tsx      # was /patientSummary/:patientId
│   │   ├── questionaries/page.tsx
│   │   ├── view-answer/[urlId]/page.tsx
│   │   └── mealplans/{page,new,[id]/page,[id]/edit}.tsx
│   ├── answer/[urlId]/page.tsx       # PUBLIC — no auth shell
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── api/
│       ├── dashboard/route.ts
│       ├── patients/route.ts
│       ├── patients/[id]/route.ts
│       ├── patients/[id]/links/route.ts
│       ├── patients/[id]/links/[linkId]/route.ts
│       ├── questionnaires/route.ts
│       ├── questionnaires/[id]/route.ts
│       ├── questions/route.ts
│       ├── questions/[id]/route.ts
│       ├── meal-plans/route.ts
│       ├── meal-plans/[id]/route.ts
│       ├── meal-plans/[id]/pdf/route.ts
│       ├── links/[urlId]/route.ts
│       ├── links/[urlId]/send/route.ts
│       └── public/links/[urlId]/{route,answers,diary}.ts
├── components/                       # ported from nutrimurt.Web/src/components
├── features/                         # ported from nutrimurt.Web/src/features
├── lib/
│   ├── db/{index.ts,schema.ts}       # Drizzle
│   ├── auth.ts                       # requireUserId() helper
│   ├── guardrails.ts                 # single shared source (server + client)
│   ├── email.ts                      # Mailgun fetch wrapper
│   ├── rate-limit.ts                 # Upstash
│   └── url-id.ts                     # crypto 16-byte hex, matches IDGeneration.cs
├── drizzle/                          # generated migrations
├── middleware.ts
├── next.config.ts
├── drizzle.config.ts
└── vercel.json
```

### 4.3 API contract (D5)

| Old (.NET / Python) | New |
|---|---|
| `GET /api/dashboard` | `GET /api/dashboard` |
| `GET/POST /api/patients` | unchanged |
| `GET/PUT/DELETE /api/patients/{id}` | unchanged |
| `GET /api/patients/getWithAll/{id}` | `GET /api/patients/{id}?include=all` |
| `GET /api/patients/{pid}/links` | unchanged |
| `POST /api/patients/{pid}/links/send` | unchanged |
| `DELETE /api/patients/{pid}/links/{lid}` | unchanged |
| `GET/POST /api/questionnaries` | `GET/POST /api/questionnaires` *(spelling fixed)* |
| `GET/POST /api/patientmealplans` | `GET/POST /api/meal-plans` |
| `GET /api/patientmealplans/{id}/pdf` | `GET /api/meal-plans/{id}/pdf` |
| `POST /py/sendEmail/{urlID}` | `POST /api/links/{urlId}/send` |
| `GET /py/answer/staff/{urlID}` | `GET /api/links/{urlId}` |
| `GET /py/answer/public/{urlID}` | `GET /api/public/links/{urlId}` |
| `POST /py/savePatientAnswers` | `POST /api/public/links/{urlId}/answers` |
| `POST /py/savePatientDiary` | `POST /api/public/links/{urlId}/diary` |
| `GET /py/getPatientQuestionary/{urlID}` | **dropped** — superseded |
| `GET /py/getQuestionaryPatientLink/{urlID}` | **dropped** — legacy |
| `GET /py/getDiaryPatientLink/{urlID}` | **dropped** — legacy |
| `GET /py/getPatientLink/{urlID}` | **dropped** — legacy |
| `POST /py/patient-questionary/{pid}/{qid}` | **dropped** — dead stub |
| `GET /py/health` | `GET /api/health` |

**Dead-route removal — verified.** A grep of `nutrimurt.Web/src/**` confirms the five dropped
routes are unreferenced by the frontend. Note the false positive: `answersApi.getPatientLink()` in
`features/answers/pyApi.ts` is a *client method name* that calls `/py/answer/public/{urlID}` — it
is not the legacy server route `/py/getPatientLink/{urlID}`. Only `/answer/public`,
`/answer/staff`, `/savePatientAnswers`, `/savePatientDiary`, and `/sendEmail` have live call sites.

**Body shape change (important):** `savePatientAnswers` / `savePatientDiary` currently take the
`urlId` inside the JSON body. The new routes take it from the path. The request body drops to the
answers/entries array only. Both `features/answers/pyApi.ts` call sites must be updated in step.

> **Third call site.** `sendEmail` lives in `features/patients/**pyApi.ts**`, not the answers one,
> and also needed repointing. The same file held `sendTestEmail`, which had no caller and posted to
> `/py/testEmail` — a route that never existed in `main.py`. Removed in PR 4.

**Security fix carried by the same change (PR 4).** The old save endpoints resolved the link by
`urlId` only to prove one existed, then wrote using the `id` — and for diaries the `diary_id` —
taken from the request body. The two were never compared. Any patient holding one valid `urlId`
could therefore delete and overwrite a *different* patient's answers by naming their link id, with
no authentication, and link ids are sequential and exposed in the public payload. Moving `urlId`
into the path removes the body's ability to name a target at all: the route resolves the row from
the path and the body carries answers only. Covered by regression tests in
`test/integration/public-answers.test.ts`.

---

## 5. Component migration detail

### 5.1 Auth — Clerk

Replace two independent implementations (`AddJwtBearer` in .NET, hand-rolled JWKS in Python) with
`@clerk/nextjs`.

- `middleware.ts` uses `clerkMiddleware()` with a public-route matcher covering `/answer/:urlId`,
  `/api/public/**`, `/api/health`, and `/sign-in`.
- Route handlers call a `requireUserId()` helper wrapping `auth()`, throwing a `401` when `userId`
  is null. This replaces both `ClaimsPrincipalExtensions.GetUserId()` and `get_user_id()`.
- The `sub` claim continues to populate the `user_id` column. No data or claim-shape change.
- `VITE_CLERK_PUBLISHABLE_KEY` becomes `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; add
  `CLERK_SECRET_KEY` (new — the Next SDK requires it, the old stack did not).
- Keep the existing Clerk **production** instance. Its `clerk.nutrimurt.com.br` CNAME is independent
  of the apex A record, so it survives the DNS cutover untouched.

### 5.2 Database — Neon + Drizzle

1. Provision Neon through the Vercel Marketplace; it injects `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED` automatically.
2. Author `lib/db/schema.ts` by hand from §3.3 (D4 means there is no existing DB to introspect).
   Use `drizzle-kit generate` + `drizzle-kit migrate` to create the schema.
3. Preserve exact table and column names — snake_case, matching what EF Core produced — so the
   schema stays recognisable against the old migrations.
   **One deliberate divergence:** `patients.name` and `patients.email` are declared `varchar(200)`
   and `varchar(255)`. EF created both as plain `text` — the `[MaxLength]` annotations on the model
   were never migrated. D4 (fresh database) means there is no compatibility cost, and this closes a
   gap the old stack carried. Every other length constraint matches EF exactly.
4. Use `drizzle-orm/neon-http` for the driver. Its HTTP transport avoids the connection-exhaustion
   problem serverless functions cause with a normal TCP pool.
5. Enum columns stay `integer` with TypeScript union types mirroring §3.3. Do **not** convert to
   Postgres native enums.
6. `Patient.Birth` is `DateOnly?` → Drizzle `date({ mode: 'string' })`, keeping `YYYY-MM-DD`
   strings on the wire and avoiding timezone drift.
7. **Migrations do not run on boot.** `Database.Migrate()` on startup has no serverless equivalent
   and would race across concurrent cold starts. Migrations run as an explicit
   `npm run db:migrate` step in the Vercel build command.

### 5.3 Business logic port

| Source | Destination | Notes |
|---|---|---|
| `Constants/Guardrails.cs` + `constants/guardrails.py` + `constants/guardrails.ts` | `lib/guardrails.ts` | Three copies collapse to one shared module. Values per §3.4. |
| `Validation/IDGeneration.cs` | `lib/url-id.ts` | `randomBytes(16).toString('hex')` — must stay 32 lowercase hex chars to match the `CHAR(32)` column. |
| `Validation/CPFAttribute.cs` | `lib/validation/cpf.ts` | Port the check-digit algorithm. Cover with unit tests — this is the only non-trivial validation logic. |
| Phone regex `^\(\d{2}\)\d{5}-\d{4}$` | zod schema | Keep the exact pattern; `react-imask` on the client produces this format. |
| `Services/MealPlanPdfBuilder.cs` | `lib/pdf/MealPlanDocument.tsx` | See §5.4. |
| `app/email/emailsender.py` | `lib/email.ts` | `fetch` to `https://api.mailgun.net/v3/{domain}/messages`, Basic auth `api:{key}`, form-encoded body. |
| `app/services/answers.py` | `lib/services/answers.ts` | Read/write of answers, alternatives, and diary entries. |
| `UserEmailSendCounter` reserve logic | `lib/services/email-quota.ts` | Daily per-user cap of 10. Must stay a single atomic upsert — see risk R4. |

Validation moves from `[Required]`/`[MaxLength]` data annotations to **zod** schemas at the route
boundary, returning `400` with a `{ errors: Record<string, string[]> }` body. This matches what
`apiClient.ts` already parses from ASP.NET's `application/problem+json`, so client error handling
needs no change.

### 5.4 PDF generation

`MealPlanPdfBuilder.cs` (264 LOC, QuestPDF) becomes a `@react-pdf/renderer` document.

- Register the TTF fonts currently embedded from `Assets/Fonts/` via `Font.register()`. **Done in
  PR 5:** copied to `lib/pdf/fonts/` — not `public/`, which would serve private assets over HTTP —
  and read from disk at render time. Because nothing imports them, Next cannot trace them into the
  serverless function, so `next.config.ts` lists them under `outputFileTracingIncludes` for this
  route. Without that entry the route works locally and throws only in production.

> **Known fidelity gap (R2).** DM Sans is present only as a single variable font, and no italic
> file was ever embedded. `@react-pdf/renderer` selects a registered file per weight and style and
> synthesises neither bold nor oblique, so every combination resolves to the same file. Sizes,
> colours, letter-spacing, borders and the grid are exact; headings lose their heavier stroke and
> the two "Sem itens" messages lose their slant. QuestPDF avoided this by passing variable axes
> through to Skia and slanting glyphs itself. Closing the gap means adding static DM Sans weights
> and an italic as separate TTFs — a font-licensing and asset question, not a code change.
>
> Note that every weight/style combination must be registered regardless: an unregistered one
> throws at render time rather than falling back.
- Reproduce the horizontal compact layout from commit `c59f8da`, including the second substitution
  column added in `52d5c5a` (`Substitution` and `Substitution2` on `PatientMealPlanEntry`).
- The handler streams a `Buffer` with `Content-Type: application/pdf` and a `Content-Disposition`
  attachment filename. **`Content-Disposition` must remain exposed** — `requestBlob()` in
  `apiClient.ts` reads it to name the download.
- Force the Node.js runtime: `export const runtime = 'nodejs'`.
- Set `export const maxDuration = 30` on this route. Verify against your Vercel plan's ceiling
  (Hobby allows less than Pro); PDF rendering is the only endpoint at risk of a timeout.

### 5.5 Frontend port (D9 — lift-and-shift)

1. Move `nutrimurt.Web/src/{components,features,lib,constants}` to the repo root, unchanged.
2. Add `'use client'` at the top of every component that uses hooks, Clerk, or event handlers —
   which is effectively all of them.
3. Map React Router routes to `app/` files per §4.2. `createBrowserRouter` and `RouterProvider` are
   deleted.
4. Swap router primitives: `react-router-dom`'s `useNavigate` → `next/navigation`'s `useRouter`,
   `useParams` → `next/navigation`'s `useParams`, `<Link to>` → `next/link`'s `<Link href>`.
5. `<ProtectedRoute>` is deleted; `middleware.ts` plus the `(app)` route group layout handle it.
6. `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`.
7. `api.ts` / `pyApi.ts` modules keep `createApiClient` and its Clerk-token wiring; only the URL
   strings change per §4.3. Base URLs become relative — same origin, so `VITE_API_BASE_URL` and
   `VITE_PY_BASE_URL` are deleted entirely.
8. **Tailwind v3 → v4 theme port.** The scaffold (PR 1) installs Tailwind **v4**, which is CSS-first:
   it auto-detects sources, so there are no `content` globs to repoint, and it does not read
   `theme.extend.colors` from a JS config. `nutrimurt.Web/tailwind.config.js` defines a 43-line
   custom design system — the `surface`, `ink`, `edge`, `accent`, and `danger` scales, each mapped
   to a CSS variable — used pervasively across every component (`bg-surface-card`,
   `text-ink-secondary`, `border-edge-soft`). Rewrite that config as `@theme` declarations in
   `app/globals.css`:

   ```css
   @import "tailwindcss";

   @theme {
     --color-surface-base: var(--bg-base);
     --color-surface-card: var(--bg-card);
     --color-ink-primary:  var(--text-primary);
     --color-accent:       var(--accent);
     --color-danger:       var(--danger);
     /* …one entry per color in the v3 config, plus fontFamily */
   }
   ```

   Utility class names are unchanged, so **no component markup needs editing**. The underlying CSS
   variables in `index.css` carry over as-is. Budget a visual diff pass regardless: v4 changed some
   default utility behaviours beyond the theme.
9. Keep `react-toastify` and `react-imask` — both work in client components.

**Watch:** `/answer/:urlId` is public and must render outside the authenticated `(app)` group and
outside anything that calls Clerk hooks expecting a session.

### 5.6 Edge policy (D7)

**Security headers** move from `infra/nginx/nginx.prod.conf` to `next.config.ts` `headers()`:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS with a 2-year max-age, and the CSP
allowlisting `self` plus Clerk domains. Port the CSP directives literally from the nginx config —
Clerk is sensitive to a missing `frame-src` or `connect-src` entry.

**Rate limiting** uses `@upstash/ratelimit` in `middleware.ts`, keyed on the client IP:

| Route | Limit |
|---|---|
| `GET /api/public/links/[urlId]` | 10 req/s, burst 20 |
| `POST /api/public/links/[urlId]/answers` | 5 req/s, burst 10 |
| `POST /api/public/links/[urlId]/diary` | 5 req/s, burst 10 |
| all other `/api/*` | 30 req/min (matches the old .NET global limiter) |

Use `slidingWindow` with `ephemeralCache` enabled to reduce Redis round-trips on hot paths.

**CORS** is deleted. Frontend and API become same-origin, so the allowlist in `Program.cs` and the
`CORSMiddleware` in `main.py` have nothing left to do.

---

## 6. Environment variables

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon integration | Auto-injected |
| `DATABASE_URL_UNPOOLED` | Neon integration | Used by `drizzle-kit` for migrations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Was `VITE_CLERK_PUBLISHABLE_KEY` |
| `CLERK_SECRET_KEY` | Clerk | **New** — required by the Next SDK |
| `MAILGUN_API_KEY` | existing `.env` | Unchanged |
| `MAILGUN_DOMAIN` | existing `.env` | `mg.nutrimurt.com.br` |
| `MAILGUN_FROM` | existing `.env` | `NutriMurt <noreply@mg.nutrimurt.com.br>` |
| `UPSTASH_REDIS_REST_URL` | Upstash integration | Auto-injected |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash integration | Auto-injected |
| `NEXT_PUBLIC_APP_URL` | manual | Replaces `WEBSITE_URL`; used to build emailed answer links |
| `EMAIL_SEND_ENABLED` | manual | **New** — `"true"` in Production only. Anything else makes `lib/email.ts` log the message instead of calling Mailgun. Preview and Development share the production database, so without this a preview deploy would mail real patients; a delivered email cannot be undone the way a row can. The daily quota slot is still reserved either way, so the guardrail behaves identically everywhere. |

**Retired:** `DB_PASSWORD`, `CONNECTION_STRING`, `WEBSITE_URL`, `VITE_API_BASE_URL`,
`VITE_PY_BASE_URL`, `Clerk:Authority`, `ConnectionStrings:DefaultConnection`.

Set every variable across all three Vercel environments (Production, Preview, Development) before
the first deploy. A missing `CLERK_SECRET_KEY` fails at build time, not runtime.

---

## 7. Delivery plan (D11)

Long-lived branch `vercel-migration`. Seven PRs, each independently reviewable and testable.
No merge to `main` until PR 7 passes acceptance.

### PR 1 — Scaffold and data layer
- `create-next-app` at the repo root via the scratch-directory procedure in §4.1 (TypeScript, App
  Router, Tailwind). Reconcile `.gitignore` and root `.env` by hand.
- Provision Neon + Upstash via Vercel Marketplace.
- `lib/db/schema.ts` covering all 12 tables, `drizzle.config.ts`, generated initial migration.
- `npm run db:migrate` wired into the Vercel build command.
- **Done when:** `drizzle-kit migrate` creates all 12 tables on Neon; `/api/health` returns 200 on a
  preview deploy.

### PR 2 — Auth and middleware
- `@clerk/nextjs`, `ClerkProvider` in the root layout, `ptBR` localization preserved.
- `middleware.ts` with the public-route matcher.
- `lib/auth.ts` → `requireUserId()`.
- Sign-in page at `app/sign-in/[[...sign-in]]/page.tsx`.
- **Done when:** a protected stub route returns 401 anonymously and 200 with a valid Clerk token.

### PR 3 — Core CRUD routes
- `/api/patients` (incl. `?include=all`), `/api/questionnaires`, `/api/questions`, `/api/dashboard`.
- `lib/guardrails.ts`, zod schemas, CPF and phone validation with unit tests.
- **Done when:** every route is user-scoped, guardrail breaches return 409, validation failures
  return 400 in the shape `apiClient.ts` expects.

### PR 4 — Links, public answers, email
- `/api/patients/[id]/links` (list, send, delete), `/api/links/[urlId]`,
  `/api/public/links/[urlId]` and its `answers` / `diary` sub-routes.
- `lib/url-id.ts`, `lib/email.ts`, `lib/services/answers.ts`, `lib/services/email-quota.ts`.
- **Done when:** a link can be created, emailed via Mailgun, opened anonymously, and answered; the
  daily send cap of 10 returns 409 on the 11th attempt; the public route leaks no PII beyond
  `patient.name`.

### PR 5 — Meal plans and PDF
- `/api/meal-plans` CRUD plus `/api/meal-plans/[id]/pdf`.
- `lib/pdf/MealPlanDocument.tsx`, fonts registered.
- **Done when:** a generated PDF is visually compared against one from the current production API
  and matches on layout, fonts, and both substitution columns.

### PR 6 — Frontend port
- All of §5.5.
- Delete `nutrimurt.Web/`.
- **Done when:** every route in §3.5 renders and functions on a preview deploy, `npm run build`
  passes with no type errors, and the PDF download filename is correct.

Two URLs changed, per the route mapping: `/viewAnswer/:urlid` → `/view-answer/[urlId]` and
`/patientSummary/:patientId` → `/patients/[patientId]`. Both were only ever reached from in-app
links, which moved with them, but any bookmark a user holds will 404.

Things the port could not carry over literally:

- **`<SignedIn>` no longer exists** in Clerk Core 3. The sidebar is a client component that already
  reads the session for its user card, so it gates on `isLoaded && isSignedIn` and renders nothing
  until Clerk resolves — which also removes the signed-out flash of the nav. `<UserButton>` lost
  its `afterSignOutUrl` prop too; that moved to `ClerkProvider`.
- **`useSearchParams()` forces a client bailout during prerender** unless it sits under a Suspense
  boundary, so both routes rendering `MealPlanForm` wrap it in `<Suspense fallback={null}>`. The
  SPA wrapped its entire router the same way, so there is no new loading flash.
- **`<ProtectedRoute>` is gone**, replaced by `middleware.ts` plus the `(app)` group layout.
  `/answer/[urlId]` sits outside that group because patients reach it with no session.
- **Fonts moved from a Google Fonts `<link>` to `next/font`**, which self-hosts them and removes a
  render-blocking request.
- **`docker-compose*.yml` now references a `nutrimurt.Web/dist` that no longer exists**, so the old
  stack cannot be rebuilt from this branch. Those files are deleted in PR 7 anyway; production runs
  from its existing build until cutover.

### PR 7 — Edge policy, cleanup, cutover prep
- Security headers in `next.config.ts`, rate limiting in `middleware.ts`.
- **Tag `pre-vercel-migration` and push it before deleting anything** (§4.1).
- Delete `nutrimurt.Api/`, `nutrimurt.PyService/`, `nutrimurt.sln`, `infra/`, all
  `docker-compose*.yml`, root `requirements.txt`, root `.env`.
- Rewrite `README.md` and replace `PRODUCTION.md` with a short Vercel deployment note.
- **Done when:** §9 acceptance criteria all pass on a preview deploy.

### Phase 2 (deferred, not in this scope)
Convert the dashboard, patient summary, and meal plan view to Server Components with Server Actions
for mutations, once parity is proven in production.

---

## 8. Cutover (D10 — immediate DNS)

Immediate cutover was chosen with no rollback target. These steps reduce the blast radius:

1. **Pre-flight on preview.** Complete every §9 acceptance check on the `*.vercel.app` preview URL
   using the Clerk **development** instance. Do not start cutover with anything failing.
2. **Add the domain in Vercel** and register the DNS records while the droplet still serves
   traffic. Vercel provisions the certificate ahead of the switch.
3. **Lower the TTL** on the `nutrimurt.com.br` A record to 60s at least 24 hours beforehand. This is
   the single most valuable mitigation — it shrinks the worst-case revert from hours to minutes.
4. **Switch Clerk to the production instance** in Vercel env vars and redeploy.
5. **Flip the A record** to Vercel.
6. **Smoke test within 5 minutes:** sign in, create a patient, send a link, open it in a private
   window, submit answers, download a meal plan PDF.
7. **Do not delete the droplet.** Stop the containers, keep the machine and its snapshot for 30
   days. With a 60s TTL, reverting the A record and running `docker compose up -d` is a
   sub-5-minute recovery path — the informal rollback that D10 otherwise gives up.
8. **Decommission** after 30 clean days: destroy the droplet, remove the Let's Encrypt cron job,
   and revoke unused Mailgun keys.

---

## 9. Acceptance criteria

Behaviour parity with the current production stack.

**Functional**
- [ ] Clerk sign-in and sign-out work; unauthenticated access to any `(app)` route redirects to `/sign-in`.
- [ ] Patients: list, create, read, update, delete — all scoped to the signed-in user.
- [ ] `?include=all` returns the patient with links, questionnaires, answers, and diaries.
- [ ] Questionnaires and questions: full CRUD, including alternatives.
- [ ] Link creation generates a 32-char lowercase hex `url_id`.
- [ ] Sending a link delivers a Mailgun email whose URL resolves to the live answer page.
- [ ] `/answer/[urlId]` loads anonymously and exposes no PII beyond the patient's name.
- [ ] Both questionnaire and diary answers submit and persist; `last_answered` updates.
- [ ] Meal plans: full CRUD; PDF matches the current output.
- [ ] Dashboard stats and all three recent-activity lists populate correctly.

**Non-functional**
- [ ] All 8 guardrails enforced server-side, returning 409.
- [ ] Rate limits enforced at the §5.6 thresholds, returning 429.
- [ ] Security headers present on every response; CSP does not break Clerk.
- [ ] No cross-user data leakage — every query filters on `user_id`.
- [ ] `npm run build` passes with zero TypeScript errors.
- [ ] PDF generation completes inside the route's `maxDuration`.

**Cleanup**
- [ ] `pre-vercel-migration` tag created and pushed **before** any deletion.
- [ ] `nutrimurt.Api/`, `nutrimurt.PyService/`, `infra/`, and all compose files removed.
- [ ] `README.md` describes only the Next.js stack.
- [ ] No `VITE_*`, `CONNECTION_STRING`, or `DB_PASSWORD` references remain.

---

## 10. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **CSP breaks Clerk after cutover.** The nginx CSP is tuned for Clerk's domains; a missed directive silently kills sign-in. | High | Port CSP directives literally. Verify sign-in on preview *before* cutover, with the browser console open. |
| R2 | **PDF fidelity drift.** `@react-pdf/renderer` uses a different layout engine than QuestPDF. | Medium | Generate the same meal plan from both stacks and diff visually. Budget a full day for PR 5 — it is the least mechanical port. |
| R3 | **`maxDuration` timeout on PDF generation.** | Medium | ✅ `maxDuration = 30` and `runtime = "nodejs"` set in PR 5. A 50-entry plan, the guardrail maximum, renders in well under a second locally and is covered by a test that fails if it ever exceeds 20s. **Still outstanding:** confirm the ceiling on the target Vercel plan, since Hobby caps below 30s and the platform value wins. |
| R4 | **Email quota race.** `reserve_email_send_slot` runs under one Python process today; serverless runs many concurrently, so a naive read-then-write lets users exceed 10/day. | Medium | Implement as a single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, then reject on the returned count. ✅ Done in PR 4: `lib/services/email-quota.ts` is a single `INSERT ... ON CONFLICT DO UPDATE` whose `WHERE` decides inside the row lock, so an over-quota attempt returns no row and never inflates the counter. A concurrency test asserts exactly 10 of 20 parallel sends succeed. |
| R5 | **Immediate cutover with no rollback (accepted, D10).** | High | 60s TTL pre-lowered; droplet stopped but retained 30 days; 5-minute smoke test immediately post-flip. |
| R6 | **CPF validation port bug** silently accepts invalid documents. | Medium | Unit-test the ported check-digit algorithm against known-valid and known-invalid CPFs before PR 3 merges. |
| R7 | **Neon cold starts** on the free tier add latency after idle periods. | Low | Acceptable at current scale. Enable the scale-to-zero delay setting if it becomes noticeable. |
| R8 | **Dropped legacy endpoints** turn out to be referenced somewhere. | Low | ✅ Already verified unreferenced (§4.3). Re-grep before PR 7 deletes the Python service. |
| R9 | **Body-shape change** on answer submission breaks the public flow — the most damaging silent failure, since patients hit it unauthenticated. | Medium | ✅ Routes and clients changed together in PR 4; a third call site turned up in `features/patients/pyApi.ts` (§4.3). Integration tests cover the new shape. **Still outstanding:** the end-to-end check in a private window on a preview deploy. |

---

## 11. Effort estimate

| PR | Scope | Estimate |
|---|---|---|
| 1 | Scaffold + Drizzle schema (12 tables) | 1 day |
| 2 | Clerk auth + middleware | 0.5 day |
| 3 | Core CRUD + validation + guardrails | 1.5 days |
| 4 | Links, public answers, email | 1.5 days |
| 5 | Meal plans + PDF | 1.5 days |
| 6 | Frontend port | 2 days |
| 7 | Edge policy, cleanup, docs | 1 day |
| — | Cutover + smoke test | 0.5 day |
| | **Total** | **~9.5 working days** |

PR 5 (PDF) and PR 6 (frontend) carry the most uncertainty. PRs 3–5 are largely independent and
could be parallelised if more than one person is working the branch.
