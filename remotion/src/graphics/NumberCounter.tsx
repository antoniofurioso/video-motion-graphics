import React from "react";
import { interpolate, Easing } from "remotion";
import { color, font, weight, typeScale, space, radius } from "../tokens";
import { useEntrance } from "../useEntrance";
import { entryOffset } from "../anchors";
import type { GraphicComponentProps } from "../types";

/**
 * A figure that counts up to its value with a label underneath.
 *
 * The count eases out rather than running linear, so it settles on the number
 * instead of stopping at it — and it finishes early in the graphic's life, so the
 * viewer gets to read the final value rather than watching it spin and leave.
 */
export const NumberCounter: React.FC<GraphicComponentProps> = ({
  graphic, localFrame, durationInFrames, fps, videoHeight,
}) => {
  const { progress, opacity } = useEntrance(localFrame, durationInFrames, fps);
  const dir = entryOffset(graphic.anchor);
  const travel = videoHeight * 0.02;

  const { value = 0, prefix = "", suffix = "", label = "" } = graphic.props;

  const countFrames = Math.min(Math.round(fps * 0.9), durationInFrames * 0.55);
  const counted = interpolate(localFrame, [0, countFrames], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const decimals = Number.isInteger(value) ? 0 : 1;
  const shown = counted.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div
      style={{
        opacity,
        transform: `translate(${dir.x * travel * (1 - progress)}px, ${
          dir.y * travel * (1 - progress)
        }px)`,
        background: color.paper,
        border: `1.5px solid ${color.ink}`,
        borderRadius: radius.panel,
        padding: `${space(2)}px ${space(3)}px ${space(2.5)}px`,
        display: "flex",
        flexDirection: "column",
        gap: space(0.5),
      }}
    >
      <div
        style={{
          fontFamily: font.display,
          fontWeight: weight.bold,
          fontSize: videoHeight * typeScale.display,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: color.ink,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {prefix}
        {shown}
        <span style={{ color: color.orange }}>{suffix}</span>
      </div>
      <div
        style={{
          fontFamily: font.body,
          fontWeight: weight.medium,
          fontSize: videoHeight * typeScale.label,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: color.muted,
        }}
      >
        {label}
      </div>
    </div>
  );
};
