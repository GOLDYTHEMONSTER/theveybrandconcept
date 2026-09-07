import { getSessionContext } from "../../../lib/auth/session";

export default async function SettingsPage() {
  const session = await getSessionContext();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Settings</p>
          <h1>Your account.</h1>
          <p>Sandbox sessions are demo-only — password changes, MFA and org switching arrive with real Supabase Auth.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Profile</p><h2>Account details</h2></div></div>
          <div className="activity-list">
            <div className="activity-row">
              <span className="activity-mark">{session.name.slice(0, 1)}</span>
              <div><strong>{session.name}</strong><small>{session.email}</small></div>
              <span className="activity-tag">{session.roleLabel}</span>
              <time>{session.organizationId === "theveybrand-sandbox" ? "Veronica Young Brand" : session.organizationId}</time>
            </div>
          </div>
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Access</p><h2>Permissions</h2></div></div>
          <div className="focus-list">
            {session.permissions.map((permission, index) => (
              <div className="focus-row" key={permission}>
                <span className="focus-index">0{index + 1}</span>
                <div><strong>{permission}</strong></div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
