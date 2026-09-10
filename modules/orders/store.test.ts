import { beforeAll, describe, expect, it } from "vitest";
import { listVariants } from "../catalog/store";
import { getStockTotals } from "../inventory/store";
import { ConflictError } from "../shared/errors";
import {
  cancelOrder,
  createOrder,
  markDelivered,
  shipOrder,
  startProcessing,
} from "./store";

let variantId: string;

beforeAll(() => {
  // Any catalog variant works -- the state machine doesn't care which
  // product it is, only that stock is available to reserve.
  variantId = listVariants()[0].id;
});

function newOrder() {
  return createOrder(
    { customer: "Test Customer", channel: "Online store", items: [{ variantId, quantity: 1 }] },
    "sandbox-sales"
  );
}

describe("order lifecycle", () => {
  it("starts pending and walks the happy path to delivered", () => {
    const order = newOrder();
    expect(order.status).toBe("pending");

    const processing = startProcessing(order.id, "sandbox-sales");
    expect(processing.status).toBe("processing");

    const shipped = shipOrder(order.id, { carrier: "GIG Logistics", trackingNumber: "GIG123456" }, "sandbox-warehouse");
    expect(shipped.status).toBe("shipped");
    expect(shipped.shipmentId).not.toBeNull();

    const delivered = markDelivered(order.id, "sandbox-warehouse");
    expect(delivered.status).toBe("delivered");
  });

  it("rejects skipping a stage -- pending straight to shipped", () => {
    const order = newOrder();
    expect(() => shipOrder(order.id, { carrier: "GIG Logistics", trackingNumber: "GIG000000" }, "sandbox-warehouse")).toThrow(ConflictError);
  });

  it("rejects any transition out of a terminal state", () => {
    const order = newOrder();
    startProcessing(order.id, "sandbox-sales");
    shipOrder(order.id, { carrier: "DHL", trackingNumber: "DHL999999" }, "sandbox-warehouse");
    markDelivered(order.id, "sandbox-warehouse");

    expect(() => cancelOrder(order.id, "sandbox-sales", "changed my mind")).toThrow(ConflictError);
  });

  it("cancelling releases the reservation instead of leaving stock held", () => {
    const before = getStockTotals(variantId);
    const order = newOrder();
    const afterReserve = getStockTotals(variantId);
    expect(afterReserve.available).toBe(before.available - 1);

    cancelOrder(order.id, "sandbox-sales", "customer request");
    const afterCancel = getStockTotals(variantId);
    expect(afterCancel.available).toBe(before.available);
  });

  it("cancelling twice is rejected, not silently accepted", () => {
    const order = newOrder();
    cancelOrder(order.id, "sandbox-sales", "first cancel");
    expect(() => cancelOrder(order.id, "sandbox-sales", "second cancel")).toThrow(ConflictError);
  });
});
