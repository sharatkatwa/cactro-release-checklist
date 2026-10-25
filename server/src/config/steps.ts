export interface StepDefinition {
  id: string;
  title: string;
  order: number;
}

export const RELEASE_STEPS: StepDefinition[] = [
  {
    id: "step-1",
    title: "All relevant GitHub pull requests have been merged",
    order: 1,
  },
  {
    id: "step-2",
    title: "CHANGELOG.md files have been updated",
    order: 2,
  },
  {
    id: "step-3",
    title: "All tests are passing",
    order: 3,
  },
  {
    id: "step-4",
    title: "Releases in Github created",
    order: 4,
  },
  {
    id: "step-5",
    title: "Deployed in demo",
    order: 5,
  },
  {
    id: "step-6",
    title: "Tested thoroughly in demo",
    order: 6,
  },
  {
    id: "step-7",
    title: "Deployed in production",
    order: 7,
  },
];

export const TOTAL_STEPS_COUNT = RELEASE_STEPS.length;
export const VALID_STEP_IDS = new Set(RELEASE_STEPS.map((s) => s.id));
