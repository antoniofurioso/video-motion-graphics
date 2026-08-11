import { KeywordPop } from "./KeywordPop";
import { NumberCounter } from "./NumberCounter";
import { ListBuilder } from "./ListBuilder";
import { LowerThird } from "./LowerThird";
import { ChapterCard } from "./ChapterCard";
import { ToolChip } from "./ToolChip";
import type { GraphicComponentProps, TemplateId } from "../types";
import type { FC } from "react";

/**
 * The registry. Adding a template means adding it here, adding it to the enum in
 * scripts/plan.schema.json, and documenting it in references/graphics-library.md.
 * Miss any of the three and the plan will either fail validation or render blank.
 */
export const REGISTRY: Record<TemplateId, FC<GraphicComponentProps>> = {
  "keyword-pop": KeywordPop,
  "number-counter": NumberCounter,
  "list-builder": ListBuilder,
  "lower-third": LowerThird,
  "chapter-card": ChapterCard,
  "tool-chip": ToolChip,
};
