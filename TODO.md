# FairIoT Delivery Tasks

## 1. Public landing and application navigation
- [x] Create the FairIoT landing page with logo and branding, project introduction, what the platform does, the four fairness modules, how it works, key benefits, Get Started, Login, and Register actions.
- [x] Create the premium, modern SaaS interface with clean white/light-blue colors, navy headings, professional cards, soft shadows, rounded corners, consistent spacing, responsive design, sidebar navigation, interactive charts, smooth transitions, clear typography, and professional tables.
- [x] Every navigation item opens its correct page; every button performs its actual function; there are no nonfunctional buttons or placeholder pages.
- [x] The application is responsive on mobile, tablet, and desktop and includes loading states and error messages.

## 2. Authentication, profile, and account privacy
- [x] Provide secure email/password registration and login, logout, a forgot-password interface, a user profile, and protected dashboard routes.
- [x] Hash passwords securely and use JWT-based authentication; keep secret values in environment variables and never expose database passwords or secret keys in frontend code.
- [x] Each user can access only their own private datasets and analysis records; API validation must enforce authorization on private resources.
- [x] Validate all user inputs and return useful errors; do not claim password-reset email delivery unless an email transport is configured and used.

## 3. Dashboard and analysis overview
- [x] Display total devices analyzed, total datasets uploaded, number of groups compared, and potential disparities detected.
- [x] Show the fairness analysis overview, recent analysis history, fairness status distribution, and module-wise analysis chart.
- [x] Dashboard charts and statistics use actual backend data, not hardcoded/fake statistics.

## 4. Four connected fairness modules
- [x] Sensor Fairness analyzes sensor response time, measurement accuracy, calibration differences, sensor failure rate, missing readings, and environmental sensitivity.
- [x] Actuator Fairness analyzes activation delay, command success rate, response consistency, actuator failure rate, and device performance differences.
- [x] Communication Fairness analyzes network latency, packet loss, bandwidth differences, connection reliability, communication delay, and network availability.
- [x] Resource Allocation Fairness analyzes bandwidth allocation, CPU utilization, memory usage, energy consumption, processing resource distribution, and resource availability.
- [x] The platform supports multiple IoT scenarios, devices, datasets, and performance metrics; it is not hardcoded for only one dataset or scenario.

## 5. Dataset upload, inspection, and management
- [x] Allow upload of CSV and Excel datasets; process uploaded files by the backend; validate allowed extensions and file size and use safe file handling.
- [x] Preview uploaded data; validate data; detect missing values and duplicate rows; show column information; automatically identify numeric and categorical columns.
- [x] Let users select group identifiers and numerical metrics without assuming that every dataset uses the same column names; allow dataset deletion and downloadable sample datasets.
- [x] Store user datasets and metadata in the database or appropriate storage, enforce user ownership, and show loading/error states.

## 6. Fairness analysis and explainable statistics
- [x] Let users select an uploaded dataset, a fairness module, a group column, a performance metric, higher-is-better or lower-is-better direction, and configurable disparity thresholds; allow analysis to run and compare multiple device groups.
- [x] Calculate group mean, median, minimum/maximum, relative performance gap, sample-size comparison, standard deviation, and confidence intervals where appropriate.
- [x] Show computed results and explanations, and clearly distinguish fair performance under the selected test, potential disparity, and insufficient data.
- [x] Do not claim that a statistical difference automatically proves discrimination. Account for the possibility of different workloads, calibration, environmental conditions, network conditions, and service requirements; equal performance is not always equitable performance.
- [x] When contextual data is available, offer optional context-aware comparisons; do not claim context adjustment unless the model actually performed it.

## 7. Visualizations and downloadable reports
- [x] Include group-comparison bar charts, performance distribution charts, trend charts, fairness status charts, metric comparison tables, and analysis explanations.
- [x] Produce downloadable CSV and PDF reports based on calculated analysis results; charts use real backend results.

## 8. Analysis history
- [x] Save previous analyses in the database and let users view previous reports, open analysis details, compare previous results, and delete analysis history.
- [x] Enforce user ownership for analysis history and associated results/reports.

## 9. FastAPI backend, persistence, and database
- [x] Use Python, FastAPI, REST APIs, and Pydantic with clean, separate routers, models, schemas, services, database configuration, and analysis logic.
- [x] Implement endpoints for user registration, user login, user profile, dataset upload, dataset listing, dataset preview, dataset deletion, fairness analysis, analysis history, report generation, and dashboard statistics.
- [x] Implement proper validation, exception handling, logging, and API documentation.
- [x] Use PostgreSQL and SQLAlchemy ORM with suitable related tables and constraints for users, datasets, dataset metadata, fairness analyses, analysis results, analysis history, and reports.
- [x] Keep database credentials and signing secrets in environment variables; provide an `.env.example` file; never expose secrets in frontend code.

## 10. Simulated sample data and project delivery
- [x] Provide realistic demonstration CSV datasets for all four modules, with enough rows and different device groups to demonstrate comparisons; clearly label generated records as sample/simulated data.
- [x] Provide the complete source code for frontend and backend; database setup; sample datasets; `requirements.txt`; `package.json`; `.env.example`; Docker configuration; `README.md` with exact installation commands; Windows setup instructions; commands to run frontend and backend separately; and troubleshooting instructions.
- [x] Create the requested project structure: `frontend/src/{components,pages,layouts,services,hooks,types,charts}` and `backend/app/{api,core,database,models,schemas,services,analysis,utils}`, with `backend/main.py`, `datasets/`, and `reports/`.
- [x] Verify the frontend can communicate with the backend and that uploaded files and analyses are processed by the backend and analysis results are calculated, not hardcoded.

## Verification notes

- `pnpm --filter @fairiot/frontend typecheck` and the production Vite build passed; the landing/app pages and chart bundle are split into smaller route chunks.
- Python `compileall`, backend/schema imports, and safe CSV-cell checks passed. End-to-end API checks through the Vite proxy covered registration, login/profile, privacy boundaries, CSV and XLSX upload/preview, simulated sample downloads, context-aware analysis with confidence intervals, comparison/history/dashboard, private CSV/PDF exports, validation, and deletion.
- A production-mode FastAPI static smoke test passed for the app shell, nested SPA routes, JSON route manifest, SVG favicon, hashed assets, health route, and JSON 404 for an unknown API path.
- PostgreSQL 16/SQLAlchemy and Docker Compose are configured, but this sandbox has no Docker or PostgreSQL binaries, so the live PostgreSQL service was not started. Preview integration used local development SQLite.
- SMTP password-reset transport is optional and was not configured. The generic reset-request response was tested; actual email delivery is not claimed.
- The site is running in development Preview and has not been published. Auto-publish remains disabled; no Publish action was requested or made.
