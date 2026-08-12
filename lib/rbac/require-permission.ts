import { createServerSupabase } from "../supabase/server";
import { SessionContext } from "../auth/session";

export class ForbiddenError extends Error {
  constructor(permissionCode: string) {
    super(`Missing permission: ${permissionCode}`);
    this.name = "ForbiddenError";
  }
}

/**
 * Re-checks a permission against the database via the has_permission()
 * SQL function (see migration 0001). This is deliberately redundant
 * with RLS: RLS is the hard backstop that makes bad data access
 * impossible even if application code has a bug; this check exists so
 * we can fail fast with a clean 403 *before* attempting a write, and
 * so business logic (e.g. "which button to allow") never relies on a
 * client-supplied role/permission claim.
 *
 * Never derive permission from:
 *   - a role string stored in a JWT custom claim
 *   - a value sent in the request body/headers
 * Always re-derive from organization_members -> member_roles ->
 * role_permissions, scoped to the CURRENT authenticated session.
 */
export async function requirePermission(
  session: SessionContext,
  permissionCode: string
): Promise<void> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase.rpc("has_permission", {
    p_organization_id: session.organizationId,
    p_permission_code: permissionCode,
  });

  if (error || data !== true) {
    throw new ForbiddenError(permissionCode);
  }
}

/**
 * Department-scoped variant, for "own department only" permissions
 * (e.g. a department lead editing records within their department).
 */
export async function requireDepartmentPermission(
  session: SessionContext,
  permissionCode: string
): Promise<void> {
  if (!session.departmentId) {
    throw new ForbiddenError(permissionCode);
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc("has_department_permission", {
    p_department_id: session.departmentId,
    p_permission_code: permissionCode,
  });

  if (error || data !== true) {
    throw new ForbiddenError(permissionCode);
  }
}
