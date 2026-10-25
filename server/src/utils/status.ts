import { ReleaseStatus } from "@prisma/client";
import { TOTAL_STEPS_COUNT, VALID_STEP_IDS } from "../config/steps.js";

/**
 * Computes release status based on completed steps count:
 * - No step completed: PLANNED
 * - At least one step completed (but not all): ONGOING
 * - All steps completed: DONE
 */
export function computeReleaseStatus(
  completedSteps: string[] | null | undefined,
  totalCount: number = TOTAL_STEPS_COUNT
): ReleaseStatus {
  if (!completedSteps || completedSteps.length === 0) {
    return ReleaseStatus.PLANNED;
  }

  // Deduplicate and filter to valid steps
  const validCompleted = new Set(
    completedSteps.filter((id) => VALID_STEP_IDS.has(id))
  );

  if (validCompleted.size === 0) {
    return ReleaseStatus.PLANNED;
  }

  if (validCompleted.size >= totalCount) {
    return ReleaseStatus.DONE;
  }

  return ReleaseStatus.ONGOING;
}
