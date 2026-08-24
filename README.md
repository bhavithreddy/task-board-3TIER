# TaskFlow — 3-Tier Task Board

A shared task board with a React frontend, Node.js/Express API, and MongoDB.

```text
User
  |
  v
Frontend (React + Vite in development, NGINX in Docker)
  |
  v
Backend API (Express)
  |
  v
MongoDB
```

This application is a **shared board**, not a multi-user SaaS product. There is no login, JWT, or per-user isolation. Anyone who can reach the API can create, update, and delete tasks. Do not expose it to the public internet without an authentication layer in front of it.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 8, Axios |
| Backend | Node.js 20+, Express 4, Mongoose 7 |
| Database | MongoDB 7 |
| Observability | Prometheus metrics (`/metrics`), health (`/health`), readiness (`/ready`) |
| Packaging | Docker, Docker Compose |
| CI | GitHub Actions (lint, format, tests, build, production `npm audit`, Trivy) |

## Prerequisites

- Node.js 22 (see `.nvmrc`; 20+ is supported)
- npm 10+
- Docker and Docker Compose for the full stack
- MongoDB 7 if you run the backend without Docker

## Environment variables

Copy the example file and adjust values as needed:

```bash
cp .env.example .env
```

| Variable | Service | Description |
| --- | --- | --- |
| `PORT` | Backend | API port. Default `5000`. |
| `MONGO_URI` | Backend | MongoDB connection string. |
| `NODE_ENV` | Backend | `development`, `test`, or `production`. |
| `ALLOWED_ORIGINS` | Backend | Comma-separated browser origins allowed by CORS. |
| `BACKEND_HOST` | Frontend container | NGINX upstream, for example `backend:5000`. |

In local Vite development the frontend calls `/api` and Vite proxies that path to `http://localhost:5000`. In Docker, NGINX proxies `/api` to `BACKEND_HOST`. Do not put secrets in `.env.example`.

## Quick start with Docker

```bash
git clone <repository-url>
cd task-board-3TIER
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health
- Backend readiness: http://localhost:5000/ready
- Backend API: http://localhost:5000/api/tasks

MongoDB is published only on `127.0.0.1:27017`.

Stop with `Ctrl+C`, then `docker compose down`. Add `-v` to discard the database volume.

## Local development

Terminal 1 — MongoDB, if it is not already running:

```bash
mongod --dbpath /data/db
```

Terminal 2 — API:

```bash
cd backend
cp ../.env.example .env
npm ci
npm run dev
```

Terminal 3 — UI:

```bash
cd frontend
npm ci
npm run dev
```

Vite serves the UI at http://localhost:3000 and proxies `/api` to the backend.

## Validation commands

Backend:

```bash
cd backend
npm ci
npm run lint
npm run format:check
npm test
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run format:check
npm test
npm run build
```

## Docker images

```bash
docker build -t taskflow-backend ./backend
docker build -t taskflow-frontend ./frontend
```

The backend image runs as the `node` user. The frontend image runs NGINX as the `nginx` user on port 8080.

## CI/CD

`.github/workflows/ci.yml` runs on pushes and pull requests to `main` / `master`:

1. `npm ci` for backend and frontend
2. ESLint
3. Prettier `--check`
4. Unit/integration tests
5. Frontend production build
6. `npm audit --omit=dev --audit-level=high`
7. Docker image builds
8. Trivy filesystem scan (fails on unfixed HIGH/CRITICAL findings)

The pipeline is meant to fail when quality, tests, or security checks fail. It does not log in to Docker Hub or deploy.

## Deployment notes

There is no Kubernetes or Terraform in this repository. To deploy:

1. Build and scan the images in CI.
2. Run the three services (MongoDB, API, NGINX frontend) with equivalent health checks.
3. Put TLS and authentication in front of the application if it is reachable beyond localhost.
4. Scrape `/metrics` only from a trusted network.

## Troubleshooting

**Frontend shows “Cannot reach backend”**
Start the API on port 5000. In Docker, wait until the backend healthcheck is healthy (`docker compose ps`).

**API returns 503 on `/api/tasks` or `/ready`**
MongoDB is not connected yet. The API retries for up to 10 attempts with backoff.

**CORS errors in the browser**
Add the UI origin to `ALLOWED_ORIGINS`. Docker Compose already allows `http://localhost:3000`.

**`npm run lint` fails on Windows**
Use the package scripts (`eslint src --ext ...`). Do not pass a quoted glob that ESLint 8 cannot expand on Windows.

**ESLint crashes with `expand is not a function`**
That came from a `brace-expansion` npm override. Those overrides have been removed; reinstall with `npm ci`.

## Author

Developed by **Yelti Bhavith Reddy**
