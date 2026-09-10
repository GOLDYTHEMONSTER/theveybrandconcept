import { beforeAll, describe, expect, it } from "vitest";
import { listVariants } from "../catalog/store";
import { getStockTotals } from "../inventory/store";
import { createOrder, markDelivered, markPaymentSucceeded, shipOrder } from "../orders/store";
import { ConflictError, ValidationError } from "../shared/errors";
import { approveReturn, createReturn, markReturnReceived, markReturnRefunded, rejectReturn } from "./store";

let variantId: string;

beforeAll(() => {
  variantId = listVariants()[0].id;
});

/** A delivered, paid order -- the only kind createReturn() will accept. */
function deliveredOrder() {
  const order = createOrder(
    { customer: "Return Tester", channel: "Online store", items: [{ variantId, quantity: 1 }] },
    "sandbox-sales"
  );
  markPaymentSucceeded(order.id); // also advances pending -> processing
  shipOrder(order.id, { carrier: "GIG Logistics", trackingNumber: "GIGRETURN01" }, "sandbox-warehouse");
  return markDelivered(order.id, "sandbox-warehouse");
}

describe("return lifecycle", () => {
  it("refuses a return on an order that hasn't been delivered", () => {
    const order = createOrder(
      { customer: "Too Soon", channel: "Online store", items: [{ variantId, quantity: 1 }] },
      "sandbox-sales"
    );
    expect(() => createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "changed_mind", reasonNote: null }, "sandbox-support")).toThrow(ValidationError);
  });

  it("walks the happy path: requested -> approved -> received -> refunded, restocking on receipt", () => {
    const order = deliveredOrder();
    const stockBeforeReturn = getStockTotals(variantId);

    const request = createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "wrong_size", reasonNote: null }, "sandbox-support");
    expect(request.status).toBe("requested");

    approveReturn(request.id, "sandbox-support");
    const received = markReturnReceived(request.id, "sandbox-warehouse");
    expect(received.status).toBe("received");

    // Receiving the return is the one step that puts stock back.
    const stockAfterReceive = getStockTotals(variantId);
    expect(stockAfterReceive.onHand).toBe(stockBeforeReturn.onHand + 1);

    const refunded = markReturnRefunded(request.id, "sandbox-executive", "re_test_123");
    expect(refunded.status).toBe("refunded");
    expect(refunded.refundId).toBe("re_test_123");
  });

  it("rejecting frees the item's returnable quantity back up", () => {
    const order = deliveredOrder();
    const first = createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "damaged", reasonNote: null }, "sandbox-support");
    rejectReturn(first.id, "sandbox-support", "outside window");

    // The full quantity should be claimable again since the rejected
    // return doesn't count against "already returned".
    const second = createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "damaged", reasonNote: null }, "sandbox-support");
    expect(second.status).toBe("requested");
  });

  it("won't let the same unit be claimed by two active returns at once", () => {
    const order = deliveredOrder();
    createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "other", reasonNote: null }, "sandbox-support");
    expect(() => createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "other", reasonNote: null }, "sandbox-support")).toThrow(ValidationError);
  });

  it("can't receive a return that hasn't been approved yet", () => {
    const order = deliveredOrder();
    const request = createReturn({ orderId: order.id, items: [{ variantId, quantity: 1 }], reason: "other", reasonNote: null }, "sandbox-support");
    expect(() => markReturnReceived(request.id, "sandbox-warehouse")).toThrow(ConflictError);
  });
});
