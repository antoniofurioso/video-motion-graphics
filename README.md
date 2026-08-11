# video-motion-graphics

A Claude Skill that adds branded animated motion graphics to talking-head and stage
video — the right graphic, at the right millisecond.

Point it at a local video file and ask for motion graphics. It transcribes the audio
to word-level timing, works out where the speaker is in frame, decides which
graphics belong where, shows you the plan, and renders an MP4 with the graphics laid
over your footage.

It is built around one idea: **the hard part is timing and casting, not rendering.**
Choosing to pop the word "compounding" at 12.48s rather than 12.9s is what separates
an edit from a mess, so the plan is a reviewable JSON file you approve before
anything expensive happens.

---

## What it produces

Six graphic templates, one motion signature, one accent colour:

| Template | For |
|---|---|
| `keyword-pop` | the single loaded word in a sentence |
| `number-counter` | a spoken statistic, counting up to its value |
| `list-builder` | rows appearing as each item is spoken |
| `lower-third` | name and role, once per person |
| `chapter-card` | a structural break in the argument |
| `tool-chip` | a named tool or product, first mention only |

The library is closed on purpose. Inventing a new effect per moment is what makes
automated edits look incoherent; casting from a fixed set is what makes a series of
videos look like one person made them.

---

## Requirements

| | |
|---|---|
| ffmpeg + ffprobe | audio extraction and probing |
| Python 3.10+ | `faster-whisper`, `opencv-python` |
| Node 18+ | Remotion renderer |
| Disk | ~2 GB for the whisper model and headless Chrome, first run only |

Everything is free to run. Remotion is
[free for individuals and companies of up to three people](https://www.remotion.dev/docs/license);
larger teams need a company licence. Transcription runs locally, so there are no API
costs in the pipeline itself.

---

## Install

### Claude Code

```bash
git clone https://github.com/antoniofurioso/video-motion-graphics.git \
  ~/.claude/skills/video-motion-graphics
cd ~/.claude/skills/video-motion-graphics
bash scripts/setup.sh
```

`setup.sh` checks ffmpeg, Node and Python, offers to install the Python packages,
and runs `npm install` in `remotion/` (a few minutes on the first run — it downloads
a headless browser).

Restart Claude Code. Confirm it registered with `/skills`.

### Claude Desktop or claude.ai

Zip the folder and upload it in **Settings → Capabilities → Skills**:

```bash
zip -r video-motion-graphics.zip video-motion-graphics \
  -x "*/node_modules/*" "*/out/*" "*/.git/*"
```

Note that rendering needs a local machine with ffmpeg and Node, so the browser
version is useful for planning and reviewing but not for the final render.

### As a project skill

Drop the folder into `.claude/skills/` inside any repository to scope it to that
project.

---

## Use

Just ask, in a session where the skill is available:

> Add motion graphics to `~/Movies/warsaw-talk.mp4`

Or run the pipeline by hand:

```bash
python3 scripts/probe.py video.mp4
bash scripts/make_proxy.sh video.mp4 work/
python3 scripts/transcribe.py work/proxy.mp4 --out work/transcript.json
python3 scripts/analyze_video.py work/proxy.mp4 --out work/frames.json --thumbs work/thumbs/
# write work/plan.json — see assets/plan.example.json
python3 scripts/validate_plan.py work/plan.json --frames work/frames.json --table
bash scripts/render.sh work/plan.json --stills
bash scripts/render.sh work/plan.json --out out/video.mp4
```

Always render stills before the video. A still takes seconds and catches every
mistake worth catching: illegible text, a covered face, a collision with something
already burned into the footage.

### Speed

Three decisions do most of the work:

- **Proxy first.** 4K and HEVC sources are transcoded to 1080p H.264 with hardware
  decode (`-hwaccel videotoolbox` on Apple Silicon, VAAPI on Linux) before anything
  reads them. Every subsequent step runs against the proxy.
- **Render only the graphics.** Each graphic becomes a short transparent ProRes 4444
  clip. A six-graphic plan over 90 seconds renders about 15 seconds of video, not 90.
- **Composite, don't re-encode.** ffmpeg overlays the clips onto the original with
  `-c:a copy`, so the audio is never touched and the video takes one encode instead
  of two.

### Pairs well with

Cutting and graphics are separate passes and the order matters: **cut first.**
[cut-video](https://github.com/louisedesadeleer/cut-video) removes silences, ums and
retakes; run it, then point this skill at the result. Doing it the other way round
invalidates every timestamp in the plan. The proxy and hardware-decode approach here
is borrowed from that skill.

---

## How it decides

Three signals, in order of usefulness:

1. **Where the speaker slows down.** Word timestamps give words-per-second for free.
   Where the rate drops below the video's median, the speaker is emphasising — they
   have already told you what matters, which beats any keyword match.
2. **Where they pause — and only if it is really silent.** Whisper emits a gap
   wherever it stops recognising words, so laughter and applause look identical to
   structure. Every gap gets its amplitude measured; only the silent ones count.
3. **What they say.** Numerals trigger counters, enumerations trigger lists, defined
   terms trigger pops. See `references/trigger-rules.md`.

Then most of it gets thrown away. A first pass over 90 seconds typically produces 20
candidates; five or six ship. `validate_plan.py` enforces the limits that make that
stick — one graphic per 10 seconds, 3 seconds minimum between them, never two on
screen at once, nothing over a detected face.

---

## Making it yours

Every colour, font, size and duration lives in `remotion/src/tokens.ts`. Change that
file and the component styling; leave `useEntrance.ts` and `anchors.ts` alone, since
the timing and placement logic is the part that actually took the work and has
nothing to do with how it looks.

Adding a template means touching three places — the component, the registry, and the
validator — all listed in `references/troubleshooting.md`.

---

## Structure

```
video-motion-graphics/
├── SKILL.md                     workflow Claude follows
├── references/
│   ├── graphics-library.md      the six templates, and five specified but unbuilt
│   ├── trigger-rules.md         transcript patterns, density and placement rules
│   └── troubleshooting.md       when whisper mistimes, when the render fails
├── scripts/
│   ├── setup.sh                 dependency check and install
│   ├── probe.py                 duration, fps, resolution, audio
│   ├── make_proxy.sh            1080p H.264 working copy, hardware decode
│   ├── transcribe.py            word-level timestamps, cached
│   ├── analyze_video.py         shot boundaries and per-second free regions
│   ├── validate_plan.py         the rules that are invisible in JSON
│   ├── plan.schema.json
│   └── render.sh                stills, transparent clips, ffmpeg composite
├── assets/
│   └── plan.example.json        a complete 94-second plan
└── remotion/                    the renderer
    └── src/
        ├── tokens.ts            the only file with a hex value in it
        ├── Video.tsx            composition
        ├── graphics/            one component per template
        ├── anchors.ts           nine-region placement
        └── useEntrance.ts       the shared motion signature
```

---

## What it will not do

It does not cut the video, add music, or restructure the edit. It lays graphics over
footage that already works. If the underlying video is four minutes of
throat-clearing, motion graphics will not save it.

---

## Licence

MIT for this skill. Remotion is separately licensed — see
[remotion.dev/docs/license](https://www.remotion.dev/docs/license). faster-whisper
is MIT, OpenCV is Apache 2.0, Space Grotesk and Inter are SIL OFL.
