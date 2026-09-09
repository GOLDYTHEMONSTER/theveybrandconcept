import { requirePagePermission } from "../../../../lib/auth/session";
import { ROLE_DEFINITIONS } from "../../../../modules/authentication/roles";
import { listTeamMembers } from "../../../../modules/team/store";
import NewTaskForm from "../../_components/NewTaskForm";

export default async function NewTaskPage({ searchParams }: { searchParams: { assigneeId?: string } }) {
  await requirePagePermission("tasks.manage");

  const assignees = listTeamMembers().map((member) => ({
    id: member.id,
    name: member.name,
    roleLabel: ROLE_DEFINITIONS[member.role].label,
  }));
  const preselected = assignees.find((assignee) => assignee.id === searchParams.assigneeId);

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Tasks · Assign</p>
          <h1>{preselected ? `Give ${preselected.name.split(" ")[0]} their next task.` : "Give someone their next task."}</h1>
          <p>They'll see it on their Tasks page and get notified right away.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">New task</p><h2>Task details</h2></div></div>
          <NewTaskForm assignees={assignees} initialAssigneeId={preselected?.id} />
        </article>
      </section>
    </>
  );
}
