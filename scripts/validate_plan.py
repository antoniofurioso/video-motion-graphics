#!/usr/bin/env python3
"""Check a graphics plan against the rules that are invisible in JSON.

Spacing, overlap, shot boundaries, face occlusion, per-template durations and
prop shapes. Everything it catches is something that would only otherwise show up
after a render, which is the expensive place to find it.

    python3 validate_plan.py work/plan.json --frames work/frames.json
    python3 validate_plan.py work/plan.json --frames work/frames.json --table
"""
import argparse
import json
import sys
from pathlib import Path

BUILT = {"keyword-pop", "number-counter", "list-builder",
         "lower-third", "chapter-card", "tool-chip"}

DURATION_MS = {
    "keyword-pop":    (800, 2000),
    "number-counter": (1400, 3000),
    "list-builder":   (2000, 8000),
    "lower-third":    (2000, 5000),
    "chapter-card":   (1500, 3000),
    "tool-chip":      (1000, 2500),
}

REQUIRED_PROPS = {
    "keyword-pop":    ["text"],
    "number-counter": ["value", "label"],
    "list-builder":   ["items"],
    "lower-third":    ["name"],
    "chapter-card":   ["title"],
    "tool-chip":      ["text"],
}

MIN_GAP_MS = 3000
LEAD_IN_MS = 2000
TAIL_MS = 1500
MAX_PER_MINUTE = 6.0


def ts(ms: int) -> str:
    return f"{ms // 60000}:{(ms % 60000) / 1000:06.3f}"


def free_at(frames: dict, at_ms: int) -> list:
    seconds = frames.get("seconds", [])
    if not seconds:
        return []
    nearest = min(seconds, key=lambda s: abs(s["atMs"] - at_ms))
    return nearest.get("free", [])


