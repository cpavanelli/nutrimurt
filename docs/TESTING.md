# Testing

The pre-migration stack had no automated tests. This document is the strategy
introduced with PR 3 and is the bar for every later PR in the Vercel migration.

## Two tiers

| Tier | Runs against | Command | Covers |
|---|---|---|---|
| Unit | nothing external | `npm test` | Pure logic: CPF check digits, validation schemas, error shaping, date formatting, edge policy selection |
| Integration | local Postgres 16 in Docker | `npm run test:integration` | Route handlers end to end: user scoping, guardrails, validation contract, FK cascades, transaction boundaries |

`npm run test:all` runs both. CI runs both plus `lint`, `tsc --noEmit`, and a
build with **no** `DATABASE_URL` — that last one guards the lazy database
initialisation, so importing a route module never opens a connection.

## Running the integration tests

```bash
npm run db:test:up          # postgres:16 on :55432, data in tmpfs
npm run test:integration
npm run db:test:down
```

The container is defined in [`test/docker-compose.yml`](../test/docker-compose.yml)
— deliberately not at the repository root, because PR 7 deletes
`docker-compose*.yml` along with the old stack.

Override the connection with `TEST_DATABASE_URL` if you want to point at
something else. The suite applies the real migrations from `drizzle/` on
startup, so the tests exercise the same constraints and cascades production
has, and truncates every table between tests.

## How the tests reach the routes

Two seams make route handlers testable without a running Next.js server or a
real Clerk instance:

- **`setDatabaseProvider()`** in `lib/db/index.ts` swaps the Neon driver for
  node-postgres. Production code only ever sees the driver-agnostic `Database`
  and `Transaction` types.
- **`test/integration/session.ts`** holds the pretend Clerk session.
  `setup.ts` mocks `@clerk/nextjs/server` to read from it, so `signInAs(USER_B)`
  switches users between requests.

Tests then import the handlers directly and call them with real `Request`
objects:

```ts
signInAs(USER_A);
const response = await POST(jsonRequest(patientPayload()));
expect(response.status).toBe(201);
```

Every route group has at least one test proving a second user gets a 404
instead of another user's row. Add one for each new route.

## What this does not cover

Integration tests run against node-postgres, not Neon's HTTP and WebSocket
drivers. They prove the routes are written against a transactional API and that
the SQL is correct; they do not prove Neon's WebSocket transactions behave
identically.

That gap is closed on a **preview deploy**, which is also where the §9
acceptance checks in the FRD belong.

Verified on the PR 3 preview: a questionnaire edit that deletes one
alternative, updates another in place, and inserts both a new alternative and a
new question — all in one `withTransaction()` call — committed correctly, and
the follow-up read showed exactly the expected rows with the surviving ids
preserved. Neon's WebSocket driver therefore works on Vercel's Node runtime, so
the fallback of expressing those writes as `db.batch()` on the HTTP driver is
not needed.

Repeat that check whenever a transactional write changes, and re-run it against
the production build before cutover.

> **Every Vercel environment shares one `DATABASE_URL`.** Preview and
> Development point at the production Neon branch, so anything a preview deploy
> writes lands in the real database. This is a deliberate choice for the
> duration of the migration — there is one operator and one dataset, and the
> isolation the alternative buys is not needed yet.
>
> What it costs: smoke tests must clean up after themselves, and a preview URL
> is a live endpoint against real data. Keep Vercel Deployment Protection
> enabled for Preview so those URLs are not publicly reachable — that matters
> from PR 4 onward, once unauthenticated patient routes exist.
>
> Isolating this later is one Neon branch plus a Preview-scoped `DATABASE_URL`
> in Vercel. No schema or code change, so it can be done at any point.
