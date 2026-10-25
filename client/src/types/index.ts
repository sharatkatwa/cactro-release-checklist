export type ReleaseStatus = 'PLANNED' | 'ONGOING' | 'DONE';

export interface Step {
  id: string;
  title: string;
  order: number;
}

export interface Release {
  id: string;
  name: string;
  date: string;
  status: ReleaseStatus;
  additionalInfo?: string | null;
  completedSteps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  name: string;
  date: string;
  additionalInfo?: string | null;
  completedSteps?: string[];
}

export interface UpdateReleaseInput {
  name?: string;
  date?: string;
  additionalInfo?: string | null;
  completedSteps?: string[];
}
