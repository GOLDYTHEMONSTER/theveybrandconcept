import { createServerSupabase } from "../supabase/server";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

export class NoOrganizationError extends Error {
  constructor() {
    super("User has no active organization membership");
    this.name = "NoOrganizationError";
  }
}

export interface SessionContext {
  userId: string;
  organizationId: string;
  departmentId: string | null;
  memberId: string;
}

/**
 * Resolves "who is making this request, and in which organization"
 * from the Supabase session cookie — never from a client-supplied
 * organizationId/userId in the request body.
 *
 * `preferredOrgId` lets a multi-org user pick which org they're acting
 * in (e.g. from a subdomain or a selected-org cookie), but membership
 * is always re-verified against the database, never trusted blindly.
 */
export async function getSessionContext(preferredOrgId?: string): Promise<SessionContext> {
  const supabase = createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthenticatedError();
  }

  let query = supabase
    .from("organization_members")
    .select("id, organization_id, department_id")
    .eq("profile_id", user.id)
    .eq("status", "active");

  if (preferredOrgId) {
    query = query.eq("organization_id", preferredOrgId);
  }

  const { data: membership, error: membershipError } = await query.limit(1).maybeSingle();

  if (membershipError || !membership) {
    throw new NoOrganizationError();
  }

  return {
    userId: user.id,
    organizationId: membership.organization_id,
    departmentId: membership.department_id,
    memberId: membership.id,
  };
}
