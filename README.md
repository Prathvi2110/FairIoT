# FairIoT — Universal IoT Hardware Fairness Analyzer

**Making IoT Hardware Performance Fair, Transparent, and Explainable.**

FairIoT is a full-stack application for comparing IoT performance measurements across user-selected device groups. It supports sensor, actuator, communication, and resource-allocation analyses. Comparisons are computed from uploaded data; a detected statistical gap is not treated as proof of discrimination or cause.

## Stack and architecture

- **Web client:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **API:** Python 3.12, FastAPI, Pydantic, SQLAlchemy 2, PostgreSQL 16, Pandas, NumPy, SciPy, and scikit-learn (available for additional analytical methods).
- **Security:** Argon2id password hashing, short-lived HS256 JWT bearer tokens, account-scoped dataset/analysis/report access, file size/type validation, and environment-based secrets.
- **Storage:** Original uploaded bytes, inferred column metadata, analysis results, and generated CSV/PDF reports are stored in PostgreSQL. Sample CSVs are clearly labeled synthetic demonstration data.

The client uses relative `/api` requests. During separate local development, Vite proxies those requests to FastAPI on port 8000. Docker Compose builds the web client into the FastAPI container and runs PostgreSQL as a persistent service. The managed preview sandbox can use a development SQLite URL if PostgreSQL is unavailable; this is a preview convenience, not the documented production database configuration.

## Quick start — PostgreSQL with Docker Compose

Prerequisites: Docker Engine/Desktop with the Compose plugin, Node.js 22, and pnpm 11. The project pins pnpm to 11.25.0.

1. Copy `.env.example` to `.env` and replace the development-only PostgreSQL password and JWT secret. Use a URL-safe database password. For a strong JWT secret, run `python -c "import secrets; print(secrets.token_urlsafe(48))"` and put the result in `JWT_SECRET_KEY`.
2. Start the complete app and PostgreSQL: `docker compose up --build`.
3. Open `http://localhost:3000`. Register an account, download one of the simulated sample CSVs on the Datasets page, upload it, and run a comparison.
4. Check `http://localhost:3000/api/health` for API and database readiness and `http://localhost:3000/api/docs` for interactive FastAPI documentation.

PostgreSQL data is kept in the `fairiot_postgres` named volume. To stop the app without deleting data, run `docker compose down`. **Destructive:** `docker compose down -v` also deletes the database volume and all stored user data.

## Run frontend and backend separately

For a local PostgreSQL database, first configure `.env` as above and start only the database with `docker compose up -d db`. Then open two terminals from the project root.

**Terminal 1 — API:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — web client:**

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The Vite configuration proxies `/api` to `http://127.0.0.1:8000` by default. To proxy elsewhere, set `API_PROXY_TARGET` before starting Vite. To use a local SQLite file for quick development instead of PostgreSQL, set `DATABASE_URL=sqlite:///./fairiot.db` in `.env`; PostgreSQL remains the Compose and production/self-hosted target.

## Windows PowerShell setup

Install Python 3.12, Node.js 22, Docker Desktop (for PostgreSQL), and enable the pnpm package manager through Corepack. From PowerShell in the project root:

```powershell
Copy-Item .env.example .env
# Edit .env: replace POSTGRES_PASSWORD and JWT_SECRET_KEY first.
docker compose up -d db
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

In one PowerShell window, start the API:

```powershell
.\.venv\Scripts\Activate.ps1
Set-Location backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

In a second PowerShell window, from the project root:

```powershell
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install
pnpm dev
```

Visit `http://localhost:3000`. If PowerShell blocks virtual-environment activation, use `\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000` instead of activating the environment. The Vite-to-FastAPI proxy works unchanged on Windows.

## Sample datasets

`datasets/` contains four deterministic simulated CSV files with 120 observations each, four device groups, repeated device identifiers, and contextual columns. You can also regenerate them with `python scripts/generate_samples.py`. Synthetic records are for workflow demonstration only; they do not represent measured devices or real-world findings.

