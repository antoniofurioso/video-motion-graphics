import React from "react";
import { Composition, staticFile } from "remotion";
import { Video } from "./Video";
import type { Plan } from "./types";

/**
 * Dimensions, fps and duration all come from plan.json rather than being hard
 * coded, so the same project renders a 9:16 phone recording and a 16:9 stage talk
 * without anyone editing this file.
 */
const EMPTY_PLAN: Plan = {
  source: "",
  fps: 30,
  width: 1920,
  height: 1080,
  durationMs: 1000,
  graphics: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Video"
      component={Video}
      defaultProps={{ plan: EMPTY_PLAN, mode: "preview" as const }}
      durationInFrames={30}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={async ({ props }) => {
        const response = await fetch(staticFile("plan.json"));
        if (!response.ok) {
          throw new Error(
            "public/plan.json is missing. Run scripts/render.sh, which copies " +
            "the plan into place, rather than calling remotion directly.",
          );
        }
        const plan = (await response.json()) as Plan;

        const lastGraphic = plan.graphics.reduce(
          (max, g) => Math.max(max, g.endMs),
          0,
        );
        const durationMs = plan.durationMs || lastGraphic + 2000;

        return {
          props: { ...props, plan },
          durationInFrames: Math.max(
            1,
            Math.round((durationMs / 1000) * plan.fps),
          ),
          fps: plan.fps,
          width: plan.width,
          height: plan.height,
        };
      }}
    />
  );
};
