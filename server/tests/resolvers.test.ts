import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvers } from "../src/schema/resolvers.js";
import { RELEASE_STEPS } from "../src/config/steps.js";
import { ReleaseStatus } from "@prisma/client";

// Mock the prisma client module
vi.mock("../src/db.js", () => {
  return {
    prisma: {
      release: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { prisma } from "../src/db.js";

describe("GraphQL Resolvers", () => {
  const allStepIds = RELEASE_STEPS.map((s) => s.id);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Query.steps", () => {
    it("should return all 7 predefined steps in correct order", () => {
      const result = resolvers.Query.steps();
      expect(result).toHaveLength(7);
      expect(result[0].id).toBe("step-1");
      expect(result[0].title).toBe("All relevant GitHub pull requests have been merged");
      expect(result[6].id).toBe("step-7");
      expect(result[6].title).toBe("Deployed in production");
    });
  });

  describe("Query.releases", () => {
    it("should return releases with properly formatted ISO date strings", async () => {
      const mockDbReleases = [
        {
          id: "rel-1",
          name: "Version 1.0.1",
          date: new Date("2022-09-20T00:00:00.000Z"),
          status: ReleaseStatus.DONE,
          additionalInfo: "First production release",
          completedSteps: allStepIds,
          createdAt: new Date("2022-09-20T10:00:00.000Z"),
          updatedAt: new Date("2022-09-20T10:00:00.000Z"),
        },
      ];

      (prisma.release.findMany as any).mockResolvedValue(mockDbReleases);

      const result = await resolvers.Query.releases();
      expect(prisma.release.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("rel-1");
      expect(result[0].date).toBe("2022-09-20T00:00:00.000Z");
      expect(result[0].status).toBe(ReleaseStatus.DONE);
    });
  });

  describe("Query.release", () => {
    it("should return single release if found", async () => {
      const mockRecord = {
        id: "rel-123",
        name: "Version 1.1.0",
        date: new Date("2022-10-10T00:00:00.000Z"),
        status: ReleaseStatus.ONGOING,
        additionalInfo: "Notes",
        completedSteps: ["step-1"],
        createdAt: new Date("2022-10-10T00:00:00.000Z"),
        updatedAt: new Date("2022-10-10T00:00:00.000Z"),
      };

      (prisma.release.findUnique as any).mockResolvedValue(mockRecord);

      const result = await resolvers.Query.release({}, { id: "rel-123" });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("rel-123");
      expect(result?.status).toBe(ReleaseStatus.ONGOING);
    });

    it("should return null if release is not found", async () => {
      (prisma.release.findUnique as any).mockResolvedValue(null);

      const result = await resolvers.Query.release({}, { id: "unknown" });
      expect(result).toBeNull();
    });
  });

  describe("Mutation.createRelease", () => {
    it("should create release and auto-compute status to PLANNED when no steps completed", async () => {
      const input = {
        name: "Version 2.0.0",
        date: "2023-01-01T00:00:00.000Z",
        additionalInfo: "Next major version",
        completedSteps: [],
      };

      (prisma.release.create as any).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: "new-id",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await resolvers.Mutation.createRelease({}, { input });
      expect(prisma.release.create).toHaveBeenCalledWith({
        data: {
          name: "Version 2.0.0",
          date: new Date("2023-01-01T00:00:00.000Z"),
          status: ReleaseStatus.PLANNED,
          additionalInfo: "Next major version",
          completedSteps: [],
        },
      });
      expect(result.status).toBe(ReleaseStatus.PLANNED);
    });

    it("should auto-compute status to DONE when all steps are completed at creation", async () => {
      const input = {
        name: "Version 1.0.0",
        date: "2022-09-01T00:00:00.000Z",
        completedSteps: allStepIds,
      };

      (prisma.release.create as any).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: "done-id",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await resolvers.Mutation.createRelease({}, { input });
      expect(result.status).toBe(ReleaseStatus.DONE);
    });

    it("should throw error if name is empty or whitespace", async () => {
      await expect(
        resolvers.Mutation.createRelease(
          {},
          { input: { name: "   ", date: "2023-01-01" } }
        )
      ).rejects.toThrow("Release name is mandatory and cannot be empty.");
    });

    it("should throw error if date is invalid", async () => {
      await expect(
        resolvers.Mutation.createRelease(
          {},
          { input: { name: "Version 1.0.0", date: "invalid-date-xyz" } }
        )
      ).rejects.toThrow("Invalid date provided.");
    });
  });

  describe("Mutation.toggleStep", () => {
    it("should add step and transition status from PLANNED to ONGOING", async () => {
      const existing = {
        id: "rel-1",
        name: "Test Release",
        date: new Date(),
        status: ReleaseStatus.PLANNED,
        additionalInfo: null,
        completedSteps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.release.findUnique as any).mockResolvedValue(existing);
      (prisma.release.update as any).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...existing,
          ...data,
        });
      });

      const result = await resolvers.Mutation.toggleStep(
        {},
        { id: "rel-1", stepId: "step-1", completed: true }
      );

      expect(prisma.release.update).toHaveBeenCalledWith({
        where: { id: "rel-1" },
        data: {
          completedSteps: ["step-1"],
          status: ReleaseStatus.ONGOING,
        },
      });
      expect(result.status).toBe(ReleaseStatus.ONGOING);
      expect(result.completedSteps).toContain("step-1");
    });

    it("should transition status to DONE when the final 7th step is toggled on", async () => {
      const existing = {
        id: "rel-1",
        name: "Test Release",
        date: new Date(),
        status: ReleaseStatus.ONGOING,
        additionalInfo: null,
        completedSteps: [
          "step-1",
          "step-2",
          "step-3",
          "step-4",
          "step-5",
          "step-6",
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.release.findUnique as any).mockResolvedValue(existing);
      (prisma.release.update as any).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...existing,
          ...data,
        });
      });

      const result = await resolvers.Mutation.toggleStep(
        {},
        { id: "rel-1", stepId: "step-7", completed: true }
      );

      expect(result.status).toBe(ReleaseStatus.DONE);
      expect(result.completedSteps).toHaveLength(7);
    });

    it("should remove step and transition status from DONE to ONGOING when toggled off", async () => {
      const existing = {
        id: "rel-1",
        name: "Test Release",
        date: new Date(),
        status: ReleaseStatus.DONE,
        additionalInfo: null,
        completedSteps: allStepIds,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.release.findUnique as any).mockResolvedValue(existing);
      (prisma.release.update as any).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...existing,
          ...data,
        });
      });

      const result = await resolvers.Mutation.toggleStep(
        {},
        { id: "rel-1", stepId: "step-7", completed: false }
      );

      expect(result.status).toBe(ReleaseStatus.ONGOING);
      expect(result.completedSteps).not.toContain("step-7");
    });

    it("should throw error if release to toggle is not found", async () => {
      (prisma.release.findUnique as any).mockResolvedValue(null);

      await expect(
        resolvers.Mutation.toggleStep(
          {},
          { id: "missing-id", stepId: "step-1", completed: true }
        )
      ).rejects.toThrow('Release with ID "missing-id" was not found.');
    });
  });

  describe("Mutation.updateRelease", () => {
    it("should update name, notes, and recompute status when steps updated", async () => {
      const existing = {
        id: "rel-1",
        name: "Old Name",
        date: new Date("2022-09-01"),
        status: ReleaseStatus.PLANNED,
        additionalInfo: "Old notes",
        completedSteps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.release.findUnique as any).mockResolvedValue(existing);
      (prisma.release.update as any).mockImplementation(({ data }: any) => {
        return Promise.resolve({
          ...existing,
          ...data,
        });
      });

      const result = await resolvers.Mutation.updateRelease(
        {},
        {
          id: "rel-1",
          input: {
            name: "New Name",
            additionalInfo: "New notes",
            completedSteps: ["step-1", "step-2"],
          },
        }
      );

      expect(result.name).toBe("New Name");
      expect(result.additionalInfo).toBe("New notes");
      expect(result.status).toBe(ReleaseStatus.ONGOING);
    });
  });

  describe("Mutation.deleteRelease", () => {
    it("should delete existing release and return true", async () => {
      (prisma.release.findUnique as any).mockResolvedValue({ id: "rel-1" });
      (prisma.release.delete as any).mockResolvedValue({ id: "rel-1" });

      const result = await resolvers.Mutation.deleteRelease(
        {},
        { id: "rel-1" }
      );
      expect(prisma.release.delete).toHaveBeenCalledWith({
        where: { id: "rel-1" },
      });
      expect(result).toBe(true);
    });

    it("should throw error if deleting non-existent release", async () => {
      (prisma.release.findUnique as any).mockResolvedValue(null);

      await expect(
        resolvers.Mutation.deleteRelease({}, { id: "missing-id" })
      ).rejects.toThrow('Release with ID "missing-id" was not found.');
    });
  });
});
