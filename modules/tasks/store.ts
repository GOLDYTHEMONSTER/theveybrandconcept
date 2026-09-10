import { randomUUID } from "crypto";
import { recordAudit } from "../audit/sandbox-log";
import { NotFoundError, ValidationError } from "../shared/errors";
import { createSeededRandom, stableId } from "../shared/seeded-random";
import { getTeamMember, listTeamMembers } from "../team/store";
import type { Task, TaskPriority, TaskStatus } from "./domain";

export type { Task, TaskPriority, TaskStatus } from "./domain";

const globalTasks = globalThis as typeof globalThis & { __veyTasks?: Task[]; __veyTaskSeq?: number };

const DAY_MS = 24 * 60 * 60 * 1000;

// Seeded so a cold start on a different serverless instance reproduces the
// same tasks (same ids, same statuses) -- see modules/shared/seeded-random.ts.
const seedRand = createSeededRandom("theveybrand-tasks-seed-v1");

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

  // A wider spread of routine tasks across every teammate, so the Tasks
  // page (and each dashboard's task-derived metrics) reflect a team that's
  // actually busy, not the same six hand-written examples every load.
  const GENERIC_TASKS: Array<{ title: string; description: string; priority: TaskPriority }> = [
    { title: "Reconcile weekend sales against till receipts", description: "Cross-check the Lagos showroom's weekend till against system totals.", priority: "medium" },
    { title: "Photograph new arrivals for the storefront", description: "Shoot and upload images before the listing goes live.", priority: "medium" },
    { title: "Respond to size-exchange request", description: "Customer asked to swap M for L before shipping.", priority: "high" },
    { title: "Audit low-stock lines for the week", description: "Cross-check against the reorder list before it goes stale.", priority: "medium" },
    { title: "Update product descriptions for SEO", description: "Five listings are still using placeholder copy.", priority: "low" },
    { title: "Confirm courier pickup window", description: "Coordinate with GIG Logistics for tomorrow's batch.", priority: "medium" },
    { title: "Review permission overrides before quarter close", description: "Confirm nobody still has a stale grant from a role change.", priority: "low" },
    { title: "Prep showroom for weekend trunk show", description: "Merchandising, signage and float cash need sorting.", priority: "high" },
    { title: "Chase supplier on delayed fabric shipment", description: "Guangzhou hub restock is running a few days behind.", priority: "high" },
    { title: "Draft this month's newsletter", description: "Feature the new arrivals and the trunk show.", priority: "low" },
    { title: "Spot-check packaging quality", description: "A customer flagged a damaged box on delivery.", priority: "medium" },
    { title: "Update team roster for new hire", description: "Add department, role and starter permissions.", priority: "medium" },
    { title: "Investigate delayed shipment complaint", description: "Order stuck in transit for 5 days — check with the carrier.", priority: "high" },
    { title: "Prepare monthly finance summary", description: "Revenue, refunds and overdue invoices for leadership review.", priority: "medium" },
  ];

  const members = listTeamMembers();
  const STATUS_WEIGHTS: TaskStatus[] = ["done", "done", "done", "in_progress", "in_progress", "todo", "todo"];

  GENERIC_TASKS.forEach((template, index) => {
    const assignee = members[(index + 2) % members.length];
    const assigner = members.find((m) => m.role === "executive") ?? members[0];
    const status = STATUS_WEIGHTS[index % STATUS_WEIGHTS.length];
    const createdDaysAgo = randomInt(2, 24);
    const createdAt = ago(createdDaysAgo);
    const updatedAt = status === "todo" ? createdAt : ago(randomInt(0, createdDaysAgo - 1));
    const dueDate = status === "done" ? null : seedRand() < 0.6 ? (seedRand() < 0.25 ? ago(randomInt(1, 3)) : inDays(randomInt(1, 10))) : null;

    rows.push({
      title: template.title,
      description: template.description,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assignedById: assigner.id,
      assignedByName: assigner.name,
      priority: template.priority,
      status,
      dueDate,
      createdAt,
      updatedAt,
    });
  });

  const tasks = rows.map((row, index) => ({ ...row, id: stableId(`task-seed-${index}`), taskNumber: nextTaskNumber() }));

  for (const task of tasks) {
    recordAudit({
      action: "tasks.create",
      entityType: "task",
      entityId: task.id,
      actorId: task.assignedById,
      actorName: task.assignedByName,
      afterValue: { title: task.title, assigneeId: task.assigneeId, priority: task.priority },
      occurredAt: task.createdAt,
    });
    if (task.status !== "todo") {
      recordAudit({
        action: "tasks.status_change",
        entityType: "task",
        entityId: task.id,
        actorId: task.assigneeId,
        actorName: task.assigneeName,
        afterValue: { status: task.status },
        occurredAt: task.updatedAt,
      });
    }
  }

  return tasks;
}

function randomInt(min: number, max: number): number {
  return Math.floor(seedRand() * (max - min + 1)) + min;
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
