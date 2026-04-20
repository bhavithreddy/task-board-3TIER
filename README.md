# TaskFlow — Production 3-Tier App on Kubernetes

A **fully working** 3-tier application on Kubernetes (Minikube).
No paid cloud. No broken proxies. Three ways to run it.

```
Browser → NGINX (Frontend) → Express API (Backend) → MongoDB
                                    ↓
                          Prometheus + Grafana
```

---

## ⚡ Quickstart (Pick One)

### Option 1 — Docker Compose (Easiest, recommended for local testing)
```bash
docker compose up --build
# Open: http://localhost:3000
```
No MongoDB installation required. All 3 services start in one command.

### Option 2 — VS Code (Raw Node.js)
```bash
chmod +x scripts/start-local.sh
./scripts/start-local.sh
# Open: http://localhost:3000
```
Starts MongoDB in Docker, then backend + frontend with `npm run dev`.

### Option 3 — Kubernetes (Minikube)
```bash
chmod +x scripts/setup.sh scripts/deploy.sh
./scripts/setup.sh                    # Install Docker, kubectl, Minikube, Helm
./scripts/deploy.sh YOUR_DOCKERHUB_USER
# Open: http://taskflow.local  or  http://$(minikube ip):30080
```

---

## What Was Fixed (vs Previous Version)

### 🐛 Bug 1 — NGINX proxy never worked (PRIMARY CAUSE of "Failed to fetch tasks")

**Old `nginx.conf`:**
```nginx
proxy_pass http://BACKEND_HOST/api/;   ← plain text, envsubst IGNORES this
```

**Fixed `nginx.conf`:**
```nginx
proxy_pass http://${BACKEND_HOST}/api/;  ← dollar+braces, envsubst replaces this
```
`envsubst` only substitutes `${VAR}` syntax. Plain `VAR` is passed through unchanged,
so NGINX was literally proxying to `http://BACKEND_HOST` → connection refused → 502.

### 🐛 Bug 2 — No docker-compose.yml
Without Docker Compose, local testing requires installing MongoDB separately,
starting backend and frontend manually in different terminals, and handling port
conflicts. Added `docker-compose.yml` for one-command startup.

### 🐛 Bug 3 — Server would not start if MongoDB was slow
Old code: connect MongoDB → then start HTTP server.
If MongoDB took >5s, nothing responded (including `/health`).

Fixed: Start HTTP server first, connect MongoDB in background with retry.
```js
app.listen(PORT, () => {
  connectDB();   // non-blocking — server responds immediately
});
```

### 🐛 Bug 4 — No retry on frontend API errors
Old code showed the error and stopped. Fixed with auto-retry every 5 seconds,
so the UI recovers automatically once the backend finishes connecting to MongoDB.

### 🐛 Bug 5 — No .env file for local development
Backend needs `MONGO_URI` env var. Without `.env`, it defaulted to
`mongodb://localhost:27017/taskflow` which only works if MongoDB is already
running locally. The setup script and start-local.sh now handle this.

### 🐛 Bug 6 — MongoDB auth complexity in K8s
Old setup had MongoDB auth (MONGO_INITDB_ROOT_USERNAME/PASSWORD) but the
connection string didn't always match. Simplified to no-auth for local/dev
so connection always succeeds without credential mismatches.

---

## Project Structure

