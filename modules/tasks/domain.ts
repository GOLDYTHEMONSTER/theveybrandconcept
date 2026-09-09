export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assignedById: string;
  assignedByName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
