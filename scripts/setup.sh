#!/usr/bin/env bash
# Check everything this skill needs, and install what it can.
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MISSING=0

check() {
  if command -v "$1" >/dev/null 2>&1; then
    printf '  ok    %-10s %s\n' "$1" "$($2 2>&1 | head -n1)"
  else
    printf '  MISS  %-10s %s\n' "$1" "$3"
    MISSING=1
  fi
}

echo "System tools"
check ffmpeg  "ffmpeg -version"  "install with: brew install ffmpeg | apt install ffmpeg"
check ffprobe "ffprobe -version" "ships with ffmpeg"
check node    "node --version"   "install Node 18+ from nodejs.org"
check npm     "npm --version"    "ships with node"
check python3 "python3 --version" "install Python 3.10+"

echo
echo "Python packages"
python3 - <<'PY'
import importlib.util as u
for mod, pkg, why in [
    ("faster_whisper", "faster-whisper", "word-level transcription"),
    ("cv2", "opencv-python", "shot detection and safe zones"),
]:
    have = u.find_spec(mod) is not None
    print(f"  {'ok  ' if have else 'MISS'}  {pkg:<16} {why}")
PY

echo
read -r -p "Install the missing Python packages now? [y/N] " reply
if [[ "${reply:-n}" =~ ^[Yy]$ ]]; then
  python3 -m pip install --upgrade faster-whisper opencv-python
fi

echo
echo "Remotion"
if [[ -d "$SKILL_DIR/remotion/node_modules" ]]; then
  echo "  ok    dependencies installed"
else
  echo "  MISS  not installed — running npm install (a few minutes, downloads a headless browser)"
  (cd "$SKILL_DIR/remotion" && npm install)
fi

echo
if [[ "$MISSING" -eq 1 ]]; then
  echo "Some system tools are missing. Install them before running the pipeline."
  exit 1
fi
echo "Ready. Next: python3 scripts/probe.py <your-video.mp4>"
