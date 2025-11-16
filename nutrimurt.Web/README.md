nutrimurt
Nutritionist management platform with ASP.NET Core Web API backend and React + Vite + Tailwind frontend.

Projects
nutrimurt.Api — .NET 8 Web API (EF Core 8 + SQL Server/Azure SQL) exposing patient CRUD endpoints.
nutrimurt.Web — React 19 + Vite + TypeScript + Tailwind CSS 3 SPA consuming the API.
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

Method	Route	Description
GET	/api/patients	List patients
GET	/api/patients/{id}	Get one
POST	/api/patients	Create
PUT	/api/patients/{id}	Update
DELETE	/api/patients/{id}	Delete
Frontend (nutrimurt.Web)
Setup
cd nutrimurt.Web
npm install
Tailwind 3 configured (tailwind.config.js, postcss.config.js).
.env or .env.local: VITE_API_BASE_URL=http://localhost (line 5054).
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
Run API with dotnet watch run --urls http://localhost (line 5054).
Run frontend with npm run dev.
React app calls API using the base URL env variable; ensure both servers are running.
