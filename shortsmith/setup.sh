#!/bin/bash
set -e

echo ""
echo "========================================"
echo "  ShortSmith Setup"
echo "========================================"
echo ""

# Move to shortsmith dir regardless of where script is run from
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY is not set."
  echo ""
  echo "   Go to: https://github.com/settings/codespaces"
  echo "   Add a secret named: ANTHROPIC_API_KEY"
  echo "   Value: your key from console.anthropic.com"
  echo "   Then restart this codespace."
  echo ""
  read -p "Or paste your API key now (will save to .env): " INPUT_KEY
  if [ -n "$INPUT_KEY" ]; then
    ANTHROPIC_API_KEY="$INPUT_KEY"
  else
    echo "❌ No API key provided. Exiting."
    exit 1
  fi
fi

# Write .env
echo "→ Writing .env..."
cat > .env << EOF
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
WHISPER_MODEL=large-v3-turbo
WHISPER_DEVICE=auto
WHISPER_COMPUTE_TYPE=float16
USE_WHISPERX=false
DATA_DIR=data
UPLOADS_DIR=data/uploads
TRANSCRIPTS_DIR=data/transcripts
CLIPS_DIR=data/clips
THUMBNAILS_DIR=data/thumbnails
CAPTION_CONFIG=caption_config.json
FFMPEG_HW_ACCEL=auto
HOST=0.0.0.0
PORT=8000
CLAUDE_MODEL=claude-opus-4-7
EOF
echo "   ✓ .env created"

# Install system deps
echo "→ Installing FFmpeg and libGL..."
sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg libgl1 > /dev/null 2>&1
echo "   ✓ FFmpeg + libGL installed"

# Install Python deps
echo "→ Installing Python dependencies (this takes 5-10 min)..."
pip install -e ".[dev]" -q
echo "   ✓ Python dependencies installed"

# Install frontend deps
echo "→ Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..
echo "   ✓ Frontend dependencies installed"

# Create data dirs
mkdir -p data/{uploads,transcripts,clips,thumbnails}
echo "   ✓ Data directories created"

echo ""
echo "========================================"
echo "  ✅ Setup complete!"
echo "  Now run:  bash start.sh"
echo "========================================"
echo ""
