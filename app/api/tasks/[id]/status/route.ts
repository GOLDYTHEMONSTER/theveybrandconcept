import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../../modules/notifications/store";
import { ForbiddenError, guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { getTeamMember } from "../../../../../modules/team/store";
import { getTask, updateTaskStatus, type TaskStatus } from "../../../../../modules/tasks/store";
import { ValidationError } from "../../../../../modules/shared/errors";

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "tasks.view");

    const task = getTask(params.id);
    const canManage = session.permissions.includes("tasks.manage");
    if (!canManage && task.assigneeId !== session.userId) {
      throw new ForbiddenError("tasks.manage");
    }

    const body = (await request.json()) as Partial<{ status: TaskStatus }>;
    if (!body.status || !VALID_STATUSES.includes(body.status)) throw new ValidationError("Select a valid status");

    const before = task.status;
    const updated = updateTaskStatus(params.id, body.status);

    recordAudit({
      action: "tasks.status_change",
      entityType: "task",
      entityId: updated.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before },
      afterValue: { status: updated.status },
    });

    if (updated.status === "done" && updated.assignedById !== session.userId) {
      const assigner = getTeamMember(updated.assignedById);
      createNotification({
        audienceRoles: [assigner.role],
        type: "task.completed",
        title: "Task completed",
        message: `${updated.assigneeName} finished "${updated.title}"`,
        href: "/tasks",
      });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
