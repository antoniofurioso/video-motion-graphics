/**
 * The single file to change when the look changes.
 *
 * These values mirror the `branded-infographics` design system so that a video
 * and an infographic on the same subject read as siblings. Nothing else in this
 * project should contain a hex value, a font name, or a duration — if a component
 * needs one, it belongs here.
 */

export const color = {
  paper: "#FBF9F6",
  paperQuiet: "#F3EFE9",
  sand: "#EAE4DB",

  ink: "#121212",
  inkDeep: "#0D0D0D",
  muted: "#7A736B",
  paperOnInk: "#F5F5F5",

  // Orange highlights. It never fills a large area and never carries body text.
  orange: "#FF7701",
  orangeTint: "#FFEBD8",
  orangeLine: "#C25400",
} as const;

export const font = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
} as const;

export const weight = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
} as const;

/**
 * Type sizes are expressed as a share of video height, not pixels, so the same
 * plan renders correctly at 1080p and 4K without a second set of numbers.
 */
export const typeScale = {
  display: 0.075,
  title: 0.052,
  heading: 0.038,
  section: 0.028,
  body: 0.022,
  label: 0.017,
} as const;

export const space = (n: number) => n * 8;

export const radius = {
  chip: 8,
  card: 12,
  panel: 16,
  pill: 999,
} as const;

export const border = {
  hairline: `1.5px solid ${color.ink}`,
  soft: "1.5px solid rgba(18, 18, 18, 0.28)",
} as const;

/**
 * One motion signature for every template. Mixed easing across templates is the
 * thing that makes a video feel assembled out of stock parts.
 */
export const motion = {
  springIn: { damping: 200, stiffness: 180, mass: 0.6 },
  fadeOutFrames: 6,
  staggerFrames: 4,
} as const;

/** Safety inset from the frame edge, as a share of the shorter side. */
export const SAFE_INSET = 0.045;

/** Platform chrome and burned-in subtitles usually live here. */
export const BOTTOM_RESERVED = 0.12;
