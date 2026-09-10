import { NextRequest, NextResponse } from "next/server";
import { startOffboarding } from "../../../../../modules/onboarding/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "team.manage");

    const body = (await request.json().catch(() => ({}))) as Partial<{ reason: string }>;
    if (!body.reason?.trim()) throw new ValidationError("A reason is required to start offboarding");

    const lifecycleCase = startOffboarding(params.id, body.reason, session.userId, session.name);

    return NextResponse.json({ case: lifecycleCase }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
