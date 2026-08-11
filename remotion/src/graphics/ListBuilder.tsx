import React from "react";
import { color, font, weight, typeScale, space, radius } from "../tokens";
import { useEntrance } from "../useEntrance";
import type { GraphicComponentProps } from "../types";

/**
 * Rows that appear one at a time, each timed to the moment its item is spoken.
 *
 * Every row carries its own absolute timestamp rather than a fixed stagger,
 * because a speaker never lists things at an even pace and a mechanical stagger
 * is instantly readable as automated.
 */
export const ListBuilder: React.FC<GraphicComponentProps> = ({
  graphic, localFrame, durationInFrames, fps, videoHeight,
}) => {
  const { opacity } = useEntrance(localFrame, durationInFrames, fps);
  const items = graphic.props.items ?? [];

  return (
    <div
      style={{
        opacity,
        background: color.paper,
        border: `1.5px solid ${color.ink}`,
        borderRadius: radius.panel,
        padding: space(2),
        display: "flex",
        flexDirection: "column",
        gap: space(1.5),
        minWidth: videoHeight * 0.45,
      }}
    >
      {items.map((item, i) => {
        const enterFrame = Math.round(
          ((item.atMs - graphic.startMs) / 1000) * fps,
        );
        const since = localFrame - enterFrame;
        const visible = Math.max(0, Math.min(1, since / (fps * 0.25)));

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: space(1.5),
              opacity: visible,
              transform: `translateX(${(1 - visible) * -videoHeight * 0.012}px)`,
            }}
          >
            <div
              style={{
                width: videoHeight * typeScale.section * 1.5,
                height: videoHeight * typeScale.section * 1.5,
                flexShrink: 0,
                borderRadius: radius.chip,
                background: i === 0 ? color.orange : color.orangeTint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: font.display,
                fontWeight: weight.bold,
                fontSize: videoHeight * typeScale.label,
                color: i === 0 ? color.paper : color.orangeLine,
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                fontFamily: font.body,
                fontWeight: weight.medium,
                fontSize: videoHeight * typeScale.section,
                lineHeight: 1.25,
                color: color.ink,
              }}
            >
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};
