# 🚀 TaskFlow — 3-Tier Application

A full-stack application with React frontend, Node.js backend, and MongoDB database.

## Architecture

```
Frontend (React/NGINX) → Backend (Node.js) → MongoDB
```

## Prerequisites

**Docker Setup:**
- Docker & Docker Compose

**Local Development:**
- Node.js v16+
- MongoDB (local or Atlas)

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone <repo-url>
cd <repo-name>
docker compose up -d
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Option 2: Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**MongoDB:**
```bash
# Install and run locally, or use MongoDB Atlas
mongod
```


## Stop Services

```bash
# Docker
docker compose down

# Local
# Press Ctrl+C in each terminal
```

---

## Commands

```bash
# Docker: View logs
docker compose logs -f

# Docker: View running containers
docker ps

# Local: Install dependencies
npm install

# Local: Start backend (dev mode)
npm run dev

# Local: Build frontend
npm run build
```

---

## Author

Developed by **Yelti Bhavith Reddy**

