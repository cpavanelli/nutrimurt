nutrimurt
Nutritionist management platform with ASP.NET Core Web API backend, React + Vite + Tailwind frontend, and a Python email/questionary service.

Projects
nutrimurt.Api - .NET 8 Web API (EF Core 8 + SQL Server/Azure SQL) exposing patient CRUD endpoints.
nutrimurt.Web - React 19 + Vite + TypeScript + Tailwind CSS 3 SPA consuming the API.
nutrimurt.PyService - FastAPI microservice for email delivery and patient questionary links.

Backend (nutrimurt.Api)
Setup
Configure the connection string in nutrimurt.Api/appsettings.json (currently points to Azure SQL).
Ensure EF Core tools installed: dotnet tool install --global dotnet-ef (add C:\Users\<you>\.dotnet\tools to PATH if needed).

Database migrations
cd nutrimurt.Api
dotnet ef migrations add <MigrationName>
dotnet ef database update

Run API
cd nutrimurt.Api
dotnet watch run --urls http://localhost:5054
CORS policy (Program.cs) allows any origin/method/header during development.
Patient entity: Id, Name, Email, Phone (required + regex), CreatedAt (UTC), Birth, Weight, Height.

Endpoints:
Method  Route                     Description
GET     /api/patients             List patients
GET     /api/patients/{id}        Get one
POST    /api/patients             Create
PUT     /api/patients/{id}        Update
DELETE  /api/patients/{id}        Delete

Frontend (nutrimurt.Web)
Setup
cd nutrimurt.Web
npm install
Tailwind 3 configured (tailwind.config.js, postcss.config.js).
.env or .env.local: VITE_API_BASE_URL=http://localhost:5054

Run
npm run dev
Vite serves on http://localhost:5173.

Features
React Router routes: / (entry), /patients.
features/patients includes:
types.ts patient models.
api.ts fetch helpers hitting ASP.NET API.
PatientsPage.tsx list with Tailwind table, modal forms, create/edit/delete handling.
PatientForm.tsx reusable form (includes phone mask via react-imask).
Global styling via Tailwind directives in src/index.css; locale set to pt-BR in index.html.

Development workflow
Run API with dotnet watch run --urls http://localhost:5054.
Run frontend with npm run dev.
React app calls API using the base URL env variable; ensure both servers are running.

Python service (nutrimurt.PyService)
Role
Sends transactional emails to patients (Mailgun) and will generate/send links for answering questionaries.
Provides FastAPI endpoints to integrate with the .NET backend for questionary delivery.

Setup
Requires Python 3.11+ and pip.
cd nutrimurt.PyService
Create venv: python -m venv .venv and activate it.
Install deps: pip install -r requirements.txt
Environment: create .env with Mailgun credentials
MAILGUN_API_KEY=<key>
MAILGUN_DOMAIN=<domain>
MAILGUN_FROM=<from@domain>

Run
Local dev: uvicorn app.main:app --reload --port 8001
Health checks: GET / and GET /health

Endpoints implemented so far
GET / : Service info/version.
GET /health : Simple ok status.
POST /patient-questionary/{patient_id}/{questionary_id} : placeholder for generating a questionary link and notifying the patient.
GET /testEmail : demo endpoint that triggers a test email via Mailgun.

Email sender
app/emailsender.py uses Mailgun HTTP API (requests) with env-configured credentials.
Returns raw status/text from Mailgun; callers should handle failures as needed.
