#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
  echo "❌ .env not found. Run setup first:  bash setup.sh"
  exit 1
fi

export $(grep -v '^#' .env | xargs)

echo ""
echo "========================================"
echo "  ShortSmith Starting..."
echo "========================================"
echo ""
echo "→ Starting backend on port 8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 2

echo "→ Starting frontend on port 5173..."
cd frontend && npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  ✅ ShortSmith is running!"
echo ""
echo "  👉 Go to the PORTS tab at the top of"
echo "     the terminal and open port 5173"
echo "========================================"
echo ""

# Keep running until Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
