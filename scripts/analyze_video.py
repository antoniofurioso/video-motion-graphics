#!/usr/bin/env python3
"""Find shot boundaries and, per second, which regions of the frame are free.

A graphic that covers the speaker's face is worse than no graphic, and one that
straddles a cut looks like a glitch. This produces the map that prevents both.

    python3 analyze_video.py video.mp4 --out work/frames.json --thumbs work/thumbs/
"""
import argparse
import json
from pathlib import Path

ANCHORS = [
    "top-left", "top-center", "top-right",
    "mid-left", "center", "mid-right",
    "bottom-left", "bottom-center", "bottom-right",
]

# A region counts as occupied when this share of it is covered by the speaker.
OCCUPANCY_THRESHOLD = 0.12


def region_boxes(w: int, h: int) -> dict:
    cw, ch = w / 3, h / 3
    boxes = {}
    for row in range(3):
        for col in range(3):
            boxes[ANCHORS[row * 3 + col]] = (col * cw, row * ch, cw, ch)
    return boxes


def overlap_ratio(region, box) -> float:
    rx, ry, rw, rh = region
    bx, by, bw, bh = box
    ix = max(0, min(rx + rw, bx + bw) - max(rx, bx))
    iy = max(0, min(ry + rh, by + bh) - max(ry, by))
    return (ix * iy) / (rw * rh) if rw and rh else 0.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--thumbs", default=None, help="directory for sample thumbnails")
    ap.add_argument("--scene-threshold", type=float, default=0.35,
                    help="0-1, lower finds more cuts (default 0.35)")
    args = ap.parse_args()

    try:
        import cv2
    except ImportError:
        raise SystemExit(
            "opencv-python is not installed. Run scripts/setup.sh, or:\n"
            "  pip install opencv-python"
        )

    video = Path(args.video).expanduser()
    if not video.exists():
        raise SystemExit(f"Not found: {video}")

    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    regions = region_boxes(width, height)

    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    thumbs_dir = Path(args.thumbs) if args.thumbs else None
    if thumbs_dir:
        thumbs_dir.mkdir(parents=True, exist_ok=True)

    step = max(1, int(round(fps)))  # one sample per second
    seconds, shots = [], []
    prev_hist = None
    shot_start_ms = 0
    idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step:
            idx += 1
            continue

        t_ms = int(idx / fps * 1000)

        # Shot detection by colour histogram distance.
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist, hist)
        if prev_hist is not None:
            distance = 1 - cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
            if distance > args.scene_threshold:
                shots.append({"startMs": shot_start_ms, "endMs": t_ms})
                shot_start_ms = t_ms
        prev_hist = hist

        # Speaker footprint: detected faces, extended downward for the body.
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, 1.15, 5, minSize=(60, 60))
        footprints = []
        for (x, y, w, h) in faces:
            footprints.append((float(x), float(y), float(w), float(h)))
            body_h = min(height - (y + h), h * 3.5)
            if body_h > 0:
                footprints.append((float(x - w * 0.4), float(y + h),
                                   float(w * 1.8), float(body_h)))

        occupied = set()
        for name, region in regions.items():
            covered = sum(overlap_ratio(region, f) for f in footprints)
            if covered >= OCCUPANCY_THRESHOLD:
                occupied.add(name)

        seconds.append({
            "atMs": t_ms,
            "facesDetected": len(faces),
            "occupied": sorted(occupied),
            "free": [a for a in ANCHORS if a not in occupied],
        })

        if thumbs_dir and (t_ms // 1000) % 5 == 0:
            cv2.imwrite(str(thumbs_dir / f"t{t_ms // 1000:04d}.jpg"),
                        cv2.resize(frame, (640, int(640 * height / width))))
        idx += 1

    duration_ms = int(total / fps * 1000) if total else (seconds[-1]["atMs"] if seconds else 0)
    shots.append({"startMs": shot_start_ms, "endMs": duration_ms})
    cap.release()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "source": str(video.resolve()),
        "fps": round(fps, 3),
        "width": width,
        "height": height,
        "durationMs": duration_ms,
        "shots": shots,
        "seconds": seconds,
    }, indent=2))

    never_free = [a for a in ANCHORS
                  if all(a in s["occupied"] for s in seconds)] if seconds else []
    no_face = [s["atMs"] for s in seconds if s["facesDetected"] == 0]

    print(f"Wrote {out} — {len(shots)} shot(s), {len(seconds)} seconds sampled")
    if never_free:
        print(f"Always occupied, do not anchor here: {', '.join(never_free)}")
    if len(no_face) > len(seconds) * 0.5:
        print("NOTE: no face found in most frames. Either this is not a talking-head "
              "video, or the speaker is in profile. Treat the free-region map as "
              "unreliable and check thumbnails before placing anything.")


if __name__ == "__main__":
    main()
