export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TimeLog {
  id: string;
  durationMinutes: number;
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
}

export interface TaskDependency {
  dependsOnTask: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

export interface DependentOnMe {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

export interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimatedMinutes: number;
  projectId?: string | null;
  parentTaskId?: string | null;
  project?: {
    id: string;
    title: string;
    status: string;
  } | null;
  subTasks?: SubTask[];
  dependencies?: TaskDependency[];
  dependentOnMe?: DependentOnMe[];
  timeLogs?: TimeLog[];
  totalLoggedMinutes?: number;
  isOverdue?: boolean;
  isBlockedByDeps?: boolean;
  timeVarianceMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId?: string;
  parentTaskId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  dependencyTaskIds?: string[];
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  tasksCreated: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number;
  totalEstimatedMinutes: number;
  totalLoggedMinutes: number;
  timeVarianceMinutes: number;
}
