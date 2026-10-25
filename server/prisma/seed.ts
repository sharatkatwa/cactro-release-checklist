import { PrismaClient, ReleaseStatus } from "@prisma/client";
import { RELEASE_STEPS } from "../src/config/steps.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial release data...");

  // Clear existing releases
  await prisma.release.deleteMany({});

  const allStepIds = RELEASE_STEPS.map((s) => s.id);

  const sampleReleases = [
    {
      name: "Version 1.0.1",
      date: new Date("2022-09-20T00:00:00.000Z"),
      status: ReleaseStatus.DONE,
      additionalInfo: "First public production release with core checklist features.",
      completedSteps: allStepIds,
    },
    {
      name: "Version 1.0.2",
      date: new Date("2022-09-28T00:00:00.000Z"),
      status: ReleaseStatus.DONE,
      additionalInfo: "Minor bug fixes for step verification and responsive UI tweaks.",
      completedSteps: allStepIds,
    },
    {
      name: "Version 1.1.0",
      date: new Date("2022-10-10T00:00:00.000Z"),
      status: ReleaseStatus.ONGOING,
      additionalInfo: "Includes performance optimizations, audit log improvements, and enhanced checklist items.",
      completedSteps: ["step-1", "step-2", "step-3"],
    },
    {
      name: "Version 2 (beta)",
      date: new Date("2022-11-01T00:00:00.000Z"),
      status: ReleaseStatus.PLANNED,
      additionalInfo: "Major version 2 beta release introducing workflow automations.",
      completedSteps: [],
    },
  ];

  for (const release of sampleReleases) {
    const created = await prisma.release.create({ data: release });
    console.log(`Created release: ${created.name} (${created.status})`);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
