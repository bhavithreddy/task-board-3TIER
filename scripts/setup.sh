#!/bin/bash
# ================================================================
# TaskFlow Setup Script — Ubuntu 22.04+
# Installs: Docker, kubectl, Minikube, Helm
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ================================================================

set -e
set -o pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()      { echo -e "${GREEN}[✓]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[✗]${NC}    $1"; exit 1; }
step()    { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   TaskFlow — Environment Setup           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── Step 1: Docker ────────────────────────────────────────────
step "Step 1/5: Docker"
if command -v docker &>/dev/null; then
  ok "Docker already installed: $(docker --version)"
else
  info "Installing Docker..."
  sudo apt-get update -y -qq
  sudo apt-get install -y -qq ca-certificates curl gnupg

  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -y -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  sudo usermod -aG docker "$USER"
  ok "Docker installed. NOTE: run 'newgrp docker' for group to take effect."
fi

# ── Step 2: kubectl ───────────────────────────────────────────
step "Step 2/5: kubectl"
if command -v kubectl &>/dev/null; then
  ok "kubectl already installed: $(kubectl version --client --short 2>/dev/null | head -1)"
else
  info "Installing kubectl..."
  KUBE_VERSION=$(curl -sSL https://dl.k8s.io/release/stable.txt)
  curl -sSLo kubectl "https://dl.k8s.io/release/${KUBE_VERSION}/bin/linux/amd64/kubectl"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  rm kubectl
  ok "kubectl installed"
fi

# ── Step 3: Minikube ──────────────────────────────────────────
step "Step 3/5: Minikube"
if command -v minikube &>/dev/null; then
  ok "Minikube already installed: $(minikube version --short)"
else
  info "Installing Minikube..."
  curl -sSLo minikube \
    https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
  sudo install minikube /usr/local/bin/minikube
  rm minikube
  ok "Minikube installed"
fi

# ── Step 4: Helm ──────────────────────────────────────────────
step "Step 4/5: Helm"
if command -v helm &>/dev/null; then
  ok "Helm already installed: $(helm version --short)"
else
  info "Installing Helm..."
  curl -sSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  ok "Helm installed"
fi

# ── Step 5: Start Minikube ────────────────────────────────────
step "Step 5/5: Minikube Cluster"
if minikube status 2>/dev/null | grep -q "Running"; then
  ok "Minikube already running"
else
  info "Starting Minikube (4GB RAM, 2 CPUs)..."
  minikube start \
    --driver=docker \
    --memory=4096 \
    --cpus=2 \
    --disk-size=20g \
    --kubernetes-version=v1.28.3
  ok "Minikube started"
fi

info "Enabling addons..."
minikube addons enable ingress        && ok "Ingress addon enabled"
minikube addons enable metrics-server && ok "Metrics-server addon enabled"
minikube addons enable dashboard      && ok "Dashboard addon enabled"

# Add /etc/hosts entry
MINIKUBE_IP=$(minikube ip)
if grep -q "taskflow.local" /etc/hosts; then
  sudo sed -i "s/.*taskflow\.local/$MINIKUBE_IP taskflow.local/" /etc/hosts
  ok "Updated /etc/hosts → $MINIKUBE_IP taskflow.local"
else
  echo "$MINIKUBE_IP taskflow.local" | sudo tee -a /etc/hosts >/dev/null
  ok "Added /etc/hosts → $MINIKUBE_IP taskflow.local"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✅  Setup complete!                                  ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║  Minikube IP : $MINIKUBE_IP                           "
echo "║  Next step   : ./scripts/deploy.sh YOUR_DOCKERHUB_USER ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
warn "If Docker was just installed, run: newgrp docker"
