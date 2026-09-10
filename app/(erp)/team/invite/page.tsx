import { requirePagePermission } from "../../../../lib/auth/session";
import TeamInviteForm from "../../_components/TeamInviteForm";

export default async function TeamInvitePage() {
  await requirePagePermission("team.manage");

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Team · Invite</p>
          <h1>Add a teammate.</h1>
          <p>They&apos;ll appear on the login screen immediately, signing in with the shared sandbox password.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">New account</p><h2>Teammate details</h2></div></div>
          <TeamInviteForm />
        </article>
      </section>
    </>
  );
}
