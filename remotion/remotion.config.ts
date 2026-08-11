import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Each frame composites a video decode plus the overlay, so going wider on
// concurrency tends to thrash rather than speed things up.
Config.setConcurrency(4);
