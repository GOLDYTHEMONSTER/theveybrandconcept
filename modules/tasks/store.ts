import { randomUUID } from "crypto";
import { NotFoundError, ValidationError } from "../shared/errors";
import { getTeamMember } from "../team/store";
import type { Task, TaskPriority, TaskStatus } from "./domain";

export type { Task, TaskPriority, TaskStatus } from "./domain";

const globalTasks = globalThis as typeof globalThis & { __veyTasks?: Task[]; __veyTaskSeq?: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function ago(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}
function inDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function nextTaskNumber(): number {
  globalTasks.__veyTaskSeq = (globalTasks.__veyTaskSeq ?? 0) + 1;
  return globalTasks.__veyTaskSeq;
}

/**
 * Seeds a handful of real-looking tasks across roles so the Tasks page has
 * genuine open/overdue/completed examples (including one already-overdue
 * item, and completions on both sides of the week boundary for a real
 * week-over-week trend) rather than an empty page on first load.
 */
function seed(): Task[] {
  globalTasks.__veyTaskSeq = 0;
  const rows: Array<Omit<Task, "id" | "taskNumber">> = [
    {
      title: "Restock check — Sienna Gown run",
      description: "Confirm incoming stock count against the PO before it's marked received.",
      assigneeId: "sandbox-warehouse",
      assigneeName: "David Chen",
      assignedById: "sandbox-executive",
      assignedByName: "Veronica Young",
      priority: "high",
      status: "in_progress",
      dueDate: inDays(1),
      createdAt: ago(3),
      updatedAt: ago(1),
    },
    {
      title: "Follow up on overdue invoice — VY-1042",
      description: "Customer hasn't responded to the first reminder; try a call this time.",
      assigneeId: "sandbox-sales",
      assigneeName: "Amara Okafor",
      assignedById: "sandbox-executive",
      assignedByName: "Veronica Young",
      priority: "high",
      status: "todo",
      dueDate: ago(1),
      createdAt: ago(4),
      updatedAt: ago(4),
    },
    {
      title: "Draft response templates for return requests",
      description: "Standardize tone across approve/reject/received messages.",
      assigneeId: "sandbox-support",
      assigneeName: "Ife Bello",
      assignedById: "sandbox-sales",
      assignedByName: "Amara Okafor",
      priority: "medium",
      status: "done",
      dueDate: null,
      createdAt: ago(9),
      updatedAt: ago(8),
    },
    {
      title: "Weekly stock reconciliation",
      description: "Cross-check ledger movement against physical count for the week.",
      assigneeId: "sandbox-warehouse",
      assigneeName: "David Chen",
      assignedById: "sandbox-executive",
      assignedByName: "Veronica Young",
      priority: "medium",
      status: "done",
      dueDate: null,
      createdAt: ago(10),
      updatedAt: ago(9),
    },
    {
      title: "Prep Q&A doc for new hire onboarding",
      description: "Cover common customer questions about sizing and returns.",
      assigneeId: "sandbox-support",
      assigneeName: "Ife Bello",
      assignedById: "sandbox-executive",
      assignedByName: "Veronica Young",
      priority: "low",
      status: "todo",
      dueDate: inDays(5),
      createdAt: ago(1),
      updatedAt: ago(1),
    },
    {
      title: "Draft onboarding checklist for new hires",
      description: "Standardize the first-week checklist across departments.",
      assigneeId: "sandbox-hr",
      assigneeName: "Ngozi Adeyemi",
      assignedById: "sandbox-executive",
      assignedByName: "Veronica Young",
      priority: "medium",
      status: "in_progress",
      dueDate: inDays(3),
      createdAt: ago(2),
      updatedAt: ago(1),
    },
  ];

  return rows.map((row) => ({ ...row, id: randomUUID(), taskNumber: nextTaskNumber() }));
}

if (!globalTasks.__veyTasks) {
  globalTasks.__veyTasks = seed();
}

function store(): Task[] {
  return globalTasks.__veyTasks!;
}

export function listTasks(): Task[] {
  return [...store()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listTasksForAssignee(assigneeId: string): Task[] {
  return listTasks().filter((task) => task.assigneeId === assigneeId);
}

export function getTask(id: string): Task {
  const task = store().find((item) => item.id === id);
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

export function createTask(input: {
  title: string;
  description?: string;
  assigneeId: string;
  priority: TaskPriority;
  dueDate?: string | null;
  assignedById: string;
  assignedByName: string;
}): Task {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 140) throw new ValidationError("Title must be 3-140 characters");
  const assignee = getTeamMember(input.assigneeId);

  const task: Task = {
    id: randomUUID(),
    taskNumber: nextTaskNumber(),
    title,
    description: (input.description ?? "").trim().slice(0, 1000),
    assigneeId: assignee.id,
    assigneeName: assignee.name,
    assignedById: input.assignedById,
    assignedByName: input.assignedByName,
    priority: input.priority,
    status: "todo",
    dueDate: input.dueDate ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store().push(task);
  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus): Task {
  const task = getTask(id);
  task.status = status;
  task.updatedAt = new Date().toISOString();
  return task;
}