def validate(plan: dict, frames: dict | None) -> tuple[list, list]:
    errors, warnings = [], []
    graphics = sorted(plan.get("graphics", []), key=lambda g: g["startMs"])

    if not graphics:
        return ["Plan contains no graphics."], []

    duration_ms = (plan.get("durationMs")
                   or (frames or {}).get("durationMs")
                   or max(g["endMs"] for g in graphics))
    seen_ids = set()

    for g in graphics:
        gid = g.get("id", "?")
        where = f"[{gid} @ {ts(g.get('startMs', 0))}]"

        if gid in seen_ids:
            errors.append(f"{where} duplicate id")
        seen_ids.add(gid)

        tpl = g.get("template")
        if tpl not in BUILT:
            errors.append(f"{where} template '{tpl}' is not built. "
                          f"Built templates: {', '.join(sorted(BUILT))}")
            continue

        length = g["endMs"] - g["startMs"]
        lo, hi = DURATION_MS[tpl]
        if length <= 0:
            errors.append(f"{where} endMs is not after startMs")
        elif length < lo:
            errors.append(f"{where} {length}ms is too short for {tpl} "
                          f"(minimum {lo}ms) — it will read as a flicker")
        elif length > hi:
            warnings.append(f"{where} {length}ms is long for {tpl} "
                            f"(suggested max {hi}ms) — it will outstay the point")

        for prop in REQUIRED_PROPS[tpl]:
            if prop not in (g.get("props") or {}):
                errors.append(f"{where} {tpl} needs props.{prop}")

        if tpl == "list-builder":
            items = (g.get("props") or {}).get("items") or []
            if not 2 <= len(items) <= 4:
                errors.append(f"{where} list-builder needs 2-4 items, got {len(items)}")
            for it in items:
                at = it.get("atMs")
                if at is None:
                    errors.append(f"{where} every list item needs atMs")
                elif not g["startMs"] <= at <= g["endMs"]:
                    errors.append(f"{where} item '{it.get('text')}' at {ts(at)} "
                                  "falls outside the graphic's own window")

        if tpl == "keyword-pop":
            text = (g.get("props") or {}).get("text", "")
            if len(text.split()) > 3:
                warnings.append(f"{where} keyword-pop text is {len(text.split())} "
                                "words — over 3 it stops being a pop")

        anchor_word = g.get("anchorWordMs")
        if anchor_word is not None:
            lead = anchor_word - g["startMs"]
            if lead < 0:
                errors.append(f"{where} starts {abs(lead)}ms AFTER its word is "
                              "spoken — it will always read as late")
            elif lead > 400:
                warnings.append(f"{where} leads its word by {lead}ms — over ~400ms "
                                "the graphic and the audio stop feeling connected")

        if g["startMs"] < LEAD_IN_MS:
            errors.append(f"{where} lands in the first {LEAD_IN_MS}ms of the video")
        if g["endMs"] > duration_ms - TAIL_MS:
            errors.append(f"{where} runs into the last {TAIL_MS}ms of the video")

        if frames:
            for shot in frames.get("shots", []):
                crosses = (g["startMs"] < shot["startMs"] < g["endMs"])
                if crosses and shot["startMs"] != 0:
                    errors.append(f"{where} straddles the cut at "
                                  f"{ts(shot['startMs'])}")
                if shot["startMs"] <= g["startMs"] < shot["startMs"] + LEAD_IN_MS \
                        and shot["startMs"] != 0:
                    warnings.append(f"{where} starts within 2s of a shot change")

            free = free_at(frames, g["startMs"] + (g["endMs"] - g["startMs"]) // 2)
            if free and g["anchor"] not in free:
                errors.append(f"{where} anchor '{g['anchor']}' is covered by the "
                              f"speaker. Free here: {', '.join(free) or 'nothing'}")

    for a, b in zip(graphics, graphics[1:]):
        if b["startMs"] < a["endMs"]:
            errors.append(f"[{a['id']} / {b['id']}] overlap — two graphics on "
                          f"screen at {ts(b['startMs'])}")
        else:
            gap = b["startMs"] - a["endMs"]
            if gap < MIN_GAP_MS:
                errors.append(f"[{a['id']} / {b['id']}] only {gap}ms apart "
                              f"(minimum {MIN_GAP_MS}ms)")

    per_min = len(graphics) / (duration_ms / 60000) if duration_ms else 0
    if per_min > MAX_PER_MINUTE:
        warnings.append(f"{per_min:.1f} graphics per minute across the video "
                        f"(target is under {MAX_PER_MINUTE:.0f}). Cut the weakest.")

    runs, current = [], []
    for g in graphics:
        if current and g["template"] == current[-1]["template"]:
            current.append(g)
        else:
            if len(current) >= 3:
                runs.append(current)
            current = [g]
    if len(current) >= 3:
        runs.append(current)
    for run in runs:
        warnings.append(f"{len(run)} × {run[0]['template']} in a row starting at "
                        f"{ts(run[0]['startMs'])} — vary it or drop the weakest")

    return errors, warnings


def print_table(plan: dict) -> None:
    rows = sorted(plan.get("graphics", []), key=lambda g: g["startMs"])
    print(f"\n{'time':>10}  {'template':<15} {'anchor':<13} text")
    print("-" * 78)
    for g in rows:
        props = g.get("props", {})
        text = (props.get("text") or props.get("title") or props.get("name")
                or props.get("label") or "")
        if g["template"] == "number-counter":
            text = f"{props.get('prefix','')}{props.get('value')}" \
                   f"{props.get('suffix','')} — {props.get('label','')}"
        if g["template"] == "list-builder":
            text = " / ".join(i.get("text", "") for i in props.get("items", []))
        print(f"{ts(g['startMs']):>10}  {g['template']:<15} {g['anchor']:<13} {text[:34]}")
    print()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("--frames", default=None)
    ap.add_argument("--table", action="store_true", help="also print a review table")
    args = ap.parse_args()

    plan = json.loads(Path(args.plan).read_text())
    frames = json.loads(Path(args.frames).read_text()) if args.frames else None

    errors, warnings = validate(plan, frames)

    if args.table:
        print_table(plan)

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")

    n = len(plan.get("graphics", []))
    if errors:
        print(f"\n{len(errors)} error(s) in {n} graphic(s). Fix before rendering.")
        sys.exit(1)
    print(f"\nPlan is valid: {n} graphic(s)"
          + (f", {len(warnings)} warning(s) worth a look." if warnings else "."))


if __name__ == "__main__":
    main()
