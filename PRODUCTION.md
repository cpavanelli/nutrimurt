# Vercel deployment

NutriMurt deploys as a Next.js project on Vercel. Connect the GitHub repository,
leave the project root at the repository root, and keep the build command from
`vercel.json`:

```bash
npm run db:migrate && npm run build
```

Configure these variables for Production, Preview, and Development:

- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` from Neon
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from Clerk
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from Upstash
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`
- `NEXT_PUBLIC_APP_URL`, scoped to the deployed environment
- `EMAIL_SEND_ENABLED=true` in Production only

Each pull request creates a preview deployment. Before promoting it, complete
the acceptance checklist in `docs/FRD-vercel-migration.md` §9. In particular,
verify Clerk sign-in and sign-out with the browser console open, confirm every
response carries the CSP and security headers, exercise the documented rate
limits until they return 429, and smoke-test the public answer flow and PDF
download.

Production deploys should use the Clerk production instance and the canonical
`NEXT_PUBLIC_APP_URL` so emailed patient links resolve to the live site.
