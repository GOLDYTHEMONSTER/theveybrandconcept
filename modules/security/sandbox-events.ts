export interface SandboxSecurityEvent {
  type: "login.success" | "login.failure" | "logout";
  actorId?: string;
  actorName?: string;
  email?: string;
  ipAddress: string | null;
  userAgent?: string | null;
  occurredAt: string;
}

const globalEvents = globalThis as typeof globalThis & {
  __veySecurityEvents?: SandboxSecurityEvent[];
};

/**
 * In-memory stand-in for `login_events` (see migration 0003) while the
 * platform runs on sandbox auth. Every login attempt — success or
 * failure — and every logout is recorded here for the Security screen.
 */
export function recordSandboxSecurityEvent(
  event: Omit<SandboxSecurityEvent, "occurredAt">
): void {
  const events = globalEvents.__veySecurityEvents ?? [];
  events.push({ ...event, occurredAt: new Date().toISOString() });
  if (events.length > 200) events.splice(0, events.length - 200);
  globalEvents.__veySecurityEvents = events;
}

export function listRecentSecurityEvents(limit = 50): SandboxSecurityEvent[] {
  const events = globalEvents.__veySecurityEvents ?? [];
  return [...events].reverse().slice(0, limit);
}
