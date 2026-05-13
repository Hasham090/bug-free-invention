.PHONY: install run run-backend run-frontend test clean poc

# ── Install ──────────────────────────────────────────────────────────────────
install:
	@echo "→ Installing Python dependencies..."
	pip install -e ".[dev]"
	@echo "→ Installing frontend dependencies..."
	cd frontend && npm install
	@echo ""
	@echo "✓ Installation complete."
	@echo "  Copy .env.example to .env and add your ANTHROPIC_API_KEY."

install-whisperx:
	pip install -e ".[whisperx]"

# ── Run ───────────────────────────────────────────────────────────────────────
run: run-backend run-frontend

run-backend:
	@echo "→ Starting FastAPI backend on http://127.0.0.1:8000"
	uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

run-frontend:
	@echo "→ Starting SvelteKit frontend on http://localhost:5173"
	cd frontend && npm run dev

# Run both concurrently (requires 'make -j2 run-backend run-frontend' or use this):
dev:
	@echo "Starting backend and frontend..."
	@trap 'kill 0' SIGINT; \
	  (cd . && uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload) & \
	  (cd frontend && npm run dev) & \
	  wait

# ── POC ───────────────────────────────────────────────────────────────────────
poc:
	@echo "Usage: make poc VIDEO=path/to/video.mp4 START=30 DUR=30"
	python scripts/poc_crop_caption.py "$(VIDEO)" --start $(START) --duration $(DUR)

# ── Test ─────────────────────────────────────────────────────────────────────
test:
	pytest tests/ -v

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	rm -rf data/uploads/* data/clips/* data/thumbnails/* data/shortsmith.db
	@echo "✓ Cleared all job data (transcripts kept as cache)"

clean-all: clean
	rm -rf data/transcripts/*
	@echo "✓ Cleared all data including transcript cache"
