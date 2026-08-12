import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, UnauthenticatedError, NoOrganizationError } from "../../../../lib/auth/session";
import { requirePermission, ForbiddenError } from "../../../../lib/rbac/require-permission";
import { requireRateLimit, RateLimitExceededError, RATE_LIMIT_RULES } from "../../../../lib/rate-limit/limiter";
import { writeAuditLog } from "../../../../lib/audit/log";
import { createServerSupabase } from "../../../../lib/supabase/server";

/**
 * POST /api/inventory/adjust
 *
 * This route is the reference implementation for every sensitive ERP
 * mutation. Every layer runs in order and every layer can independently
 * reject the request:
 *
 *   1. Session   -> who is this, and in which organization?
 *   2. Rate limit -> is this identity/org within its quota for writes?
 *   3. Permission -> does this user actually hold inventory.adjust,
 *                    AND does the org's tier include the inventory module?
 *                    (has_permission() checks both — see migration 0001)
 *   4. Mutation   -> the actual write. Still protected by RLS underneath,
 *                    so even a bug in steps 1-3 can't leak cross-org data.
 *   5. Audit log  -> append-only record of what changed and why.
 *
 * Never skip a layer "because the UI already checked" — the UI's job is
 * only to decide what buttons to show.
 */

interface AdjustBody {
  productId: string;
  organizationId: string;
  quantityDelta: number;
  reason: string;
}

export async function POST(request: NextRequest) {
  let body: AdjustBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.productId || !body.organizationId || typeof body.quantityDelta !== "number" || !body.reason) {
    return NextResponse.json(
      { error: "productId, organizationId, quantityDelta, and reason are required" },
      { status: 400 }
    );
  }

  // 1. Session — organizationId in the body is only a *hint* for which
  //    org to act in if the user belongs to multiple; membership itself
  //    is re-verified against the database inside getSessionContext().
  let session;
  try {
    session = await getSessionContext(body.organizationId);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (err instanceof NoOrganizationError) {
      return NextResponse.json({ error: "No active membership in this organization" }, { status: 403 });
    }
    throw err;
  }

  // 2. Rate limit — tenant-aware bucket so one org can't exhaust another's quota.
  try {
    await requireRateLimit(RATE_LIMIT_RULES.apiWrite, `${session.userId}:${session.organizationId}`);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many requests, slow down." },
        { status: 429, headers: { "Retry-After": Math.ceil((err.resetAt - Date.now()) / 1000).toString() } }
      );
    }
    throw err;
  }

  // 3. Permission
  try {
    await requirePermission(session, "inventory.adjust");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "You do not have permission to adjust inventory." }, { status: 403 });
    }
    throw err;
  }

  // 4. Mutation — event-sourced, not a bare stock decrement. Insert an
  //    inventory_movements row; a DB trigger (not shown here) maintains
  //    the running stock total from the movement log.
  const supabase = createServerSupabase();

  const { data: before, error: beforeError } = await supabase
    .from("inventory")
    .select("stock")
    .eq("product_id", body.productId)
    .eq("organization_id", session.organizationId)
    .single();

  if (beforeError || !before) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    organization_id: session.organizationId,
    product_id: body.productId,
    type: "adjustment",
    quantity: body.quantityDelta,
    reference: null,
    actor_id: session.userId,
    reason: body.reason,
  });

  if (movementError) {
    return NextResponse.json({ error: "Failed to record inventory movement" }, { status: 500 });
  }

  const newStock = before.stock + body.quantityDelta;

  // 5. Audit log — always logged, even though inventory_movements already
  //    captures the domain event; audit_logs is the single cross-module
  //    place compliance/security review reads from.
  await writeAuditLog(session, {
    action: "inventory.adjust",
    entityType: "product",
    entityId: body.productId,
    beforeValue: { stock: before.stock },
    afterValue: { stock: newStock },
    reason: body.reason,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ productId: body.productId, newStock }, { status: 200 });
}
