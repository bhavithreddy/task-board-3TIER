#!/bin/bash
# ================================================================
# start-local.sh — Run all 3 tiers locally without Docker
#
# Prerequisites:
#   - Node.js 18+ installed
#   - MongoDB running (via Docker or local install)
#
# Usage: chmod +x scripts/start-local.sh && ./scripts/start-local.sh
# ================================================================

set -e

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC}   $1"; }
warn() { echo -e "${YELLOW}[!]${NC}   $1"; }

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   TaskFlow — Local Dev Mode           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# ── Check Node.js ─────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "Node.js not found. Install from https://nodejs.org"
  exit 1
fi
ok "Node.js: $(node --version)"

# ── Start MongoDB in Docker ────────────────────────────────────
info "Starting MongoDB in Docker..."
if docker ps --format '{{.Names}}' | grep -q "^taskflow-mongo-local$"; then
  ok "MongoDB already running"
else
  docker run -d \
    --name taskflow-mongo-local \
    --rm \
    -p 27017:27017 \
    mongo:7.0
  ok "MongoDB started on port 27017"
  sleep 3
fi

# ── Install backend dependencies ──────────────────────────────
info "Installing backend dependencies..."
cd backend
if [[ ! -d node_modules ]]; then
  npm install
fi

# ── Write local .env ──────────────────────────────────────────
cat > .env << 'EOF'
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/taskflow
EOF
ok "Backend .env written"

# ── Start backend in background ────────────────────────────────
info "Starting backend on http://localhost:5000 ..."
npm run dev &
BACKEND_PID=$!
cd ..

# ── Wait for backend ──────────────────────────────────────────
info "Waiting for backend to be ready..."
for i in {1..20}; do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    ok "Backend is up!"
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

# ── Install frontend dependencies ─────────────────────────────
info "Installing frontend dependencies..."
cd frontend
if [[ ! -d node_modules ]]; then
  npm install
fi

# ── Start frontend ────────────────────────────────────────────
info "Starting frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  All services running!                          ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Frontend:  http://localhost:3000                   ║"
echo "║  Backend:   http://localhost:5000                   ║"
echo "║  MongoDB:   mongodb://localhost:27017               ║"
echo "║                                                      ║"
echo "║  Press Ctrl+C to stop everything                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Cleanup on Ctrl+C ─────────────────────────────────────────
cleanup() {
  echo ""
  info "Shutting down..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  docker stop taskflow-mongo-local 2>/dev/null || true
  ok "All stopped. Goodbye!"
  exit 0
}

trap cleanup INT TERM

# Wait for both processes
wait "$BACKEND_PID" "$FRONTEND_PID"
