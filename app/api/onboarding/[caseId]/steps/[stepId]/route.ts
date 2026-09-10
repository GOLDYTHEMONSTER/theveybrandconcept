import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "../../../../../../lib/auth/session";
import { RATE_LIMIT_RULES, requireRateLimit } from "../../../../../../lib/rate-limit/limiter";
import { completeStep, getCase } from "../../../../../../modules/onboarding/store";
import { ForbiddenError, handleApiError } from "../../../../../../modules/security/api-guard";
import { requireSameOrigin } from "../../../../../../modules/security/request";

/**
 * Deliberately not guardMutation(request, "<one permission>") -- this
 * route serves two different audiences under one rule (team.manage for
 * HR/execs running someone else's case, or the case's own subject acting
 * on their own), which a single required permission can't express. Same
 * same-origin/session/rate-limit layers as guardMutation, custom
 * authorization in their place.
 */
export async function POST(request: NextRequest, { params }: { params: { caseId: string; stepId: string } }) {
  try {
    requireSameOrigin(request);
    const session = await getSessionContext();
    await requireRateLimit(RATE_LIMIT_RULES.apiWrite, `${session.userId}:${session.organizationId}`);

    const lifecycleCase = getCase(params.caseId);
    const canManage = session.permissions.includes("team.manage");
    if (!canManage && lifecycleCase.memberId !== session.userId) {
      throw new ForbiddenError("team.manage");
    }

    const updated = completeStep(params.caseId, params.stepId, session.userId, session.name);
    return NextResponse.json({ case: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