```
taskflow-k8s/
├── docker-compose.yml           ← ONE-COMMAND local setup (NEW)
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← React UI with auto-retry on error
│   │   ├── App.css              ← Dark brutalist design
│   │   └── main.jsx
│   ├── nginx.conf               ← FIXED: uses ${BACKEND_HOST} syntax
│   ├── Dockerfile               ← Multi-stage: Node build → NGINX
│   ├── vite.config.js           ← Proxy /api → localhost:5000 for dev
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── index.js             ← FIXED: starts server before DB connects
│   │   ├── routes/tasks.js      ← CRUD with DB state check
│   │   └── models/task.js       ← Mongoose schema
│   ├── .env                     ← Local dev config (not committed)
│   ├── Dockerfile               ← Multi-stage: deps → production
│   └── package.json
├── k8s/
│   ├── namespace.yaml
│   ├── mongodb/mongodb.yaml     ← PV + PVC + Deployment + Service
│   ├── backend/
│   │   ├── backend.yaml         ← ConfigMap + Deployment + Service
│   │   └── hpa.yaml             ← Auto-scale 2–5 pods
│   ├── frontend/frontend.yaml   ← ConfigMap + Deployment + NodePort
│   └── ingress/ingress.yaml     ← taskflow.local routing
├── monitoring/
│   ├── prometheus-values.yaml   ← Helm values (auto-discovers pods)
│   └── grafana-dashboard-cm.yaml← Pre-built dashboard
├── scripts/
│   ├── setup.sh                 ← Install all tools
│   ├── deploy.sh                ← Build + deploy to Minikube
│   └── start-local.sh           ← Start all 3 tiers locally
└── .github/workflows/ci-cd.yml  ← Test → Build → Push → Deploy
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  LOCAL (Docker Compose)                             │
│                                                     │
│  Browser:3000                                       │
│      ↓                                              │
│  NGINX:80 ──(proxy /api/)──▶ Express:5000 ──▶ Mongo │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  KUBERNETES (Minikube)                              │
│                                                     │
│  Browser                                            │
│      ↓                                              │
│  Ingress (taskflow.local)                           │
│      ├── /api/* ──▶ backend Service:5000            │
│      │                   ↓                          │
│      │             2× backend pods ──▶ mongodb:27017 │
│      └── /*   ──▶ frontend Service:80               │
│                     2× NGINX pods                   │
│                                                     │
│  monitoring namespace:                              │
│      Prometheus (scrapes /metrics on backend pods)  │
│      Grafana :30300                                 │
└─────────────────────────────────────────────────────┘
```

### How the API proxy works

**Local development (Vite):**
```
Browser → GET /api/tasks
Vite dev server intercepts /api/*
Proxies to → http://localhost:5000/api/tasks
Backend responds → 200 OK
```

**Docker Compose / Kubernetes (NGINX):**
```
Browser → GET /api/tasks
NGINX intercepts location /api/
proxy_pass → http://${BACKEND_HOST}/api/
  where BACKEND_HOST=backend:5000 (Docker/K8s service DNS)
Backend responds → 200 OK
```

---

## API Reference

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check (always 200) |
| GET | `/ready` | — | Ready check (503 if DB not connected) |
| GET | `/metrics` | — | Prometheus metrics |
| GET | `/api/tasks` | — | List tasks (`?status=todo\|in-progress\|done`) |
| POST | `/api/tasks` | `{title, description?, priority?}` | Create task |
| PUT | `/api/tasks/:id` | `{status?, title?, priority?}` | Update task |
| DELETE | `/api/tasks/:id` | — | Delete task |

### Test with curl
```bash
# Health check
curl http://localhost:5000/health

# Create a task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","priority":"high"}'

# List all tasks
curl http://localhost:5000/api/tasks

# Update status
curl -X PUT http://localhost:5000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}'

# Delete a task
curl -X DELETE http://localhost:5000/api/tasks/TASK_ID
```

---

## Kubernetes Deployment (Step-by-Step)

### Prerequisites
- Ubuntu 22.04+, 4GB RAM, 20GB disk
- Run `./scripts/setup.sh` first

### Manual deployment
```bash
# 1. Point Docker to Minikube's daemon (CRITICAL!)
eval $(minikube -p minikube docker-env)

# 2. Create MongoDB data directory on Minikube node
minikube ssh -- sudo mkdir -p /mnt/data/mongodb

# 3. Build images inside Minikube
docker build -t YOUR_USER/taskflow-backend:latest  ./backend/
docker build -t YOUR_USER/taskflow-frontend:latest ./frontend/

# 4. Replace placeholder in manifests
sed -i "s|YOUR_DOCKERHUB_USERNAME|YOUR_USER|g" \
  k8s/backend/backend.yaml k8s/frontend/frontend.yaml

# 5. Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongodb/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress/

# 6. Wait for pods
kubectl get pods -n taskflow -w

# 7. Access the app
echo "http://$(minikube ip):30080"
minikube service frontend -n taskflow  # opens browser
```

