#!/usr/bin/env python3
"""Transcribe a video to word-level timestamps.

Word timing is the foundation of this whole pipeline: a graphic placed against
sentence-level timing lands somewhere inside the right sentence, which reads as
broken. Output is cached — re-running on an unchanged file is a no-op unless
--force is passed.

    python3 transcribe.py video.mp4 --out work/transcript.json
    python3 transcribe.py video.mp4 --out work/transcript.json --model medium --language it
"""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def extract_audio(video: Path) -> Path:
    wav = Path(tempfile.mkdtemp()) / "audio.wav"
    subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(video),
         "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav)],
        check=True,
    )
    return wav


def fingerprint(video: Path, model: str, language: str | None) -> str:
    stat = video.stat()
    raw = f"{video.resolve()}:{stat.st_size}:{int(stat.st_mtime)}:{model}:{language}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def transcribe(video: Path, model_size: str, language: str | None) -> dict:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit(
            "faster-whisper is not installed. Run scripts/setup.sh, or:\n"
            "  pip install faster-whisper"
        )

    wav = extract_audio(video)
    model = WhisperModel(model_size, device="auto", compute_type="int8")
    segments, info = model.transcribe(
        str(wav),
        language=language,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )

    words, sentences = [], []
    for seg in segments:
        sentences.append({
            "text": seg.text.strip(),
            "startMs": int(seg.start * 1000),
            "endMs": int(seg.end * 1000),
        })
        for w in (seg.words or []):
            words.append({
                "text": w.word.strip(),
                "startMs": int(w.start * 1000),
                "endMs": int(w.end * 1000),
                "confidence": round(float(w.probability), 3),
            })

    return {
        "language": info.language,
        "durationSec": round(info.duration, 3),
        "model": model_size,
        "words": words,
        "sentences": sentences,
    }


def annotate(data: dict) -> dict:
    """Add the two signals that matter more than keyword matching: where the
    speaker slows down, and where they pause."""
    words = data["words"]
    if len(words) < 6:
        return data

    window = 5
    rates = []
    for i in range(len(words)):
        lo = max(0, i - window // 2)
        hi = min(len(words), lo + window)
        span = (words[hi - 1]["endMs"] - words[lo]["startMs"]) / 1000
        rates.append((hi - lo) / span if span > 0 else 0.0)

    ordered = sorted(r for r in rates if r > 0)
    median = ordered[len(ordered) // 2] if ordered else 0.0

    for i, w in enumerate(words):
        w["wordsPerSec"] = round(rates[i], 2)
        w["emphasis"] = bool(median and rates[i] < median * 0.7)
        prev_end = words[i - 1]["endMs"] if i else 0
        w["gapBeforeMs"] = max(0, w["startMs"] - prev_end)

    data["medianWordsPerSec"] = round(median, 2)
    data["pauses"] = [
        {"atMs": w["startMs"], "gapMs": w["gapBeforeMs"], "nextWord": w["text"]}
        for w in words if w["gapBeforeMs"] >= 800
    ]
    return data


def measure_pause_audio(video: Path, pauses: list) -> list:
    """Check whether each 'pause' is actually silent.

    Whisper emits a gap wherever it stops recognising words, which includes
    laughter, applause and background music. On a stage recording that is most of
    them. A chapter card dropped on top of applause reads as a mistake, so every
    gap gets its amplitude measured before it counts as a structural break.
    """
    for p in pauses:
        start = p["atMs"] - p["gapMs"]
        result = subprocess.run(
            ["ffmpeg", "-nostdin", "-hide_banner", "-ss", f"{start / 1000:.3f}",
             "-t", f"{p['gapMs'] / 1000:.3f}", "-i", str(video),
             "-vn", "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True, text=True,
        )
        peak = None
        for line in result.stderr.splitlines():
            if "max_volume:" in line:
                try:
                    peak = float(line.split("max_volume:")[1].strip().split()[0])
                except (IndexError, ValueError):
                    pass
        p["peakDb"] = peak
        # Above roughly -30dB there is audible content in the gap.
        p["silent"] = peak is not None and peak < -30.0
    return pauses


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="small",
                    help="tiny|base|small|medium|large-v3 (default: small)")
    ap.add_argument("--language", default=None, help="e.g. en, it, pl")
    ap.add_argument("--force", action="store_true", help="ignore the cache")
    args = ap.parse_args()

    video = Path(args.video).expanduser()
    if not video.exists():
        raise SystemExit(f"Not found: {video}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    fp = fingerprint(video, args.model, args.language)

    if out.exists() and not args.force:
        try:
            cached = json.loads(out.read_text())
            if cached.get("fingerprint") == fp:
                print(f"Cached transcript is current ({len(cached['words'])} words). "
                      "Pass --force to redo it.")
                return
        except (json.JSONDecodeError, KeyError):
            pass

    print(f"Transcribing {video.name} with whisper '{args.model}'...", file=sys.stderr)
    data = annotate(transcribe(video, args.model, args.language))
    data["pauses"] = measure_pause_audio(video, data["pauses"])
    data["fingerprint"] = fp
    data["source"] = str(video.resolve())
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    low = [w for w in data["words"] if w["confidence"] < 0.5]
    silent = [p for p in data["pauses"] if p.get("silent")]
    noisy = len(data["pauses"]) - len(silent)

    print(f"Wrote {out} — {len(data['words'])} words, "
          f"{len(silent)} genuine pause(s) over 800ms, language={data['language']}")
    if noisy:
        print(f"NOTE: {noisy} gap(s) contain audible content — laughter, applause or "
              "music, not structure. Do not put chapter cards on those.")
    if low:
        print(f"NOTE: {len(low)} words below 50% confidence. Check any of them you "
              "plan to put on screen — a misheard word in 60pt type is unshippable.")


if __name__ == "__main__":
    main()
