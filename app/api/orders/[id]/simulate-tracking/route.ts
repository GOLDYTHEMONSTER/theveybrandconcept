import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { getOrder, getShipment, recordCarrierEvent } from "../../../../../modules/orders/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { NotFoundError, ValidationError } from "../../../../../modules/shared/errors";

const CANNED_EVENTS: Record<string, { status: string; message: string }> = {
  out_for_delivery: { status: "Out for delivery", message: "Courier is out for delivery" },
  delayed: { status: "Delayed", message: "Shipment delayed in transit" },
  delivered: { status: "Delivered", message: "Delivered to customer" },
};

/**
 * Lets staff test the tracking/webhook pipeline without a real carrier
 * account -- calls the exact same recordCarrierEvent() the simulated
 * shipping webhook (app/api/webhooks/shipping) uses, just authenticated
 * by session instead of a shared secret since this is a staff action.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.fulfil");

    const order = getOrder(params.id);
    if (!order) throw new NotFoundError("Order not found");
    if (!order.shipmentId) throw new ValidationError("This order has not shipped yet");

    const body = (await request.json()) as Partial<{ event: string }>;
    const canned = body.event ? CANNED_EVENTS[body.event] : undefined;
    if (!canned) throw new ValidationError(`event must be one of: ${Object.keys(CANNED_EVENTS).join(", ")}`);

    const shipment = getShipment(order.shipmentId);
    if (!shipment) throw new NotFoundError("Shipment not found");

    const result = recordCarrierEvent(shipment.trackingNumber, { ...canned, location: null }, session.userId);

    recordAudit({
      action: "orders.simulate_tracking",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { ...canned, orderStatus: result.order.status },
    });

    return NextResponse.json({ orderStatus: result.order.status, shipment: result.shipment });
  } catch (error) {
    return handleApiError(error);
  }
}
