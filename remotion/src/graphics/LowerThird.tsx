import React from "react";
import { interpolate } from "remotion";
import { color, font, weight, typeScale, space, radius } from "../tokens";
import { useEntrance } from "../useEntrance";
import type { GraphicComponentProps } from "../types";

/**
 * Name and role, sliding in from the edge. Once per person, ever — a repeated
 * lower-third is the clearest tell that nobody watched the edit.
 */
export const LowerThird: React.FC<GraphicComponentProps> = ({
  graphic, localFrame, durationInFrames, fps, videoHeight,
}) => {
  const { progress, opacity } = useEntrance(localFrame, durationInFrames, fps);
  const rule = interpolate(localFrame, [0, Math.round(fps * 0.35)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${(1 - progress) * -videoHeight * 0.03}px)`,
        display: "flex",
        alignItems: "stretch",
        gap: space(2),
      }}
    >
      <div
        style={{
          width: Math.max(4, videoHeight * 0.006),
          background: color.orange,
          borderRadius: radius.pill,
          transform: `scaleY(${rule})`,
          transformOrigin: "top center",
        }}
      />
      <div
        style={{
          background: color.paper,
          border: `1.5px solid ${color.ink}`,
          borderRadius: radius.card,
          padding: `${space(1.5)}px ${space(2.5)}px`,
          display: "flex",
          flexDirection: "column",
          gap: space(0.5),
        }}
      >
        <span
          style={{
            fontFamily: font.display,
            fontWeight: weight.bold,
            fontSize: videoHeight * typeScale.heading,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: color.ink,
            whiteSpace: "nowrap",
          }}
        >
          {graphic.props.name}
        </span>
        {graphic.props.role ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: weight.regular,
              fontSize: videoHeight * typeScale.label,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: color.muted,
              whiteSpace: "nowrap",
            }}
          >
            {graphic.props.role}
          </span>
        ) : null}
      </div>
    </div>
  );
};
