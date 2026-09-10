export interface SandboxAuditEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  actorId: string;
  actorName: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  occurredAt: string;
}

const globalAudit = globalThis as typeof globalThis & { __veyAuditLog?: SandboxAuditEntry[] };

/**
 * In-memory stand-in for `audit_logs` (see FOUNDATION_SCHEMA.md) while the
 * platform runs on sandbox auth instead of real Supabase Auth/RLS. Every
 * sensitive mutation (product create, stock adjustment, order lifecycle)
 * writes here — never silently, and never best-effort.
 */
/**
 * `occurredAt` may be passed explicitly when backfilling seed data with a
 * realistic historical spread -- omit it for a live mutation and it's
 * simply now, as before.
 */
export function recordAudit(entry: Omit<SandboxAuditEntry, "occurredAt"> & { occurredAt?: string }): void {
  const log = globalAudit.__veyAuditLog ?? [];
  log.push({ ...entry, occurredAt: entry.occurredAt ?? new Date().toISOString() });
  if (log.length > 500) log.splice(0, log.length - 500);
  globalAudit.__veyAuditLog = log;
}

export function listRecentAudit(limit = 20): SandboxAuditEntry[] {
  const log = globalAudit.__veyAuditLog ?? [];
  return [...log].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}
