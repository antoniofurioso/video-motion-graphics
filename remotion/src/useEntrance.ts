import { spring, interpolate } from "remotion";
import { motion } from "./tokens";

/**
 * The one motion signature every template shares: spring in, hold, fade out.
 *
 * Returns `progress` (0 to 1, springy) for entrance transforms and `opacity`
 * which handles both the fade in and the tail fade. Keeping this in one place is
 * what stops six templates from developing six personalities.
 */
export const useEntrance = (
  localFrame: number,
  durationInFrames: number,
  fps: number,
  delayFrames = 0,
) => {
  const progress = spring({
    frame: localFrame - delayFrames,
    fps,
    config: motion.springIn,
    durationInFrames: Math.round(fps * 0.5),
  });

  const framesLeft = durationInFrames - localFrame;
  const exit = interpolate(framesLeft, [0, motion.fadeOutFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const enter = interpolate(
    localFrame - delayFrames,
    [0, Math.round(fps * 0.2)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return { progress, opacity: Math.min(enter, exit) };
};
