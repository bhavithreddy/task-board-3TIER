#!/bin/bash
# ================================================================
# TaskFlow Deploy Script — Minikube
# Usage: ./scripts/deploy.sh YOUR_DOCKERHUB_USERNAME
#
# What it does:
#   1. Points Docker at Minikube's daemon (so images are local)
#   2. Builds backend + frontend Docker images
#   3. Updates image names in K8s manifests
#   4. Applies all manifests (namespace → MongoDB → backend → frontend)
#   5. Waits for pods to be ready
#   6. Installs Prometheus + Grafana via Helm
#   7. Prints access URLs
# ================================================================

set -e
set -o pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[✓]${NC}    $1"; }
step()  { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

DOCKER_USER="${1:-}"
if [[ -z "$DOCKER_USER" ]]; then
  echo "Usage: $0 YOUR_DOCKERHUB_USERNAME"
  echo "Example: $0 johndoe"
  exit 1
fi

BACKEND_IMAGE="$DOCKER_USER/taskflow-backend"
FRONTEND_IMAGE="$DOCKER_USER/taskflow-frontend"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   TaskFlow → Deploying to Minikube               ║"
echo "║   Docker Hub: $DOCKER_USER                       "
echo "╚═══════════════════════════════════════════════════╝"

# ── Step 1: Use Minikube Docker daemon ──────────────────────────
step "Step 1: Configuring Docker → Minikube"
# This is CRITICAL: builds images inside Minikube's Docker,
# so K8s pods can use them without pulling from Docker Hub.
eval "$(minikube -p minikube docker-env)"
ok "Docker now uses Minikube's daemon"

# ── Step 2: Create Minikube storage directory ─────────────────
step "Step 2: Creating MongoDB storage directory"
minikube ssh -- sudo mkdir -p /mnt/data/mongodb
ok "Directory /mnt/data/mongodb ready on Minikube node"

# ── Step 3: Build images ──────────────────────────────────────
step "Step 3: Building Docker images"

info "Building backend..."
docker build \
  --tag "$BACKEND_IMAGE:latest" \
  --file ./backend/Dockerfile \
  ./backend/
ok "Backend image built: $BACKEND_IMAGE:latest"

info "Building frontend..."
docker build \
  --tag "$FRONTEND_IMAGE:latest" \
  --file ./frontend/Dockerfile \
  ./frontend/
ok "Frontend image built: $FRONTEND_IMAGE:latest"

echo ""
info "Images in Minikube:"
docker images | grep taskflow

# ── Step 4: Patch manifests with image names ──────────────────
step "Step 4: Updating manifests"

# Replace placeholders — use a temp copy so git isn't dirty
cp k8s/backend/backend.yaml /tmp/backend.yaml
cp k8s/frontend/frontend.yaml /tmp/frontend.yaml

sed -i "s|YOUR_DOCKERHUB_USERNAME/taskflow-backend|$BACKEND_IMAGE|g"  /tmp/backend.yaml
sed -i "s|YOUR_DOCKERHUB_USERNAME/taskflow-frontend|$FRONTEND_IMAGE|g" /tmp/frontend.yaml
# Use IfNotPresent because images are already in Minikube's daemon
sed -i "s|imagePullPolicy: IfNotPresent|imagePullPolicy: IfNotPresent|g" /tmp/backend.yaml
sed -i "s|imagePullPolicy: IfNotPresent|imagePullPolicy: IfNotPresent|g" /tmp/frontend.yaml

ok "Image names patched in manifests"

# ── Step 5: Apply Kubernetes manifests ───────────────────────
step "Step 5: Applying K8s manifests"

info "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

info "Deploying MongoDB..."
kubectl apply -f k8s/mongodb/mongodb.yaml

info "Waiting for MongoDB to be ready (up to 2 min)..."
kubectl rollout status deployment/mongodb -n taskflow --timeout=120s
ok "MongoDB is running"

info "Deploying Backend..."
kubectl apply -f /tmp/backend.yaml
kubectl apply -f k8s/backend/hpa.yaml

info "Deploying Frontend..."
kubectl apply -f /tmp/frontend.yaml

info "Applying Ingress..."
kubectl apply -f k8s/ingress/ingress.yaml

ok "All manifests applied"

# ── Step 6: Wait for pods ─────────────────────────────────────
step "Step 6: Waiting for all pods to be ready"
kubectl rollout status deployment/backend  -n taskflow --timeout=180s
ok "Backend ready"
kubectl rollout status deployment/frontend -n taskflow --timeout=120s
ok "Frontend ready"

# ── Step 7: Install Monitoring ────────────────────────────────
step "Step 7: Installing Prometheus + Grafana"

helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update --fail-on-repo-update-fail=false 2>/dev/null || helm repo update

if helm status monitoring -n monitoring &>/dev/null; then
  info "Monitoring already installed — upgrading..."
  helm upgrade monitoring prometheus-community/kube-prometheus-stack \
    -n monitoring -f monitoring/prometheus-values.yaml --timeout 5m --wait
else
  info "Installing kube-prometheus-stack (~3 min)..."
  helm install monitoring prometheus-community/kube-prometheus-stack \
    -n monitoring --create-namespace \
    -f monitoring/prometheus-values.yaml --timeout 5m --wait
fi

kubectl apply -f monitoring/grafana-dashboard-cm.yaml
ok "Monitoring stack installed"

# ── Step 8: Summary ───────────────────────────────────────────
MINIKUBE_IP=$(minikube ip)

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🎉  Deployment Complete!                                ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  App (Ingress):  http://taskflow.local                   ║"
echo "║  App (NodePort): http://$MINIKUBE_IP:30080             "
echo "║                                                           ║"
echo "║  Grafana:        http://$MINIKUBE_IP:30300             "
echo "║    Username: admin   Password: admin123                   ║"
echo "║                                                           ║"
echo "║  Test API:                                               ║"
echo "║    curl http://taskflow.local/api/tasks                  ║"
echo "║    curl http://taskflow.local/health                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "Pod status:"
kubectl get pods -n taskflow
echo ""
echo "Services:"
kubectl get svc -n taskflow