---

## Monitoring

### Install Prometheus + Grafana
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml

kubectl apply -f monitoring/grafana-dashboard-cm.yaml
```

### Access Grafana
```bash
MINIKUBE_IP=$(minikube ip)
echo "Grafana: http://$MINIKUBE_IP:30300"
echo "Login: admin / admin123"
```

Navigate to: **Dashboards → TaskFlow → TaskFlow Application Dashboard**

### Custom Metrics (exposed by backend)
```
# Total HTTP requests by method, route, status code
http_requests_total{method="POST", route="/api/tasks", status_code="201"}

# Request duration histogram (for p50/p95/p99 latency)
http_request_duration_seconds_bucket{le="0.1"}

# Live task count from MongoDB (custom gauge)
taskflow_active_tasks_total
```

---

## Troubleshooting

### "Failed to fetch tasks" in browser
```bash
# 1. Check if backend is running
curl http://localhost:5000/health          # local
curl http://taskflow.local/health         # K8s

# 2. Check backend logs
docker compose logs backend               # Docker Compose
kubectl logs -l app=backend -n taskflow   # K8s

# 3. Check MongoDB connection
curl http://localhost:5000/ready
# {"status":"not ready","reason":"DB not connected yet"} → MongoDB issue

# 4. Restart backend
docker compose restart backend
kubectl rollout restart deployment/backend -n taskflow
```

### Pod stuck in ImagePullBackOff
```bash
kubectl describe pod POD_NAME -n taskflow  # read Events section

# Fix: images must be built inside Minikube's Docker
eval $(minikube -p minikube docker-env)
docker build -t YOUR_USER/taskflow-backend:latest ./backend/
```

### Pod in CrashLoopBackOff
```bash
kubectl logs POD_NAME -n taskflow
kubectl logs POD_NAME -n taskflow --previous  # if already restarted

# Most common cause: MongoDB not ready
# Backend retries automatically — give it 30-60 seconds
kubectl get pods -n taskflow -w
```

### Ingress returns 404 / not reachable
```bash
# Check hosts file
grep taskflow /etc/hosts
# Should show: 192.168.xx.x  taskflow.local

# Update if Minikube IP changed
echo "$(minikube ip) taskflow.local" | sudo tee -a /etc/hosts

# Check ingress controller
kubectl get pods -n ingress-nginx

# Enable ingress addon
minikube addons enable ingress
```

### MongoDB PVC stuck in Pending
```bash
kubectl get pvc -n taskflow
kubectl describe pvc mongodb-pvc -n taskflow

# Create directory on Minikube node
minikube ssh -- sudo mkdir -p /mnt/data/mongodb

# Delete and recreate PVC
kubectl delete pvc mongodb-pvc -n taskflow
kubectl apply -f k8s/mongodb/mongodb.yaml
```

### Useful kubectl commands
```bash
# Watch all pods
kubectl get pods -n taskflow -w

# All events (shows errors)
kubectl get events -n taskflow --sort-by=.lastTimestamp

# Resource usage
kubectl top pods -n taskflow

# Shell into backend pod
kubectl exec -it deploy/backend -n taskflow -- /bin/sh

# Shell into MongoDB pod
kubectl exec -it deploy/mongodb -n taskflow -- mongosh taskflow

# Rolling restart
kubectl rollout restart deployment/backend  -n taskflow
kubectl rollout restart deployment/frontend -n taskflow

# Scale manually
kubectl scale deployment backend --replicas=3 -n taskflow
```

---

## CI/CD Setup (GitHub Actions)

Add these secrets in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not password) |
| `KUBE_CONFIG` | `cat ~/.kube/config \| base64 -w 0` |

Pipeline runs on every push to `main`:
1. **Test** — Node.js syntax check
2. **Build** — Multi-arch Docker images (amd64 + arm64), tagged `latest` + git SHA
3. **Deploy** — Rolling update, waits for rollout, auto-rollbacks on failure
