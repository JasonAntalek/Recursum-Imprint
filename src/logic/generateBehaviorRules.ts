import type { ImprintRoom } from "../types/imprint";

export function generateBehaviorRules(room: ImprintRoom): string[] {
  return [
    `Hold focus on ${room.title}.`,
    "Use local state only.",
    "Stop at the Initial Imprint calibration shell.",
  ];
}
