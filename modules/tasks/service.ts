import { computeTrend, splitByRecency, WEEK_MS } from "../shared/trend";
import { listTasks, listTasksForAssignee, type Task, type TaskPriority, type TaskStatus } from "./store";
import type { MetricCardData } from "../../app/(erp)/_components/MetricGrid";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<TaskStatus, string> = {
  todo: "neutral",
  in_progress: "warning",
  done: "positive",
  cancelled: "negative",
};

export interface TaskRow {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  assigneeName: string;
  assignedByName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDateLabel: string | null;
  isOverdue: boolean;
}

function toRow(task: Task): TaskRow {
  const isOverdue = Boolean(task.dueDate) && task.status !== "done" && task.status !== "cancelled" && new Date(task.dueDate!).getTime() < Date.now();
  return {
    id: task.id,
    taskNumber: task.taskNumber,
    title: task.title,
    description: task.description,
    assigneeName: task.assigneeName,
    assignedByName: task.assignedByName,
    priority: task.priority,
    status: task.status,
    dueDateLabel: task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-NG", { dateStyle: "medium" }) : null,
    isOverdue,
  };
}

export function getTaskRows(): TaskRow[] {
  return listTasks().map(toRow);
}

export function getTaskRowsForAssignee(assigneeId: string): TaskRow[] {
  return listTasksForAssignee(assigneeId).map(toRow);
}

export function getTaskMetrics(tasks: Task[]): MetricCardData[] {
  const open = tasks.filter((task) => task.status === "todo" || task.status === "in_progress");
  const overdue = open.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < Date.now());
  const done = tasks.filter((task) => task.status === "done");

  const { current: currentDone, previous: previousDone } = splitByRecency(done, (task) => task.updatedAt, WEEK_MS);
  const doneTrend = computeTrend(currentDone.length, previousDone.length, "up");

  const { current: currentCreated, previous: previousCreated } = splitByRecency(tasks, (task) => task.createdAt, WEEK_MS);
  const createdTrend = computeTrend(currentCreated.length, previousCreated.length, "up");

  return [
    { label: "Open tasks", value: String(open.length), change: "To do + in progress", tone: "neutral" },
    { label: "Overdue", value: String(overdue.length), change: overdue.length ? "Past due date" : "Nothing overdue", tone: overdue.length ? "warning" : "positive" },
    { label: "Completed this week", value: String(currentDone.length), change: "This week vs last", tone: "positive", trend: doneTrend },
    { label: "New this week", value: String(currentCreated.length), change: "Assigned this week vs last", tone: "neutral", trend: createdTrend },
  ];
}
