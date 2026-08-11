import React from "react";
import { color, font, weight, typeScale, space, radius } from "../tokens";
import { useEntrance } from "../useEntrance";
import { entryOffset } from "../anchors";
import type { GraphicComponentProps } from "../types";

/**
 * A quiet chip naming a tool or product, so the viewer catches the spelling.
 * Deliberately the smallest thing in the library — it is a footnote, not a point.
 */
export const ToolChip: React.FC<GraphicComponentProps> = ({
  graphic, localFrame, durationInFrames, fps, videoHeight,
}) => {
  const { progress, opacity } = useEntrance(localFrame, durationInFrames, fps);
  const dir = entryOffset(graphic.anchor);
  const travel = videoHeight * 0.015;

  return (
    <div
      style={{
        opacity,
        transform: `translate(${dir.x * travel * (1 - progress)}px, ${
          dir.y * travel * (1 - progress)
        }px)`,
        background: color.orangeTint,
        border: `1.5px solid ${color.orangeLine}`,
        borderRadius: radius.pill,
        padding: `${space(1)}px ${space(2)}px`,
        display: "flex",
        alignItems: "center",
        gap: space(1),
      }}
    >
      <div
        style={{
          width: videoHeight * 0.008,
          height: videoHeight * 0.008,
          borderRadius: radius.pill,
          background: color.orange,
        }}
      />
      <span
        style={{
          fontFamily: font.body,
          fontWeight: weight.medium,
          fontSize: videoHeight * typeScale.body,
          letterSpacing: "0.01em",
          color: color.orangeLine,
          whiteSpace: "nowrap",
        }}
      >
        {graphic.props.text}
      </span>
    </div>
  );
};
