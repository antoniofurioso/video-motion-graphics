# Graphics library

A closed set. Casting from a fixed library is what makes a series of videos look
like one person made them; inventing an effect per moment is what makes them look
generated. If a moment does not fit a template here, the right answer is usually no
graphic at all.

Six templates are built and renderable. Five more are specified at the bottom and
must not be cast until they exist — a plan referencing them will fail validation.

**Contents**

- [Built templates](#built-templates) — keyword-pop, number-counter, list-builder,
  lower-third, chapter-card, tool-chip
- [Shared props](#shared-props)
- [Not built yet](#not-built-yet)

---

## Shared props

Every entry in `plan.json` carries these, whatever the template:

| Field | Meaning |
|---|---|
| `id` | Unique string, e.g. `g3`. Used in filenames for stills. |
| `template` | One of the built template ids below. |
| `startMs` / `endMs` | Absolute milliseconds in the source video. |
| `anchor` | `top-left`, `top-center`, `top-right`, `mid-left`, `mid-right`, `bottom-left`, `bottom-center`, `bottom-right`, `center`. |
| `props` | Template-specific, described below. |

Timing convention: `startMs` is when the graphic begins animating in, and it should
be **80–120ms before** the word it belongs to is spoken. A graphic that lands exactly
on the word reads as late, because the animation takes time to resolve. The
validator warns if a graphic starts after its anchor word.

---

## Built templates

### keyword-pop

One word or short phrase in a paper chip with an orange underline sweep, popping in
next to the speaker as they say it.

- **Use for**: the single most loaded word in a sentence — a term being defined, a
  name being coined, the word the speaker leans on.
- **Props**: `{ "text": "compounding" }` — 1 to 3 words. Longer and it stops being a
  pop and becomes a caption, which this skill does not do.
- **Duration**: 1.0–1.6s.
- **Wrong choice when**: the sentence has three words worth popping. Pick one, or
  the frame turns into a word cloud.

### number-counter

A figure that counts up to its value, with a label underneath and an optional unit.

- **Use for**: any spoken statistic — percentages, money, multiples, counts, dates
  used as milestones.
- **Props**: `{ "value": 340, "prefix": "", "suffix": "%", "label": "increase in replies" }`
- **Duration**: 1.6–2.5s. The count-up needs room; anything shorter and the number
  is still spinning when it leaves.
- **Wrong choice when**: the number is incidental ("the second thing is..."). Only
  spotlight numbers that carry an argument.

### list-builder

Rows appear one at a time, each row timed to the moment its item is spoken. The
finished list holds on screen briefly, then leaves as a block.

- **Use for**: explicit enumeration — "three things", "first / second / third", or a
  run of parallel clauses.
- **Props**: `{ "items": [{ "text": "Find the signal", "atMs": 41200 }, ...] }` —
  2 to 4 items, each with its own absolute timestamp. `endMs` should be roughly 1s
  after the last item's `atMs`.
- **Wrong choice when**: the speaker lists five or more things, or lists them faster
  than one every 1.5s. Both produce a list nobody can read; use a chapter-card for
  the section instead.

### lower-third

Name and role in the bottom-left, sliding in from the edge.

- **Use for**: the first time the speaker appears, and the first time any other
  named person appears. Once per person per video.
- **Props**: `{ "name": "Antonio Furioso", "role": "Inbound growth systems" }`
- **Duration**: 2.5–4s. Place it 2–5s into the video, not at 0 — let the viewer see
  a face first.
- **Wrong choice when**: it is the second time. Repeating a lower-third is the most
  common giveaway of an automated edit.

### chapter-card

A full-width band with a section number and title, marking a structural break.

- **Use for**: the transition into a new part of the argument, usually where the
  speaker says "so", "now", "the second half of this", or pauses for more than a
  second.
- **Props**: `{ "index": 2, "title": "What actually moves the needle" }`
- **Duration**: 1.8–2.5s.
- **Wrong choice when**: the video is under 60s, which has no chapters, or when a
  shot change already does the same job.

### tool-chip

A small chip naming a tool, company or product, sitting quietly in a corner.

- **Use for**: the moment a specific named thing is mentioned and the viewer might
  not catch the spelling.
- **Props**: `{ "text": "Cloudflare R2" }`
- **Duration**: 1.2–2s.
- **Wrong choice when**: the name is a household one, or when it recurs — chip it
  the first time only.

---

## Not built yet

Specified so the intent survives, but **do not cast these**; `validate_plan.py`
rejects them. Building one means adding a component in `remotion/src/graphics/`,
registering it in `remotion/src/graphics/index.ts`, and adding it to the enum in
`scripts/plan.schema.json`.

- **contrast-pair** — two stacked halves, before and after, triggered by "but",
  "instead", "used to". Needs a wipe transition, which is the fiddly part.
- **annotation-pointer** — an arrow or ellipse drawn onto something visible in the
  frame. Needs a target coordinate, which means asking the model to point at pixels,
  which is the least reliable thing in this pipeline. Build last.
- **step-tracker** — a persistent 1-of-4 indicator across a how-to section.
- **quote-card** — a held card for a quoted line, longer than a keyword-pop.
- **media-inset** — a screenshot or b-roll clip inset in a corner. Needs an asset
  pipeline, since the user has to supply the image.
