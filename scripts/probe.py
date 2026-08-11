#!/usr/bin/env python3
"""Print the shape of a source video: duration, fps, resolution, audio."""
import json
import subprocess
import sys
from pathlib import Path


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(out.stdout)

    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    audio = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
    if video is None:
        raise SystemExit(f"No video stream in {path}")

    num, den = (video.get("r_frame_rate") or "30/1").split("/")
    fps = round(float(num) / float(den), 3) if float(den) else 30.0

    return {
        "path": str(path),
        "durationSec": round(float(data["format"]["duration"]), 3),
        "fps": fps,
        "width": int(video["width"]),
        "height": int(video["height"]),
        "hasAudio": audio is not None,
    }


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: probe.py <video>")
    path = Path(sys.argv[1]).expanduser()
    if not path.exists():
        raise SystemExit(f"Not found: {path}")

    info = probe(path)
    print(json.dumps(info, indent=2))

    if not info["hasAudio"]:
        print("\nWARNING: no audio track. Transcription is impossible, and without a "
              "transcript this skill has nothing to time graphics against.")
    if info["durationSec"] > 300:
        print(f"\nNOTE: {info['durationSec'] / 60:.1f} minutes is long for this "
              "pipeline. Ask which section to work on before transcribing.")


if __name__ == "__main__":
    main()
