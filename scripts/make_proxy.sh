#!/usr/bin/env bash
# Make a 1080p H.264 working copy before anything else touches the video.
#
#   bash scripts/make_proxy.sh source.mov work/
#
# This is the single biggest speed decision in the pipeline. Transcription, frame
# analysis and every preview still run against the proxy; only the final composite
# touches the original. A 4K HEVC source software-decoded on every step turns a
# two-minute loop into a twenty-minute one.
set -euo pipefail

SRC="${1:-}"
WORK="${2:-work}"

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "usage: make_proxy.sh <source-video> [work-dir]" >&2
  exit 1
fi

mkdir -p "$WORK"
PROXY="$WORK/proxy.mp4"

read -r CODEC WIDTH SIZE < <(
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,width -show_entries format=size \
    -of default=nw=1:nk=1 "$SRC" | paste -sd' ' -
)

# Hardware decode where it exists. VideoToolbox on Apple Silicon is roughly an
# order of magnitude faster on HEVC; on Linux, VAAPI if present.
HWACCEL=()
if [[ "$(uname -s)" == "Darwin" ]]; then
  HWACCEL=(-hwaccel videotoolbox)
elif [[ -e /dev/dri/renderD128 ]]; then
  HWACCEL=(-hwaccel vaapi)
fi

NEEDS_PROXY=0
[[ "$CODEC" == "hevc" || "$CODEC" == "vp9" || "$CODEC" == "av1" ]] && NEEDS_PROXY=1
[[ "${WIDTH:-0}" -gt 1920 ]] && NEEDS_PROXY=1
[[ "${SIZE:-0}" -gt 524288000 ]] && NEEDS_PROXY=1

if [[ "$NEEDS_PROXY" -eq 0 ]]; then
  echo "Source is already 1080p-or-smaller H.264 — linking rather than transcoding."
  ln -sf "$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")" "$PROXY"
  echo "$PROXY"
  exit 0
fi

echo "Transcoding proxy: $CODEC ${WIDTH}px → 1080p H.264"
START=$(date +%s)
ffmpeg -y -nostdin -loglevel error "${HWACCEL[@]}" -i "$SRC" \
  -vf "scale='min(1920,iw)':-2" \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  "$PROXY"

echo "Proxy ready in $(( $(date +%s) - START ))s → $PROXY"
echo "Work from the proxy from here. The original is only touched at the final composite."
