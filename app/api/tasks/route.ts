import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../modules/audit/sandbox-log";
import { createNotification } from "../../../modules/notifications/store";
import { guardMutation, handleApiError } from "../../../modules/security/api-guard";
import { getTeamMember } from "../../../modules/team/store";
import { createTask, type TaskPriority } from "../../../modules/tasks/store";
import { ValidationError } from "../../../modules/shared/errors";

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "tasks.manage");

    const body = (await request.json()) as Partial<{
      title: string;
      description: string;
      assigneeId: string;
      priority: TaskPriority;
      dueDate: string | null;
    }>;

    if (!body.title || !body.assigneeId) throw new ValidationError("Title and assignee are required");
    if (!body.priority || !VALID_PRIORITIES.includes(body.priority)) throw new ValidationError("Select a valid priority");

    const task = createTask({
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      priority: body.priority,
      dueDate: body.dueDate ?? null,
      assignedById: session.userId,
      assignedByName: session.name,
    });

    recordAudit({
      action: "tasks.create",
      entityType: "task",
      entityId: task.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { title: task.title, assigneeId: task.assigneeId, priority: task.priority },
    });

    const assignee = getTeamMember(task.assigneeId);
    createNotification({
      audienceRoles: [assignee.role],
      type: "task.assigned",
      title: "New task assigned",
      message: `${session.name} assigned you "${task.title}"`,
      href: "/tasks",
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
