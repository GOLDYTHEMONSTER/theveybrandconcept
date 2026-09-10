import { describe, expect, it } from "vitest";
import { ValidationError } from "../shared/errors";
import { createTask, getTask, updateTaskStatus } from "./store";

function assign(overrides: Partial<Parameters<typeof createTask>[0]> = {}) {
  return createTask({
    title: "Reconcile weekend till",
    priority: "medium",
    assigneeId: "sandbox-warehouse",
    assignedById: "sandbox-executive",
    assignedByName: "Veronica Young",
    ...overrides,
  });
}

describe("tasks", () => {
  it("creates a task in todo status, assigned to a real teammate", () => {
    const task = assign();
    expect(task.status).toBe("todo");
    expect(task.assigneeName).toBe("David Chen");
  });

  it("rejects a title that's too short or too long", () => {
    expect(() => assign({ title: "ab" })).toThrow(ValidationError);
    expect(() => assign({ title: "x".repeat(141) })).toThrow(ValidationError);
  });

  it("rejects an unknown assignee instead of silently creating an orphaned task", () => {
    expect(() => assign({ assigneeId: "not-a-real-person" })).toThrow();
  });

  it("updateTaskStatus persists and is reflected by getTask", () => {
    const task = assign();
    updateTaskStatus(task.id, "in_progress");
    expect(getTask(task.id).status).toBe("in_progress");

    updateTaskStatus(task.id, "done");
    expect(getTask(task.id).status).toBe("done");
  });
});
