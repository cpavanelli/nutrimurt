# Testing

The automated suite has two tiers and is the bar for every change.

| Tier | Runs against | Command | Covers |
|---|---|---|---|
| Unit | Nothing external | `npm test` | Pure logic, validation, error shaping, dates, PDF rendering, and edge policy selection |
| Integration | Disposable Postgres 16 database | `npm run test:integration` | Route handlers end to end: user scoping, guardrails, validation contract, FK cascades, and transactions |

`npm run test:all` runs both. CI also runs lint, `tsc --noEmit`, and a build with
no `DATABASE_URL`; the latter ensures importing a route module never opens a
database connection.

## Running integration tests

Set `TEST_DATABASE_URL` to a disposable Postgres 16 database, or provide the
default local database at
`postgresql://nutrimurt:nutrimurt@localhost:55432/nutrimurt_test`, then run:

```bash
npm run test:integration
```

GitHub Actions provisions this database as a job service. The suite applies the
real migrations from `drizzle/` at startup, exercises the same constraints and
cascades as production, and truncates every table between tests.

## How tests reach route handlers

Two seams make route handlers testable without a running Next.js server or a
real Clerk instance:

- `setDatabaseProvider()` in `lib/db/index.ts` swaps the Neon driver for
  node-postgres. Production code only sees the driver-independent `Database`
  and `Transaction` types.
- `test/integration/session.ts` holds the simulated Clerk session. The test
  setup mocks `@clerk/nextjs/server`, so `signInAs(USER_B)` switches users
  between requests.

Tests import route handlers directly and invoke them with real `Request`
objects. Every route group includes a check that a second user receives a 404
instead of another user's row.

## Preview checks

Integration tests use node-postgres rather than Neon's HTTP and WebSocket
drivers. Preview deployments close that gap and are also where the FRD §9
acceptance checks belong.

Preview and Development currently share the production Neon branch. Smoke tests
must clean up their data, and Vercel Deployment Protection should remain enabled
for previews because unauthenticated patient routes are live endpoints.
