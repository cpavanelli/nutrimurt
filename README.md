# nutrimurt

Nutritionist management platform with:
- `nutrimurt.Api` (.NET 8 Web API + EF Core + PostgreSQL)
- `nutrimurt.Web` (React + Vite + TypeScript + Tailwind)
- `nutrimurt.PyService` (FastAPI + SQLAlchemy + PostgreSQL + Mailgun)

## Projects
- `nutrimurt.Api`: patient/questionary API.
- `nutrimurt.Web`: SPA consuming .NET API and Python service endpoints.
- `nutrimurt.PyService`: email sending + patient link/questionary workflows.

## Database (PostgreSQL via Docker)
From repository root:

```powershell
docker compose up -d
```

`docker-compose.yml` starts PostgreSQL with:
- Host: `localhost`
- Port: `5432`
- DB: `nutrimurtdb`
- User: `nutrimurt`
- Password: `pass123`

## .NET API (`nutrimurt.Api`)
### Tech
- .NET 8
- EF Core 8
- Npgsql provider

### Notes
- CORS is open in development (`AllowAnyOrigin/Method/Header`).
- `Patient.Birth` uses `DateOnly?` and is stored as PostgreSQL `date`.

### Run migrations
From `nutrimurt.Api`:

```powershell
dotnet ef database update
```

If you reset migrations and hit table conflicts, recreate local DB volume:

```powershell
docker compose down -v
docker compose up -d
```

Then run `dotnet ef database update` again.

### Run API
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
```

### Run
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

### Environment
Create/update `nutrimurt.PyService/.env`:

```env
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM=...
CONNECTION_STRING=postgresql+psycopg://nutrimurt:pass123@localhost:5432/nutrimurtdb
WEBSITE_URL=http://localhost:5173
```

### Setup
From `nutrimurt.PyService`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Run
From `nutrimurt.PyService`:

```powershell
uvicorn app.main:app --reload --port 8001
```

### Main endpoints
- `GET /`
- `GET /health`
- `POST /patient-questionary/{patient_id}/{questionary_id}`
- `POST /sendEmail/{urlID}`
- `GET /getPatientQuestionary/{urlID}`
- `GET /getPatientLink/{urlID}`
- `POST /savePatientAnswers`

## Local development flow
1. Start Postgres: `docker compose up -d`
2. Apply API migrations: `dotnet ef database update` (inside `nutrimurt.Api`)
3. Start .NET API: `dotnet run` (inside `nutrimurt.Api`)
4. Start Web: `npm run dev` (inside `nutrimurt.Web`)
5. Start Python service: `uvicorn app.main:app --reload --port 8001` (inside `nutrimurt.PyService`)
