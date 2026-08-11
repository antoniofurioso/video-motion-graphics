#!/usr/bin/env bash
# Render a plan — preview stills, or the final composite.
#
#   bash scripts/render.sh work/plan.json --stills
#   bash scripts/render.sh work/plan.json --out ~/Desktop/talk-mg.mp4
#
# The final render does NOT push the whole video through Remotion. It renders each
# graphic as a short transparent clip, then composites them onto the original with
# ffmpeg using `-c:a copy`. Three reasons: the audio is never touched, only the
# seconds that carry a graphic get rendered, and the original survives one encode
# instead of two.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTION_DIR="$SKILL_DIR/remotion"

PLAN="${1:-}"
if [[ -z "$PLAN" || ! -f "$PLAN" ]]; then
  echo "usage: render.sh <plan.json> [--stills | --out <file.mp4>]" >&2
  exit 1
fi
shift

MODE="stills"; OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stills) MODE="stills"; shift ;;
    --out)    MODE="video"; OUT="${2:-}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

PLAN="$(cd "$(dirname "$PLAN")" && pwd)/$(basename "$PLAN")"
WORK="$(dirname "$PLAN")"

read_plan() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$PLAN" "$1"; }
SOURCE="$(read_plan source)"
FPS="$(read_plan fps)"

[[ -f "$SOURCE" ]] || { echo "Source from the plan does not exist: $SOURCE" >&2; exit 1; }
[[ -f "$WORK/proxy.mp4" ]] || { echo "No proxy at $WORK/proxy.mp4 — run scripts/make_proxy.sh first" >&2; exit 1; }

mkdir -p "$REMOTION_DIR/public"
ln -sf "$(cd "$WORK" && pwd)/proxy.mp4" "$REMOTION_DIR/public/proxy.mp4"
cp "$PLAN" "$REMOTION_DIR/public/plan.json"

if [[ ! -d "$REMOTION_DIR/node_modules" ]]; then
  echo "Installing Remotion dependencies (first run only)..."
  (cd "$REMOTION_DIR" && npm install --silent)
fi

HWACCEL=()
if [[ "$(uname -s)" == "Darwin" ]]; then HWACCEL=(-hwaccel videotoolbox); fi

# ---------------------------------------------------------------- stills
if [[ "$MODE" == "stills" ]]; then
  STILLS_DIR="$WORK/stills"
  mkdir -p "$STILLS_DIR"; rm -f "$STILLS_DIR"/*.png 2>/dev/null || true

  echo "Rendering one still per graphic into $STILLS_DIR"
  LIST="$(mktemp)"
  python3 -c "
import json, sys
plan = json.load(open(sys.argv[1])); fps = float(sys.argv[2])
for g in sorted(plan['graphics'], key=lambda x: x['startMs']):
    mid = (g['startMs'] + g['endMs']) / 2
    print(g['id'], int(mid / 1000 * fps))
" "$PLAN" "$FPS" > "$LIST"

  while read -r ID FRAME; do
    [[ -z "$ID" ]] && continue
    (cd "$REMOTION_DIR" && npx remotion still src/index.ts Video \
      "$STILLS_DIR/$ID.png" --frame="$FRAME" --props='{"mode":"preview"}' --log=error)
    echo "  $ID.png (frame $FRAME)"
  done < "$LIST"
  rm -f "$LIST"

  echo
  echo "Look at every one before rendering: legible against that frame?"
  echo "covering the face or hands? colliding with anything already in the footage?"
  exit 0
fi

# ---------------------------------------------------------------- video
[[ -n "$OUT" ]] || { echo "--out needs a destination path" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"

CLIPS_DIR="$WORK/clips"
mkdir -p "$CLIPS_DIR"; rm -f "$CLIPS_DIR"/*.mov 2>/dev/null || true

COUNT="$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))['graphics']))" "$PLAN")"
echo "Rendering $COUNT transparent overlay clip(s)"

RANGES="$(mktemp)"
python3 -c "
import json, sys
plan = json.load(open(sys.argv[1])); fps = float(sys.argv[2])
for g in sorted(plan['graphics'], key=lambda x: x['startMs']):
    a = int(g['startMs'] / 1000 * fps)
    b = max(a, int(g['endMs'] / 1000 * fps) - 1)
    print(g['id'], a, b)
" "$PLAN" "$FPS" > "$RANGES"

while read -r ID A B; do
  [[ -z "$ID" ]] && continue
  (cd "$REMOTION_DIR" && npx remotion render src/index.ts Video \
    "$CLIPS_DIR/$ID.mov" \
    --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le \
    --frames="$A-$B" --props='{"mode":"overlay"}' --log=error)
  echo "  $ID.mov (frames $A-$B)"
done < "$RANGES"

# Composite filtergraph: shift each clip to its own start time, then chain the
# overlays. Graphics never overlap - the validator guarantees it - so a straight
# chain is both correct and cheap.
FILTER="$WORK/overlay-filter.txt"
python3 -c "
import json, sys
plan = json.load(open(sys.argv[1]))
graphics = sorted(plan['graphics'], key=lambda x: x['startMs'])
lines, prev = [], '0:v'
for i, g in enumerate(graphics, start=1):
    s, e = g['startMs'] / 1000, g['endMs'] / 1000
    lines.append('[%d:v]setpts=PTS+%.3f/TB[o%d];' % (i, s, i))
    label = 'outv' if i == len(graphics) else 'v%d' % i
    lines.append(\"[%s][o%d]overlay=x=0:y=0:eof_action=pass:enable='between(t,%.3f,%.3f)'[%s];\" % (prev, i, s, e, label))
    prev = label
out = '\n'.join(lines).rstrip(';')
open(sys.argv[2], 'w').write(out + '\n')
" "$PLAN" "$FILTER"

INPUTS=(-i "$SOURCE")
while read -r ID _ _; do
  [[ -z "$ID" ]] && continue
  INPUTS+=(-i "$CLIPS_DIR/$ID.mov")
done < "$RANGES"
rm -f "$RANGES"

echo "Compositing onto $(basename "$SOURCE") - audio copied, not re-encoded"
START=$(date +%s)
ffmpeg -y -nostdin -loglevel error -stats "${HWACCEL[@]}" "${INPUTS[@]}" \
  -filter_complex_script "$FILTER" \
  -map "[outv]" -map 0:a? \
  -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
  -c:a copy \
  "$OUT"

echo "Rendered in $(( $(date +%s) - START ))s -> $OUT"
