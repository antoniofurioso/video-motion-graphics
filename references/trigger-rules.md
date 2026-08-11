# Trigger and density rules

Two jobs: decide what a moment deserves, then throw most of it away.

---

## Triggers

Read the transcript looking for these patterns. Each is a candidate, not a decision.

| Pattern in the transcript | Template | Anchor word |
|---|---|---|
| A numeral, percentage, currency amount, or multiple | `number-counter` | the numeral |
| "three things", "first", "second", "next", "finally" | `list-builder` | each item's first word |
| A term being defined: "what I call", "the term for this", "this is basically" | `keyword-pop` | the term itself |
| A word the speaker repeats within 10s | `keyword-pop` | the second occurrence |
| A named tool, product or company, first mention | `tool-chip` | the name |
| A person introduced by name and role | `lower-third` | the name |
| "so", "now", "here's the thing", after a **silent** pause over 800ms | `chapter-card` | the first word after the pause |
| A sentence delivered noticeably slower than the surrounding speech | `keyword-pop` | the stressed word |

**Speech rate as a signal.** Word timestamps give you this for free: compute
words-per-second over a rolling 5-word window. Where it drops well below the video's
median, the speaker is emphasising. Those moments deserve graphics more than any
keyword match does, because the speaker has already told you what matters.

**Pauses as a signal.** A gap over 800ms between words is a structural break — but
only if it is actually silent. `transcribe.py` marks each one `silent: true/false` by
measuring its amplitude, because whisper emits a gap wherever it stops recognising
words, and laughter, applause and music all qualify. Use only the silent ones. A
gap with audible content is the speaker getting a reaction, which is a fine moment
to leave alone entirely.

---

## Density

A first pass over a 90-second video typically produces 20 candidates. Ship 5 or 6.

Hard limits, enforced by `validate_plan.py`:

- No more than **one graphic per 10 seconds** on average across the video.
- Minimum **3 seconds** between the end of one graphic and the start of the next.
- **Never two on screen at once.**
- Nothing in the **first 2 seconds** of the video or of any shot.
- Nothing in the **last 1.5 seconds** of the video.
- Any single graphic: **0.8s minimum, 5s maximum**.

Soft rules, your judgement:

- Vary the templates. Three keyword-pops in a row is a tic. If a stretch only
  produces keyword-pops, keep the strongest and drop the rest.
- Front-load lightly. The first 10 seconds decide whether anyone watches; one good
  graphic there is worth three later.
- Leave the ending clean. The last 10 seconds are usually a call to action and the
  speaker's face carries it better than a graphic does.
- If the speaker is already doing something visually interesting — moving, gesturing
  at something, changing shot — add nothing.

**The cut, in order.** When you have too many, drop in this sequence: duplicates of
the same template within 15s, then anything whose text merely repeats what is being
said, then anything in the last third, then anything you had to argue yourself into.

---

## Placement

`analyze_video.py` returns, per second, which of the nine anchor regions are free of
the speaker. Rules for choosing among the free ones:

- Prefer the side the speaker is **not** on. If they are framed left, anchor right.
- Prefer upper regions for keyword-pops and chips, lower for lower-thirds and lists.
  Viewers scan top-down and the bottom of a frame is often cropped by platform UI.
- Keep a single graphic's anchor consistent with the one before it where possible —
  graphics that hop around the frame draw attention to themselves rather than the
  point.
- `center` is for chapter-cards only. Anything else in the centre covers the face.
- Assume the bottom 12% may be covered by subtitles or platform chrome. Do not put
  anything load-bearing there.

---

## Worked example

Transcript fragment, word timings in brackets:

> "...so [41.02] here's [41.18] the [41.31] thing. Most [42.90] founders [43.21]
> chase [43.60] volume. I [44.10] got [44.28] a [44.40] 340 [44.52] percent
> [44.95] lift [45.40] from [45.72] doing [45.88] the [46.02] opposite [46.20]..."

Candidates: chapter-card at 41.02 (pause + "so"), keyword-pop on "volume" 43.60,
number-counter on "340 percent" 44.52, keyword-pop on "opposite" 46.20.

Cut to **one**. Five and a half seconds of speech cannot hold four graphics, and it
cannot hold two either: a chapter-card ending at 43.02 and a counter starting at
44.42 are 1.4s apart, well inside the 3s minimum. Run the arithmetic before you
grow attached to a moment.

The counter wins — it is the strongest beat in the fragment and the only one
carrying information the audio alone does not deliver. Both keyword-pops go:
"volume" is 0.9s from the counter, "opposite" is 1.7s after it. The chapter-card
moves back to the previous pause if there is one clear of everything else, and is
dropped if there is not.

```json
[
  { "id": "g5", "template": "number-counter", "startMs": 44420, "endMs": 46620,
    "anchor": "top-right", "anchorWordMs": 44520,
    "props": { "value": 340, "suffix": "%", "label": "lift in replies" } }
]
```

Note two things. The counter starts 100ms before the numeral is spoken, so the
animation has resolved by the time the ear catches up. And its label is not a
transcription — graphics that repeat the audio word for word add nothing. They name
the thing the number is about.

See `assets/plan.example.json` for a complete plan across a 94-second video: six
graphics, every one of them clearing the spacing rules.
