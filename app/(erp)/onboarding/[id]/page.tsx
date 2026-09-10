import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth/session";
import { getOpenTaskCountForMember } from "../../../../modules/onboarding/service";
import { getCase } from "../../../../modules/onboarding/store";
import ChecklistStep from "../../_components/ChecklistStep";
import PersonBadge from "../../_components/PersonBadge";

export const dynamic = "force-dynamic";

export default async function LifecycleCasePage({ params }: { params: { id: string } }) {
  const session = await requirePagePermission("team.manage", "onboarding.view");

  const lifecycleCase = (() => {
    try {
      return getCase(params.id);
    } catch {
      return null;
    }
  })();
  if (!lifecycleCase) notFound();

  const canManage = session.permissions.includes("team.manage");
  if (!canManage && lifecycleCase.memberId !== session.userId) notFound();

  const openTaskCount = lifecycleCase.kind === "offboarding" ? getOpenTaskCountForMember(lifecycleCase.memberId) : 0;
  const isOnboarding = lifecycleCase.kind === "onboarding";

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">{isOnboarding ? "Onboarding" : "Offboarding"} · Checklist</p>
          <h1>{lifecycleCase.memberName}</h1>
          <p>
            {lifecycleCase.role.replace(/_/g, " ")} · {lifecycleCase.department}
            {lifecycleCase.reason && ` · ${lifecycleCase.reason}`}
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="erp-eyebrow">{lifecycleCase.status === "completed" ? "Complete" : "In progress"}</p>
              <h2>Checklist</h2>
            </div>
          </div>

          {!isOnboarding && (
            <p className="sandbox-note" style={{ textAlign: "left", marginBottom: 16 }}>
              <span>●</span> Access was revoked the moment this case started — {new Date(lifecycleCase.startedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}. Everything below is cleanup, not the security boundary.
            </p>
          )}

          <div className="activity-list">
            {lifecycleCase.steps.map((step) => (
              <ChecklistStep
                key={step.id}
                caseId={lifecycleCase.id}
                stepId={step.id}
                label={step.label}
                category={step.category}
                required={step.required}
                completedAt={step.completedAt}
                completedByName={step.completedByName}
                disabled={lifecycleCase.status === "completed"}
                note={step.category === "handover" && openTaskCount > 0 ? `${openTaskCount} open task${openTaskCount === 1 ? "" : "s"} still assigned to them` : undefined}
              />
            ))}
          </div>
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Case</p><h2>Details</h2></div></div>
          <div className="focus-list">
            <div className="focus-row"><span className="focus-index">●</span><div><strong>Person</strong><small>&nbsp;</small></div><PersonBadge name={lifecycleCase.memberName} /></div>
            <div className="focus-row"><span className="focus-index">●</span><div><strong>Started by</strong><small>{new Date(lifecycleCase.startedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</small></div><b>{lifecycleCase.startedByName}</b></div>
            {lifecycleCase.completedAt && (
              <div className="focus-row"><span className="focus-index">●</span><div><strong>Completed</strong><small>&nbsp;</small></div><b>{new Date(lifecycleCase.completedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</b></div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
