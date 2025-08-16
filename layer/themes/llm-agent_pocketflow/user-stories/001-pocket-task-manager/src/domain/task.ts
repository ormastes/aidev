export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

export type TaskStatus = Task['status'];

export const VALID_STATUSES: readonly TaskStatus[] = ['pending', 'in_progress', 'completed'] as const;

export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'pending': ['in_progress', 'completed'],
  'in_progress': ['completed', 'pending'],
  'completed': []
};