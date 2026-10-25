import { describe, it, expect } from "vitest";
import { ReleaseStatus } from "@prisma/client";
import { computeReleaseStatus } from "../src/utils/status.js";
import { RELEASE_STEPS, TOTAL_STEPS_COUNT } from "../src/config/steps.js";

describe("computeReleaseStatus", () => {
  const allStepIds = RELEASE_STEPS.map((s) => s.id);

  it("should return PLANNED when completedSteps is null or undefined", () => {
    expect(computeReleaseStatus(null)).toBe(ReleaseStatus.PLANNED);
    expect(computeReleaseStatus(undefined)).toBe(ReleaseStatus.PLANNED);
  });

  it("should return PLANNED when completedSteps is empty", () => {
    expect(computeReleaseStatus([])).toBe(ReleaseStatus.PLANNED);
  });

  it("should return PLANNED if completedSteps only contains non-existent step IDs", () => {
    expect(computeReleaseStatus(["non-existent-1", "fake-step"])).toBe(
      ReleaseStatus.PLANNED
    );
  });

  it("should return ONGOING when at least 1 valid step is completed", () => {
    expect(computeReleaseStatus(["step-1"])).toBe(ReleaseStatus.ONGOING);
  });

  it("should return ONGOING when multiple but not all steps are completed", () => {
    expect(computeReleaseStatus(["step-1", "step-2", "step-3"])).toBe(
      ReleaseStatus.ONGOING
    );
    expect(
      computeReleaseStatus(["step-1", "step-2", "step-3", "step-4", "step-5", "step-6"])
    ).toBe(ReleaseStatus.ONGOING);
  });

  it("should return ONGOING and deduplicate identical step IDs", () => {
    // 2 entries of the same step should count as 1 completed step, not 2
    expect(computeReleaseStatus(["step-1", "step-1"])).toBe(
      ReleaseStatus.ONGOING
    );
  });

  it("should return DONE when all 7 standard steps are completed", () => {
    expect(allStepIds.length).toBe(7);
    expect(allStepIds.length).toBe(TOTAL_STEPS_COUNT);
    expect(computeReleaseStatus(allStepIds)).toBe(ReleaseStatus.DONE);
  });

  it("should return DONE when all steps are completed even with duplicates or unknown IDs", () => {
    const listWithNoise = [...allStepIds, "step-1", "unknown-step-xyz"];
    expect(computeReleaseStatus(listWithNoise)).toBe(ReleaseStatus.DONE);
  });
});
