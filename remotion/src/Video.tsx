import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { REGISTRY } from "./graphics";
import { anchorStyle } from "./anchors";
import type { Plan, RenderMode } from "./types";

loadDisplay();
loadBody();

const msToFrames = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

/**
 * Two modes, one composition.
 *
 * `preview` draws the source video underneath, which is what you need when
 * checking whether a graphic covers a face. `overlay` renders the graphics alone
 * on transparency, so ffmpeg can composite them onto the original without
 * re-encoding its audio or touching frames that have no graphic on them.
 */
export const Video: React.FC<{ plan: Plan; mode?: RenderMode }> = ({
  plan,
  mode = "preview",
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{ backgroundColor: mode === "overlay" ? "transparent" : "black" }}
    >
      {mode === "preview" ? (
        <OffthreadVideo src={staticFile("proxy.mp4")} />
      ) : null}

      {plan.graphics.map((graphic) => {
        const from = msToFrames(graphic.startMs, fps);
        const durationInFrames = Math.max(
          1,
          msToFrames(graphic.endMs, fps) - from,
        );
        const Component = REGISTRY[graphic.template];

        if (!Component) {
          // A plan referencing an unbuilt template should be loud, not silent.
          throw new Error(
            `Unknown template "${graphic.template}" on graphic ${graphic.id}. ` +
            `Built templates: ${Object.keys(REGISTRY).join(", ")}`,
          );
        }

        return (
          <Sequence
            key={graphic.id}
            from={from}
            durationInFrames={durationInFrames}
            name={`${graphic.id} · ${graphic.template}`}
            layout="none"
          >
            <div style={anchorStyle(graphic.anchor, width, height)}>
              <Component
                graphic={graphic}
                localFrame={frame - from}
                durationInFrames={durationInFrames}
                fps={fps}
                videoHeight={height}
              />
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