- `sensor_fairness_sample.csv`: response time, accuracy, calibration offset, failure rate, missing readings, and environmental sensitivity.
- `actuator_fairness_sample.csv`: activation delay, command success, response consistency, failure rate, and command load.
- `communication_fairness_sample.csv`: latency, packet loss, bandwidth, connection reliability, communication delay, and network availability.
- `resource_allocation_fairness_sample.csv`: allocated bandwidth, CPU utilization, memory, energy, processing share, and resource availability.

## Analysis and interpretation

The user selects any inferred group column, numeric metric, higher-/lower-is-better direction, threshold, minimum group size, and optional context column. The API calculates group sample sizes, means, medians, minima/maxima, sample standard deviations, and approximate 95% t-intervals where estimable. The relative gap is direction-aware and symmetric-scaled by the larger absolute group mean. Status is “Insufficient data” when any compared group has fewer than the selected minimum observations; otherwise a gap above the threshold is “Potential disparity”; otherwise it is “Fair under selected test.” These labels apply only to the selected test.

Optional context standardization uses context strata represented in every compared group and weights those stratum means by the pooled observed distribution of those shared strata. If no shared strata exist, the API keeps the result unadjusted and says so. Raw descriptive summaries remain visible. Context standardization is not a causal model and does not address unobserved workload, calibration, environment, network, or service needs. Equal performance is not always equitable performance.

## Implemented API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/profile`, `POST /api/auth/forgot-password`, and `POST /api/auth/reset-password`.
- `POST /api/datasets`, `GET /api/datasets`, `GET /api/datasets/{id}`, `DELETE /api/datasets/{id}`, `GET /api/datasets/samples`, and `GET /api/datasets/samples/{filename}`.
- `POST /api/analyses`, `GET /api/analyses`, `GET /api/analyses/{id}`, `POST /api/analyses/compare`, and `DELETE /api/analyses/{id}`.
- `GET /api/dashboard/stats`; `GET /api/reports/{analysis_id}/csv`; `GET /api/reports/{analysis_id}/pdf`.
- `GET /api/health`; OpenAPI docs at `/api/docs`.

## Password reset email

The reset form/API is implemented, but outgoing email is optional and is **not** configured in a fresh install. To send actual reset links, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, and, when required, `SMTP_USERNAME`/`SMTP_PASSWORD`; configure `FRONTEND_URL` to the real application origin. Without SMTP configuration, the API returns a privacy-preserving generic response and does not claim an email was delivered. Do not use a development JWT secret or example database password in a production deployment.

## Troubleshooting

- **The web client cannot reach the API:** check that FastAPI is listening on port 8000 and `GET /api/health` succeeds; when using a non-default API port, set `API_PROXY_TARGET` for Vite.
- **PostgreSQL connection fails:** confirm the `db` service is healthy (`docker compose ps`), the `.env` password matches, and local API `DATABASE_URL` uses `localhost:5432` (the container API uses `db:5432`).
- **Registration returns a duplicate-email error:** sign in with the existing account, or use a different email address. Passwords require at least 10 characters.
- **No groups/metrics are offered:** verify that the upload parsed correctly and includes at least one usable group column and one numeric column. The group and metric must be different columns.
- **Insufficient data:** add observations until each compared group meets the configured minimum; the default minimum is five.
- **Excel parsing fails:** `.xlsx` uses openpyxl and legacy `.xls` uses xlrd; keep the appropriate dependency installed and verify the workbook is not password-protected or corrupted.
- **Password reset email does not arrive:** an SMTP transport must be configured, reachable, and authenticated; reset responses intentionally do not disclose whether a given account exists.
- **Data disappeared:** local preview SQLite and the container filesystem are not a substitute for a durable database. Use the PostgreSQL Compose volume and make independent database backups for important user data.

## Security and data handling

Change development secrets before deployment, restrict network access to PostgreSQL, configure TLS at the application gateway, and provide SMTP credentials only through environment/secret management. Each dataset upload is limited to 15 MB, CSV/Excel formats, 300 columns, and 500,000 rows. Datasets and reports are stored as database binary data; deletion is account-scoped and dataset deletion also removes its associated analysis history. JWTs are held in the browser's `sessionStorage` and sent via the `Authorization: Bearer` header. No secret is built into frontend assets.
