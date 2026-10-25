import { prisma } from "../db.js";
import { RELEASE_STEPS } from "../config/steps.js";
import { computeReleaseStatus } from "../utils/status.js";

interface CreateReleaseInput {
  name: string;
  date: string;
  additionalInfo?: string | null;
  completedSteps?: string[] | null;
}

interface UpdateReleaseInput {
  name?: string;
  date?: string;
  additionalInfo?: string | null;
  completedSteps?: string[] | null;
}

function formatRelease(release: any) {
  return {
    ...release,
    date: release.date instanceof Date ? release.date.toISOString() : release.date,
    createdAt: release.createdAt instanceof Date ? release.createdAt.toISOString() : release.createdAt,
    updatedAt: release.updatedAt instanceof Date ? release.updatedAt.toISOString() : release.updatedAt,
  };
}

export const resolvers = {
  Query: {
    releases: async () => {
      const records = await prisma.release.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
      return records.map(formatRelease);
    },

    release: async (_: unknown, { id }: { id: string }) => {
      const record = await prisma.release.findUnique({
        where: { id },
      });
      if (!record) return null;
      return formatRelease(record);
    },

    steps: () => {
      return RELEASE_STEPS;
    },
  },

  Mutation: {
    createRelease: async (
      _: unknown,
      { input }: { input: CreateReleaseInput }
    ) => {
      const trimmedName = input.name?.trim();
      if (!trimmedName) {
        throw new Error("Release name is mandatory and cannot be empty.");
      }

      const parsedDate = new Date(input.date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date provided.");
      }

      const completedSteps = input.completedSteps || [];
      const status = computeReleaseStatus(completedSteps);

      const created = await prisma.release.create({
        data: {
          name: trimmedName,
          date: parsedDate,
          status,
          additionalInfo: input.additionalInfo?.trim() || null,
          completedSteps,
        },
      });

      return formatRelease(created);
    },

    updateRelease: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateReleaseInput }
    ) => {
      const existing = await prisma.release.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Release with ID "${id}" was not found.`);
      }

      const updateData: any = {};

      if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (!trimmed) {
          throw new Error("Release name cannot be empty.");
        }
        updateData.name = trimmed;
      }

      if (input.date !== undefined) {
        const parsedDate = new Date(input.date);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date provided.");
        }
        updateData.date = parsedDate;
      }

      if (input.additionalInfo !== undefined) {
        updateData.additionalInfo = input.additionalInfo?.trim() || null;
      }

      if (input.completedSteps !== undefined && input.completedSteps !== null) {
        updateData.completedSteps = input.completedSteps;
        updateData.status = computeReleaseStatus(input.completedSteps);
      }

      const updated = await prisma.release.update({
        where: { id },
        data: updateData,
      });

      return formatRelease(updated);
    },

    toggleStep: async (
      _: unknown,
      {
        id,
        stepId,
        completed,
      }: { id: string; stepId: string; completed: Boolean }
    ) => {
      const existing = await prisma.release.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Release with ID "${id}" was not found.`);
      }

      const currentSteps = new Set(existing.completedSteps || []);
      if (completed) {
        currentSteps.add(stepId);
      } else {
        currentSteps.delete(stepId);
      }

      const newStepsList = Array.from(currentSteps);
      const newStatus = computeReleaseStatus(newStepsList);

      const updated = await prisma.release.update({
        where: { id },
        data: {
          completedSteps: newStepsList,
          status: newStatus,
        },
      });

      return formatRelease(updated);
    },

    deleteRelease: async (_: unknown, { id }: { id: string }) => {
      const existing = await prisma.release.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Release with ID "${id}" was not found.`);
      }

      await prisma.release.delete({ where: { id } });
      return true;
    },
  },
};
