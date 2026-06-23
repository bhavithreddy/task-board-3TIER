# 🚀 TaskFlow — 3-Tier Application

A full-stack application with React frontend, Node.js backend, and MongoDB database.

## Architecture

```
Frontend (React/NGINX) → Backend (Node.js) → MongoDB
```

## What changed

This repo now includes:
- Backend and frontend ESLint + Prettier configuration
- Project-local lint scripts for backend and frontend
- Modular backend bootstrap with `backend/src/app.js`, `backend/src/db.js`, and `backend/src/metrics.js`
- Modular frontend helpers in `frontend/src/api.js`, `frontend/src/constants.js`, `frontend/src/utils.js`, and `frontend/src/TaskCard.jsx`
- CI workflow in `.github/workflows/ci.yml`
- Editor settings in `.editorconfig`
- Example environment variables in `.env.example`

## Prerequisites

**Docker Setup:**
- Docker & Docker Compose

**Local Development:**
- Node.js v16+ (Node 20 recommended)
- MongoDB local or Atlas

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone <repo-url>
cd <repo-name>
docker compose up --build
```

**Access:**
- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

### Option 2: Local Development

#### Backend

```powershell
cd backend
npm install
npm run dev
```

Then verify:
- http://localhost:5000/health
- http://localhost:5000/api/tasks

#### Frontend

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite, typically:
- http://localhost:3000 or
- http://localhost:5173

#### MongoDB

If you are running locally:

```powershell
mongod --dbpath "C:\data\db"
```

If you want to use Atlas, update `backend/.env` or `MONGO_URI` accordingly.

---

## Local validation

#### Backend lint

```powershell
cd backend
npm run lint
```

#### Frontend lint

```powershell
cd frontend
npm run lint
```

#### Build frontend

```powershell
cd frontend
npm run build
```

---

## Notes

- The backend now starts before MongoDB is connected and retries automatically.
- The frontend now uses a shared API helper and task card component to improve maintainability.
- CI is configured to run lint on both backend and frontend, then build the Docker images.

---

## Author

Developed by **Yelti Bhavith Reddy**

