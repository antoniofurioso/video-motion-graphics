import React from "react";
import { interpolate } from "remotion";
import { color, font, weight, typeScale, space } from "../tokens";
import { useEntrance } from "../useEntrance";
import type { GraphicComponentProps } from "../types";

/**
 * A full-width band marking a structural break. The only template allowed to sit
 * in the centre of the frame, which is why it must be brief — it is covering a
 * face for as long as it is on screen.
 */
export const ChapterCard: React.FC<GraphicComponentProps> = ({
  graphic, localFrame, durationInFrames, fps, videoHeight,
}) => {
  const { opacity } = useEntrance(localFrame, durationInFrames, fps);
  const wipe = interpolate(localFrame, [0, Math.round(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        width: "100%",
        background: color.inkDeep,
        padding: `${space(3)}px ${space(6)}px`,
        display: "flex",
        alignItems: "baseline",
        gap: space(3),
        clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
      }}
    >
      {typeof graphic.props.index === "number" ? (
        <span
          style={{
            fontFamily: font.display,
            fontWeight: weight.bold,
            fontSize: videoHeight * typeScale.title,
            color: color.orange,
            letterSpacing: "-0.03em",
          }}
        >
          {String(graphic.props.index).padStart(2, "0")}
        </span>
      ) : null}
      <span
        style={{
          fontFamily: font.display,
          fontWeight: weight.medium,
          fontSize: videoHeight * typeScale.heading,
          letterSpacing: "-0.02em",
          color: color.paperOnInk,
        }}
      >
        {graphic.props.title}
      </span>
    </div>
  );
};
