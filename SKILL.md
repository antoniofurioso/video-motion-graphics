---
name: video-motion-graphics
description: Add branded animated motion graphics to a talking-head or stage video — keyword pops, number counters, list builders and more, placed at the exact millisecond the words are spoken. Use this skill whenever the user points at a local video file and asks to enhance it, animate it, "add motion graphics", "add b-roll text", "make this video less boring", "add animated captions or callouts", "spice up this talking head", or wants graphics, callouts, stats or on-screen text laid over their own footage. Also use it to re-cut, restyle or re-time graphics on a video that was built this way, and whenever someone asks how to turn a raw recording into an edited-looking clip without opening an editor.
---

# Video motion graphics

Take a video of the user talking, work out what they are saying and when, then lay
animated graphics over it — the right graphic, at the right millisecond, in their
brand. The output is an MP4 that looks edited, produced from a raw recording.

The hard part is never the rendering. It is timing and casting: knowing that the
word "compounding" lands at 12.48s and that it deserves a keyword pop rather than a
list builder. Everything in this skill is arranged around getting that right and
making it reviewable before anything expensive happens.

## The two-stage rule

Never render before the plan is approved.

1. **Plan** — cheap. Produces `plan.json`: a timeline of which graphic appears when,
   with what text, in which corner. Seconds to produce, seconds to fix.
2. **Render** — expensive. Executes the plan. Minutes, and every correction costs
   another few minutes.

Show the plan as a readable table and get a yes before rendering. A user who sees
"14 graphics in 90 seconds" in a table will cut it to 6 before you burn the render.

## Workflow

### 1. Locate the video and set up

The source is a local file the user names. Confirm it exists and read its shape:

```bash
bash scripts/setup.sh                    # checks ffmpeg, python deps, remotion
python3 scripts/probe.py /path/to/video.mp4
bash scripts/make_proxy.sh /path/to/video.mp4 work/
```

`probe.py` prints duration, fps, resolution and audio presence. If the video is
longer than about 5 minutes, say so and ask which section to work on — a 20 minute
render loop kills the iteration this skill depends on.

`make_proxy.sh` is the single biggest speed decision here. It transcodes 4K, HEVC or
oversized sources down to a 1080p H.264 working copy with hardware decode, and every
step after this one reads the proxy. Software-decoding a 4K HEVC file on every pass
turns a two-minute loop into a twenty-minute one. If the source is already small and
H.264 the script links instead of transcoding, so it is always safe to run.

**If the video also needs tightening** — silences, ums, retakes — cut it *first*,
with something like [cut-video](https://github.com/louisedesadeleer/cut-video), and
run this skill on the cut file. Cutting after planning invalidates every timestamp
in the plan, and there is no way to repair that other than starting over.

### 2. Transcribe with word-level timing

```bash
python3 scripts/transcribe.py /path/to/video.mp4 --out work/transcript.json
```

This runs faster-whisper locally with word timestamps. It is the single most
important artifact in the pipeline: sentence-level timing is useless here, because a
graphic that appears somewhere inside the right sentence reads as broken.

Default model is `small`; pass `--model medium` when the audio is accented, noisy or
technical, and `--language it` (or similar) for non-English. Transcription runs once
and is cached — never re-run it while iterating on the plan.

It also measures the amplitude of every gap over 800ms and marks each one `silent`
or not. Whisper emits a gap wherever it stops recognising words, which includes
laughter, applause and music — on a stage recording that is most of them. Only gaps
marked `silent` are structural breaks. A chapter card dropped onto applause reads as
a mistake.

### 3. Read the frames

```bash
python3 scripts/analyze_video.py /path/to/video.mp4 --out work/frames.json --thumbs work/thumbs/
```

This gives two things: shot boundaries (so a graphic never straddles a cut) and, for
each second, which regions of the frame are free of the speaker's face and body.
Read `work/frames.json` and sample a handful of thumbnails with the view tool if the
footage is unfamiliar — you need to know whether they are centred, framed left, or
standing in front of a slide.

### 4. Cast the graphics

Read `references/graphics-library.md` and `references/trigger-rules.md` now. Do not
invent graphics. The library is closed on purpose: eleven templates, each with a
defined trigger, and your job is casting, not design. Inventing a new effect per
video is exactly what makes AI-edited footage look incoherent.

Walk the transcript and mark candidates. Then cut the list down using the density
rules in `references/trigger-rules.md` — a first pass typically produces three times
too many graphics, and the cut is where the edit gets good. Prefer the moments the
speaker themselves emphasises: a repeated phrase, a slowed-down sentence, a number.

Write `work/plan.json` following `scripts/plan.schema.json`, then:

```bash
python3 scripts/validate_plan.py work/plan.json --frames work/frames.json
```

The validator enforces spacing, overlap, shot boundaries and face occlusion, and
prints every violation with the timestamp. Fix and re-run until it is clean — it is
checking the things that are invisible in a JSON file and obvious in a render.

### 5. Show the plan and wait

Present the plan as a table: timecode, graphic, text, position, and the line of
transcript it sits on. Say how many graphics per minute that works out to. Then stop
and ask. This is the approval gate.

### 6. Preview stills before the full render

```bash
bash scripts/render.sh work/plan.json --stills
```

This renders one still per graphic at its midpoint — seconds each, not minutes. View
them. Check three things that only show up visually: is the text legible against
that frame, does it cover the speaker's face or hands, does it collide with anything
already burned into the footage. Fix positions in `plan.json` and re-run.

### 7. Render

```bash
bash scripts/render.sh work/plan.json --out out/video-mg.mp4
```

This renders each graphic as a short transparent ProRes clip and composites them
onto the **original** with ffmpeg. It does not push the whole video through
Remotion. Three consequences worth knowing: the audio is copied rather than
re-encoded, only the seconds carrying a graphic get rendered at all, and the
original's quality survives one encode instead of two.

Then present the file. Mention render time and graphic count, nothing else — the
video speaks for itself.

## Brand

Every visual value lives in `remotion/src/tokens.ts`, mirroring the tokens in the
`branded-infographics` skill so a video and an infographic on the same subject look
like siblings: paper ground, near-black ink, one orange doing the highlighting,
Space Grotesk for display and Inter for body.

Rules that survive every request:

- One orange thing on screen at a time. Orange highlights; it never fills.
- No shadows, no pure white or pure black, no second accent colour, no third
  typeface. Corners are rounded to the token radii.
- Graphics enter and leave with the same motion (spring in, fade out over 6 frames).
  Mixed easing across templates is what makes a video feel assembled from stock.
- Nothing appears for less than 0.8s or more than 5s. Below that it reads as a
  glitch; above it, as a mistake.

If the user supplies reference images for a new look, change `tokens.ts` and the
component styling only — never the timing logic, which is what actually works.

## Reference files

- `references/graphics-library.md` — the eleven templates, what each is for, the
  props it takes, and when it is the wrong choice. Read before writing a plan.
- `references/trigger-rules.md` — transcript patterns mapped to templates, plus the
  density and placement rules that keep the edit from turning into confetti.
- `references/troubleshooting.md` — what to do when whisper mistimes, when the
  render fails, when fonts do not load.

## What this skill will not do

It does not cut the video, add music, or restructure the edit. It lays graphics over
footage that already works. If the underlying video is 4 minutes of throat-clearing,
motion graphics will not save it, and saying so is more useful than rendering it.
