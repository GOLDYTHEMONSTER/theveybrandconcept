import { createServerSupabase } from "../supabase/server";
import { SessionContext } from "../auth/session";

export interface AuditEntry {
  action: string;                 // e.g. "inventory.adjust"
  entityType?: string;            // e.g. "product"
  entityId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  ipAddress?: string;
}

/**
 * Writes an append-only audit log row. This is intentionally a plain
 * INSERT under the user's own RLS-protected session — there is no
 * UPDATE/DELETE policy on audit_logs (see migration 0001), so once
 * written, an entry cannot be altered by application code, including
 * by the acting user themselves.
 *
 * Call this from every sensitive mutation AFTER the write succeeds,
 * inside the same request — never as a "fire and forget" best-effort
 * afterthought for financial, HR, permission, or account actions.
 */
export async function writeAuditLog(session: SessionContext, entry: AuditEntry): Promise<void> {
  const supabase = createServerSupabase();

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: session.organizationId,
    actor_id: session.userId,
    department_id: session.departmentId,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    before_value: entry.beforeValue ?? null,
    after_value: entry.afterValue ?? null,
    reason: entry.reason ?? null,
    ip_address: entry.ipAddress ?? null,
  });

  if (error) {
    // Audit logging failures should be loud. In production, wire this
    // to your monitoring/alerting — a silently-dropped audit entry on
    // a financial or HR action is a compliance incident.
    console.error("[audit] failed to write audit log", { action: entry.action, error });
    throw error;
  }
}
