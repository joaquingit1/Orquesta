#!/usr/bin/env bash
set -e

GITHUB_TOKEN="${1:-}"
REPO="${2:-microsoft/vscode}"
MAX_CONTRIBUTORS="${3:-6}"
PORT=8000

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV="$BACKEND_DIR/.venv"

# ── deps ──────────────────────────────────────────────────────────────────────
if [ ! -d "$VENV" ]; then
  echo "Creating virtualenv..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
fi

# ── env ───────────────────────────────────────────────────────────────────────
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a; source "$BACKEND_DIR/.env"; set +a
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠  ANTHROPIC_API_KEY is not set — review streams will fail."
  echo "   Set it in backend/.env or export it before running."
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠  No GitHub token provided — unauthenticated limit is 60 req/hr."
  echo "   Usage: ./run.sh <github_token> [repo] [max_contributors]"
fi

# ── server ────────────────────────────────────────────────────────────────────
echo ""
echo "Starting API server on port $PORT..."
cd "$BACKEND_DIR"
"$VENV/bin/uvicorn" main:app --port "$PORT" &
SERVER_PID=$!

# Wait until the server is accepting connections
for i in $(seq 1 20); do
  if curl -s "http://localhost:$PORT/api/team" > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo "Server running (PID $SERVER_PID)"
echo ""

# ── import ────────────────────────────────────────────────────────────────────
echo "Importing $REPO (top $MAX_CONTRIBUTORS contributors)..."
echo ""

PAYLOAD="{\"repo\": \"$REPO\", \"max_contributors\": $MAX_CONTRIBUTORS"
if [ -n "$GITHUB_TOKEN" ]; then
  PAYLOAD="$PAYLOAD, \"token\": \"$GITHUB_TOKEN\""
fi
PAYLOAD="$PAYLOAD}"

RESPONSE=$(curl -s -X POST "http://localhost:$PORT/api/import/github" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "$RESPONSE" | python3 -m json.tool

SESSION_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null)

if [ -n "$SESSION_ID" ]; then
  echo ""
  echo "✓ Session: $SESSION_ID"
  echo ""
  echo "Next steps:"
  echo "  Ranking:  curl -s http://localhost:$PORT/api/github/$SESSION_ID/ranking | python3 -m json.tool"
  echo "  Stream:   curl -N http://localhost:$PORT/api/github/$SESSION_ID/review/<username>/stream"
fi

# Keep server running
echo ""
echo "Server is running. Press Ctrl+C to stop."
wait $SERVER_PID
