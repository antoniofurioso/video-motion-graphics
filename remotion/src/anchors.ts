import type { CSSProperties } from "react";
import type { Anchor } from "./types";
import { SAFE_INSET, BOTTOM_RESERVED } from "./tokens";

/**
 * Turn an anchor name into absolute positioning.
 *
 * The bottom row is lifted clear of the reserved band, because platform UI and
 * burned-in subtitles routinely eat the bottom eighth of a frame and a graphic
 * that is only visible in the editor is not a graphic.
 */
export const anchorStyle = (
  anchor: Anchor,
  width: number,
  height: number,
): CSSProperties => {
  const inset = Math.min(width, height) * SAFE_INSET;
  const bottomInset = inset + height * BOTTOM_RESERVED;

  const [row, col] = anchor === "center"
    ? ["mid", "center"]
    : anchor.split("-");

  const vertical: CSSProperties =
    row === "top" ? { top: inset }
      : row === "bottom" ? { bottom: bottomInset }
        : { top: "50%", transform: "translateY(-50%)" };

  const horizontal: CSSProperties =
    col === "left" ? { left: inset, alignItems: "flex-start" }
      : col === "right" ? { right: inset, alignItems: "flex-end" }
        : { left: 0, right: 0, alignItems: "center" };

  return {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    maxWidth: col === "center" ? "100%" : "46%",
    ...vertical,
    ...horizontal,
  };
};

/** Which way a graphic slides in from, so it never enters across the face. */
export const entryOffset = (anchor: Anchor): { x: number; y: number } => {
  if (anchor.endsWith("left")) return { x: -1, y: 0 };
  if (anchor.endsWith("right")) return { x: 1, y: 0 };
  if (anchor.startsWith("top")) return { x: 0, y: -1 };
  if (anchor.startsWith("bottom")) return { x: 0, y: 1 };
  return { x: 0, y: 0 };
};
