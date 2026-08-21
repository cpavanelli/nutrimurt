# NutriMurt

NutriMurt is a nutritionist management application built as a single Next.js
application. It includes the authenticated staff UI, same-origin route handlers,
public patient questionnaires and diaries, email delivery, and meal-plan PDFs.

## Stack

- Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS 4
- Clerk authentication
- Neon Postgres with Drizzle ORM
- Upstash Redis rate limiting
- Mailgun email delivery
- `@react-pdf/renderer` meal-plan PDFs
- Vercel hosting

The browser and API share one origin. Next.js middleware handles authentication
and per-IP rate limits, while `next.config.ts` applies the production security
headers and CSP to every response.

## Local development

Requirements:

- Node.js 24
- npm
- Neon, Clerk, Upstash, and Mailgun credentials

Install dependencies and create `.env.local`:

```bash
npm ci
```

```env
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=mg.nutrimurt.com.br
MAILGUN_FROM=NutriMurt <noreply@mg.nutrimurt.com.br>
NEXT_PUBLIC_APP_URL=http://localhost:3000
EMAIL_SEND_ENABLED=false
```

Apply migrations and start the development server:

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`EMAIL_SEND_ENABLED` should remain `false` outside production. A disabled send
still reserves the daily quota slot but logs the message instead of contacting
Mailgun.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Next.js server |
| `npm run build` | Create the production build and type-check it |
| `npm run start` | Serve a completed production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:integration` | Run route-handler tests against `TEST_DATABASE_URL` |
| `npm run test:all` | Run unit and integration tests |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:migrate` | Apply Drizzle migrations |

See [docs/TESTING.md](docs/TESTING.md) for the integration-test database setup
and test isolation model.

## Routes

Staff pages are protected by Clerk. `/answer/[urlId]`, `/api/public/**`,
`/api/health`, and `/sign-in/**` are public.

The route handlers under `app/api/` cover patients, questionnaires, questions,
patient links, answers and diaries, dashboard data, meal plans, email delivery,
and PDF generation.

## Guardrails

The eight server-side resource quotas are:

| Resource | Limit |
|---|---:|
| Patients per user | 10 |
| Questionnaires per user | 10 |
| Questions per questionnaire | 10 |
| Alternatives per question | 10 |
| Links per patient | 10 |
| Email sends per UTC day | 10 |
| Meal plans per user | 20 |
| Entries per meal plan | 50 |

Patient submissions additionally allow at most 10 questions, 10 selected
alternatives per question, 500 characters per text value, 50 diary entries per
day, 90 distinct diary days, and 4,500 total diary entries. Route handlers
return `409 Conflict` for exhausted resource quotas and `400 Bad Request` for
invalid submissions.

## Deployment

Vercel runs `npm run db:migrate && npm run build` from `vercel.json`. Deployment
environment variables and preview verification are documented in
[PRODUCTION.md](PRODUCTION.md).
