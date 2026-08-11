export type RenderMode = "preview" | "overlay";

export type Anchor =
  | "top-left" | "top-center" | "top-right"
  | "mid-left" | "center" | "mid-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type TemplateId =
  | "keyword-pop"
  | "number-counter"
  | "list-builder"
  | "lower-third"
  | "chapter-card"
  | "tool-chip";

export type ListItem = { text: string; atMs: number };

export type GraphicProps = {
  text?: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  items?: ListItem[];
  name?: string;
  role?: string;
  index?: number;
  title?: string;
};

export type Graphic = {
  id: string;
  template: TemplateId;
  startMs: number;
  endMs: number;
  anchor: Anchor;
  anchorWordMs?: number;
  note?: string;
  props: GraphicProps;
};

export type Plan = {
  source: string;
  fps: number;
  width: number;
  height: number;
  /** Full duration of the source video, so the render covers all of it. */
  durationMs: number;
  graphics: Graphic[];
};

/** Every graphic component receives exactly this. */
export type GraphicComponentProps = {
  graphic: Graphic;
  /** Frames elapsed since this graphic entered. */
  localFrame: number;
  /** Total frames this graphic is on screen. */
  durationInFrames: number;
  fps: number;
  videoHeight: number;
};
