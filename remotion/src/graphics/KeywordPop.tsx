import React from "react";
import { interpolate } from "remotion";
import { color, font, weight, typeScale, space, radius } from "../tokens";
import { useEntrance } from "../useEntrance";
import { entryOffset } from "../anchors";
import type { GraphicComponentProps } from "../types";

/**
 * One loaded word in a paper chip, with an orange line sweeping underneath.
 * The sweep is the point: it arrives a beat after the word and draws the eye
 * without a second colour or a second shape.
 */
export const KeywordPop: React.FC<GraphicComponentProps> = ({
  graphic, localFrame, durationInFrames, fps, videoHeight,
}) => {
  const { progress, opacity } = useEntrance(localFrame, durationInFrames, fps);
  const dir = entryOffset(graphic.anchor);
  const travel = videoHeight * 0.02;

  const sweep = interpolate(
    localFrame,
    [Math.round(fps * 0.18), Math.round(fps * 0.5)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        opacity,
        transform: `translate(${dir.x * travel * (1 - progress)}px, ${
          dir.y * travel * (1 - progress)
        }px) scale(${0.94 + progress * 0.06})`,
        background: color.paper,
        border: `1.5px solid ${color.ink}`,
        borderRadius: radius.card,
        padding: `${space(1.5)}px ${space(2.5)}px ${space(2)}px`,
      }}
    >
      <span
        style={{
          fontFamily: font.display,
          fontWeight: weight.bold,
          fontSize: videoHeight * typeScale.heading,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: color.ink,
          whiteSpace: "nowrap",
        }}
      >
        {graphic.props.text}
      </span>
      <div
        style={{
          height: Math.max(3, videoHeight * 0.005),
          marginTop: space(1),
          background: color.orange,
          borderRadius: radius.pill,
          transform: `scaleX(${sweep})`,
          transformOrigin: "left center",
        }}
      />
    </div>
  );
};
