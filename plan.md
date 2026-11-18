# FairIoT — Implementation and Design Plan

## Scope and architecture

Implement the requested FairIoT product as a multi-page, full-stack application, retaining the requested React + TypeScript + Vite + Tailwind CSS + Recharts + Lucide frontend, Python + FastAPI + Pydantic REST API, PostgreSQL + SQLAlchemy persistence, and Pandas/NumPy statistical analysis. Email/password authentication is explicit in the product brief, so the app will provide its own secure password-hash and JWT flow. The app will not depend on a fixed dataset schema: uploaded CSV/XLSX columns will be inferred from their content, then users choose a group column and numeric metric for each analysis.

The Vite development server will serve the web client on the project's configured port and proxy relative `/api` requests to a separate FastAPI service. PostgreSQL will be the canonical database, started with the supplied Docker Compose configuration and connected using an environment-based `DATABASE_URL`; data models will cover users, datasets and column metadata, analyses/results, and persisted downloadable reports. If the managed preview runtime cannot host a PostgreSQL process, its development-only configuration can use a compatible SQLAlchemy SQLite URL while the documented default production/self-hosted setup remains PostgreSQL; no frontend-only or fabricated analysis fallback will be used. The two-service development setup and frontend/API connection will be documented and checked.

The frontend will include a branded public landing page, registration/login/forgot-password/profile flows, a protected analytics workspace with dashboard, datasets, analysis, history, and four module views. Dataset upload, validation, preview, inferred types, missing/duplicate counts, ownership checks, delete, and sample downloads will be backed by the API. Analysis results will be computed server-side with per-group count, mean, median, range, standard deviation, uncertainty intervals when estimable, direction-aware relative gaps, threshold-based status, and clear limitations; a statistical gap will never be presented as proof of discrimination. Optional context fields will be identified and described, but no context adjustment will be claimed unless actually performed. CSV and PDF exports will use saved analysis results. The backend will enforce user ownership for private records and reports.

Four clearly labeled generated/simulated CSV datasets will provide varied, multi-group demonstration records for the sensor, actuator, communication, and resource-allocation modules. Analysis-history records and report content will persist through the database-backed application. Uploads will have extension, MIME/content, and size checks; secrets and connection strings will be environment-only and documented in `.env.example`. The README will include exact setup and run commands for frontend and backend separately, Docker Compose/PostgreSQL setup, Windows instructions, and troubleshooting.

## Project structure

- `frontend/`: Vite/React/TypeScript client; `src/components/`, `src/pages/`, `src/layouts/`, `src/services/`, `src/hooks/`, `src/types/`, and `src/charts/` divide reusable UI, routes, API calls, session handling, types, and Recharts views.
- `backend/app/api/`: versioned REST routers for auth, datasets, analyses, history, reports, and dashboard.
- `backend/app/core/`: settings, security, JWT handling, validation, and logging.
- `backend/app/database/`: SQLAlchemy engine, session and initialization.
- `backend/app/models/` and `backend/app/schemas/`: relational entities and Pydantic request/response models.
- `backend/app/services/` and `backend/app/analysis/`: dataset lifecycle, report generation, dashboard aggregation, and explainable fairness computations.
- `backend/app/utils/`, `backend/main.py`: shared safety helpers and FastAPI application entry point.
- `datasets/`: the four labeled simulated CSV samples; `reports/`: documented report workspace/output policy.
- Root: `requirements.txt`, frontend `package.json`/lockfile, `.env.example`, `docker-compose.yml`, and `README.md`; `frontend/public/manus-routes.json` declares the site routes.

## Design direction

- **Design Movement:** Precision analytics inspired by modern enterprise observability tools, rather than a generic admin template.
- **Core Principles:** Make comparisons legible; surface provenance and uncertainty; keep the working analysis one action away; preserve generous whitespace without sacrificing dense tables.
- **Color Philosophy:** White and pale-blue surfaces create a calm analytical canvas; deep navy gives labels and data hierarchy authority; a restrained teal marks the FairIoT brand and selected states, with status colors reserved for explicit fairness categories.
- **Layout Paradigm:** A persistent, compact left navigation rail and a broad, adaptive analysis canvas; the landing page uses an editorial hero with a data-visual motif and four module lanes.
- **Signature Elements:** A custom connected-sensor/F mark; a slim teal comparison rule linking group summaries; small evidence labels for sample size, direction, and confidence interval.
- **Interaction Philosophy:** Every result is traceable to the selected dataset, group, metric, direction, and threshold. Use clear loading/empty/error states and inline validation; avoid decorative interactions that imply statistical certainty.
- **Animation:** Subtle short fades and progress transitions for navigation, cards, and chart entry; respect reduced-motion preferences; no continuously moving decoration.
- **Typography System:** Inter for interface and numeric labels, with a restrained serif display face for selected landing-page headlines; use tabular numerals for metrics, clear heading levels, and readable minimum body sizes.
- **Brand Essence:** A practical fairness-audit workspace for IoT teams that makes hardware comparisons inspectable rather than opaque. Personality: rigorous, transparent, grounded.
- **Brand Voice:** Precise, plain-spoken, and careful about what the data can support. Example: “Compare performance across the conditions you measured.” “A detected gap is a signal to investigate—not a conclusion about cause.”
- **Wordmark & Logo:** FairIoT wordmark paired with an original line-mark combining a sensor node, comparison bars, and a clear F-shaped trace; implement as a reusable inline SVG rather than a text emoji.
- **Signature Brand Color:** Deep teal `#0B8F87`, paired with navy `#102A43` and pale blue `#EFF7FB`.

## Build and verification flow

After approval, create/update `TODO.md` with outcome-level acceptance clauses, inspect project runtime and TypeScript diagnostics, configure any missing language checks, install pinned frontend/backend dependencies, then implement the API, schema and analysis services, seed samples, frontend routes/components/charts, and documentation. Start PostgreSQL if available, run the FastAPI and Vite services, check API health/OpenAPI and the required `manus-routes.json`, and verify a real frontend-to-backend API request and a calculated sample analysis. Resolve observed diagnostics and service failures before handoff. No public deployment is included unless separately requested.
