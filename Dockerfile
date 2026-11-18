FROM node:22-alpine AS frontend-build
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
RUN pnpm --filter @fairiot/frontend build

FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY datasets ./datasets
COPY --from=frontend-build /build/frontend/dist ./backend/app/static
WORKDIR /app
EXPOSE 3000
CMD ["sh", "-c", "cd /app/backend && exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-3000}"]
