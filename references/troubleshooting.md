# Troubleshooting

## Transcription

**Words are timed wrong by a consistent offset.** Almost always a variable frame
rate recording — phone and screen-capture footage often is. Normalise it once and
work from the copy:

```bash
ffmpeg -i original.mp4 -vsync cfr -r 30 -c:v libx264 -crf 18 -c:a copy normalised.mp4
```

**Words are timed wrong at random.** Usually music, room noise or overlapping
speech. Re-run with `--model medium` and, if there is background music, isolate the
voice first. Do not paper over it by nudging timestamps by hand — one graphic fixed
by hand is fine, ten means the transcript is wrong and everything downstream will be
too.

**A word on screen is spelled wrong.** Whisper guesses at proper nouns, and the
error only becomes expensive when it is in 60pt type. Check the confidence field on
anything you plan to display; `transcribe.py` prints a count of low-confidence
words for exactly this reason. Fix the text in `plan.json`, not the transcript.

**Non-English.** Pass `--language it` (or the relevant code). Without it, whisper
detects the language from the first 30 seconds, which fails on videos that open in
one language and continue in another.

## Placement

**`analyze_video.py` reports no faces.** The Haar cascade only finds faces looking
roughly at the camera. Profile shots, low light, and anyone wearing a cap will come
back empty. When that happens the free-region map is unreliable — look at the
thumbnails yourself and place graphics from what you see.

**Everything is reported as occupied.** A tight head-and-shoulders crop genuinely
leaves nowhere safe. Either work with a wider section of the video, or accept
`bottom-center` overlaid on the chest, which is the one part of a person a graphic
can cover without looking careless.

**A graphic reads fine in the still but wrong in the video.** The still is one
frame; the speaker moves. Check the stills at both the start and end of a long
graphic, not just the midpoint.

## Rendering

**The render is against the wrong file.** Stills and overlay clips are rendered
against `work/proxy.mp4`; the final composite is against the original named in
`plan.source`. If a still looks lower quality than the output, that is why and it is
correct.

**ProRes clips are enormous.** ProRes 4444 is roughly 1 GB per minute at 1080p. That
is fine because only the graphic windows are rendered — a few seconds each. If
`work/clips/` is genuinely large, the plan has too many graphics or they are too
long, which is a problem worth having caught anyway.

**No alpha in the composite (graphics have black boxes around them).** The overlay
clips were not rendered with an alpha-capable pixel format. Confirm with
`ffprobe -show_streams work/clips/g1.mov | grep pix_fmt` — it should be
`yuva444p10le`. If it is `yuv422p10le`, the `--prores-profile=4444` flag was lost.

**Audio drifts out of sync.** The composite uses `-c:a copy` and never touches
timing, so drift means the source itself has variable frame rate. Normalise it as
above and start from the normalised copy.

**`public/plan.json is missing`.** Something called Remotion directly. Go through
`scripts/render.sh`, which links the source video and copies the plan into place.

**Fonts fall back to something generic.** Remotion is fetching Space Grotesk and
Inter from Google Fonts at render time, so a render on a machine without network
access will silently use system faces. Check the first still before doing a full
render. To render offline, download both families into `remotion/public/fonts/` and
swap the `@remotion/google-fonts` imports in `Video.tsx` for local `@font-face`
declarations.

**The render is very slow.** Expect roughly real-time to 2x real-time on a laptop.
If it is much worse: lower `Config.setConcurrency` (contention, not parallelism, is
usually the problem), render a section first with `--frames=0-900`, and check that
the source is not 4K when the output only needs to be 1080p.

**The output looks washed out compared to the source.** The source is probably in a
wide colour space or HDR. Convert to standard range before working on it:

```bash
ffmpeg -i original.mov -vf "zscale=t=linear:npl=100,format=gbrpf32le,\
zscale=p=bt709,tonemap=hable,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" \
-c:v libx264 -crf 18 -c:a copy sdr.mp4
```

**Audio is missing from the output.** `OffthreadVideo` carries the source audio by
default, so silence means the source has no audio track — check `probe.py`.

## Design changes

**A new look.** Change `remotion/src/tokens.ts` and the component styling. Never
change the timing logic in `useEntrance.ts` or the anchor maths — those are the
parts that took the longest to get right and have nothing to do with how it looks.

**A new template.** Three places, all of them required:

1. `remotion/src/graphics/YourTemplate.tsx` — the component.
2. `remotion/src/graphics/index.ts` — the registry entry.
3. `scripts/plan.schema.json` and the `BUILT` / `DURATION_MS` / `REQUIRED_PROPS`
   maps in `scripts/validate_plan.py`.

Then document it in `graphics-library.md`, including when it is the wrong choice —
that section is what stops it from being cast into every video.
