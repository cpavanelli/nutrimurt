# nutrimurt

Nutritionist management platform with:
- `nutrimurt.Api` (.NET 8 Web API + EF Core + PostgreSQL)
- `nutrimurt.Web` (React + Vite + TypeScript + Tailwind + Clerk)
- `nutrimurt.PyService` (FastAPI + SQLAlchemy + PostgreSQL + Mailgun)

## Projects
- `nutrimurt.Api`: patient/questionary API, secured with Clerk JWT authentication.
- `nutrimurt.Web`: SPA consuming .NET API and Python service endpoints.
- `nutrimurt.PyService`: email sending + patient link/questionary workflows.

## Architecture

All services run behind an nginx reverse proxy that handles TLS termination, routing, rate limiting, and security headers. Internal services communicate over plain HTTP.

```
Browser (https://localhost)
  └─► nginx gateway (:443 TLS, :80 redirect)
        ├─► /api/*  → nutrimurt.Api (:8080)
        ├─► /py/*   → nutrimurt.PyService (:8000)
        └─► /*      → React SPA (static files)
```

## Security

### Authentication (Clerk)
Both the .NET API and the React frontend use [Clerk](https://clerk.com) for authentication.

- **API**: Clerk JWT bearer authentication is configured in `Program.cs`. The Clerk authority URL is set in `appsettings.json` under `Clerk:Authority`. All API endpoints require a valid Clerk JWT unless explicitly marked `[AllowAnonymous]`.
- **Web**: The React app uses `@clerk/clerk-react`. The publishable key is set via the `VITE_CLERK_PUBLISHABLE_KEY` environment variable.

### CORS
CORS is restricted to specific origins:
- `http://localhost:5173` (Vite dev server)
- `https://localhost` (Docker HTTPS)
- `https://yourdomain.com` (production)

### Rate limiting
Rate limiting is applied at two layers:

**nginx** (per-client IP):
- `/py/answer/public/*`: 10 req/s, burst 20
- `/py/savePatientAnswers`, `/py/savePatientDiary`: 5 req/s, burst 10

**API** (global, per-client IP):
- 30 requests per minute with a fixed window

### Security headers (nginx)
All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS, 2-year max-age)
- `Content-Security-Policy` (restricts scripts, styles, images, connections, frames to `self` and Clerk domains)

## Docker setup

