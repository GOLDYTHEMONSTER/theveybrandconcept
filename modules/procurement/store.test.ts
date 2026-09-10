import { beforeAll, describe, expect, it } from "vitest";
import { listVariants } from "../catalog/store";
import { getStockTotals } from "../inventory/store";
import { ValidationError } from "../shared/errors";
import { cancelPurchaseOrder, createPurchaseOrder, markOrdered, receivePurchaseOrder } from "./store";

let variantId: string;

beforeAll(() => {
  variantId = listVariants()[0].id;
});

function draftPO(quantity = 10) {
  return createPurchaseOrder({
    variantId,
    warehouse: "Lagos showroom",
    quantity,
    createdById: "sandbox-warehouse",
    createdByName: "David Chen",
  });
}

describe("purchase order lifecycle", () => {
  it("starts as a draft and walks to received, actually restocking inventory", () => {
    const stockBefore = getStockTotals(variantId);
    const po = draftPO(15);
    expect(po.status).toBe("draft");

    markOrdered(po.id);
    const received = receivePurchaseOrder(po.id, "sandbox-warehouse");
    expect(received.status).toBe("received");
    expect(received.receivedAt).not.toBeNull();

    const stockAfter = getStockTotals(variantId);
    expect(stockAfter.onHand).toBe(stockBefore.onHand + 15);
  });

  it("can't receive a PO that's still a draft -- it has to be ordered first", () => {
    const po = draftPO();
    expect(() => receivePurchaseOrder(po.id, "sandbox-warehouse")).toThrow(ValidationError);
  });

  it("can't be cancelled once received", () => {
    const po = draftPO();
    markOrdered(po.id);
    receivePurchaseOrder(po.id, "sandbox-warehouse");
    expect(() => cancelPurchaseOrder(po.id)).toThrow(ValidationError);
  });

  it("rejects a quantity outside the sane range", () => {
    expect(() =>
      createPurchaseOrder({ variantId, warehouse: "Lagos showroom", quantity: 0, createdById: "sandbox-warehouse", createdByName: "David Chen" })
    ).toThrow(ValidationError);
    expect(() =>
      createPurchaseOrder({ variantId, warehouse: "Lagos showroom", quantity: 5000, createdById: "sandbox-warehouse", createdByName: "David Chen" })
    ).toThrow(ValidationError);
  });
});
