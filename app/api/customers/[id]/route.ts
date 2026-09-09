import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { getCustomerDetail } from "../../../../modules/crm/service";
import { updateCustomerRecord } from "../../../../modules/crm/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { NotFoundError, ValidationError } from "../../../../modules/shared/errors";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "crm.manage");

    const key = decodeURIComponent(params.id);
    if (!getCustomerDetail(key)) throw new NotFoundError("Customer not found");

    const body = (await request.json()) as Record<string, unknown>;
    const update: { note?: string | null; vipOverride?: boolean | null } = {};

    if (body.note !== undefined) {
      if (body.note !== null && typeof body.note !== "string") throw new ValidationError("note must be text");
      if (typeof body.note === "string" && body.note.length > 2000) throw new ValidationError("Note must be 2000 characters or fewer");
      update.note = body.note === null ? null : (body.note as string).trim() || null;
    }

    if (body.vipOverride !== undefined) {
      if (body.vipOverride !== null && typeof body.vipOverride !== "boolean") throw new ValidationError("vipOverride must be true, false, or null");
      update.vipOverride = body.vipOverride as boolean | null;
    }

    const record = updateCustomerRecord(key, update, session.userId);

    recordAudit({
      action: "crm.customer_update",
      entityType: "customer",
      entityId: key,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { note: record.note, vipOverride: record.vipOverride },
    });

    return NextResponse.json({ record });
  } catch (error) {
    return handleApiError(error);
  }
}