### Prerequisites
- Docker and Docker Compose
- [mkcert](https://github.com/FiloSottile/mkcert) (for local HTTPS)

### Environment
Create a `.env` file in the repository root:

```env
DB_PASSWORD=your_db_password
```

### Local HTTPS with mkcert

Install mkcert and generate locally-trusted certificates (one-time setup):

```powershell
choco install mkcert        # or: scoop bucket add extras && scoop install mkcert
mkcert -install
mkdir infra\certs
mkcert -cert-file infra/certs/localhost.pem -key-file infra/certs/localhost-key.pem localhost 127.0.0.1 ::1
```

The `infra/certs/` directory is gitignored. Each developer generates their own local certificates.

### Run with Docker (HTTPS)

Build the frontend first, then start all services:

```powershell
cd nutrimurt.Web
npm install
npm run build
cd ..
docker compose up --build
```

The app is available at **https://localhost** with a browser-trusted certificate.

### Docker services

| Service    | Image / Build          | Internal port | Exposed port |
|------------|------------------------|---------------|--------------|
| postgres   | `postgres:16`          | 5432          | 5432         |
| api        | `./nutrimurt.Api`      | 8080          | (internal)   |
| pyservice  | `./nutrimurt.PyService`| 8000          | (internal)   |
| gateway    | `nginx:alpine`         | 80, 443       | 80, 443      |

### Nginx configs
- `infra/nginx/nginx.dev-ssl.conf` -- local dev with HTTPS (mkcert), used by default in `docker-compose.yml`
- `infra/nginx/nginx.conf` -- plain HTTP fallback for quick local testing
- `infra/nginx/nginx.prod.conf` -- production with Let's Encrypt (used by `docker-compose.prod.yml`)

### Production deployment
`docker-compose.prod.yml` extends the base compose file with:
- Let's Encrypt certificates via a Certbot sidecar container
- Automatic certificate renewal every 12 hours
- `nginx.prod.conf` with real domain TLS

## Database (PostgreSQL)

PostgreSQL runs as a Docker container. Connection details:
- Host: `localhost` (from host) / `postgres` (from containers)
- Port: `5432`
- DB: `nutrimurtdb`
- User: `nutrimurt`
- Password: set via `DB_PASSWORD` in `.env`

## .NET API (`nutrimurt.Api`)
### Tech
- .NET 8
- EF Core 8 (snake_case naming convention)
- Npgsql provider
- Clerk JWT authentication
- Rate limiting (fixed window)

### Notes
- `Patient.Birth` uses `DateOnly?` and is stored as PostgreSQL `date`.
- TLS is terminated at the nginx gateway; the API runs on plain HTTP internally.

### Run migrations
From `nutrimurt.Api`:

```powershell
dotnet ef database update
```

If you reset migrations and hit table conflicts, recreate the local DB volume:

```powershell
docker compose down -v
docker compose up --build
```

Then run `dotnet ef database update` again.

### Run API (standalone, without Docker)
From `nutrimurt.Api`:

```powershell
dotnet run
```

Default URL: `http://localhost:5054`

### Main endpoints
- `GET /api/patients`
- `GET /api/patients/{id}`
- `POST /api/patients`
- `PUT /api/patients/{id}`
- `DELETE /api/patients/{id}`
- `GET /api/patients/{patientId}/links`
- `POST /api/patients/{patientId}/links/send`

## Web (`nutrimurt.Web`)
### Setup
From `nutrimurt.Web`:

```powershell
npm install
```

Create `.env` or `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5054
VITE_PY_BASE_URL=/py
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

When running via Docker/nginx, the frontend is served as static files and API calls use relative paths through the gateway -- `VITE_API_BASE_URL` is not needed.

For direct local calls to the Python service without a reverse proxy:

```env
VITE_PY_BASE_URL=http://localhost:8001/py
```

### Run (standalone, without Docker)
From `nutrimurt.Web`:

```powershell
npm run dev
```

Default URL: `http://localhost:5173`

### Routes
- `/`
- `/patients`
- `/answer/:urlID`

## Python Service (`nutrimurt.PyService`)
### Tech
- FastAPI
- SQLAlchemy 2
- Psycopg (PostgreSQL)
- Mailgun (email delivery)

### Environment
Create/update `nutrimurt.PyService/.env`:

```env
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM=...
CONNECTION_STRING=postgresql+psycopg://nutrimurt:yourpassword@localhost:5432/nutrimurtdb
WEBSITE_URL=http://localhost:5173
```

When running via Docker, these are set in `docker-compose.yml` instead.

### Setup (standalone, without Docker)
From `nutrimurt.PyService`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Run (standalone, without Docker)
From `nutrimurt.PyService`:

```powershell
uvicorn app.main:app --reload --port 8001
```

### Main endpoints
- `GET /py/`
- `GET /py/health`
- `POST /py/patient-questionary/{patient_id}/{questionary_id}`
- `POST /py/sendEmail/{urlID}`
- `GET /py/getPatientQuestionary/{urlID}`
- `GET /py/getPatientLink/{urlID}`
- `GET /py/getQuestionaryPatientLink/{urlID}`
- `GET /py/getDiaryPatientLink/{urlID}`
- `POST /py/savePatientAnswers`
- `POST /py/savePatientDiary`

`/py/getQuestionaryPatientLink/{urlID}` and `/py/getDiaryPatientLink/{urlID}` remain available as specialized legacy endpoints.

## Local development flows

### Option A: Full Docker stack (recommended)
1. Set up `.env` with `DB_PASSWORD`
2. Generate mkcert certificates (one-time, see above)
3. Build the frontend: `npm run build` (inside `nutrimurt.Web`)
4. Start everything: `docker compose up --build`
5. Open https://localhost

### Option B: Services running individually
1. Start Postgres: `docker compose up postgres -d`
2. Apply API migrations: `dotnet ef database update` (inside `nutrimurt.Api`)
3. Start .NET API: `dotnet run` (inside `nutrimurt.Api`)
4. Start Web: `npm run dev` (inside `nutrimurt.Web`)
5. Start Python service: `uvicorn app.main:app --reload --port 8001` (inside `nutrimurt.PyService`)
