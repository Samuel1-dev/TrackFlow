export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectStats {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  progressPercent: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  status: ProjectStatus;
  stats?: ProjectStats;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | null;
    estimatedMinutes: number;
    completedAt?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status?: ProjectStatus;
}
