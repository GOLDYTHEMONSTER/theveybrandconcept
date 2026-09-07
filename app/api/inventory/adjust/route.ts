import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { requireVariant } from "../../../../modules/catalog/store";
import { adjustStock, getReorderPoint, getStockByWarehouse } from "../../../../modules/inventory/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { createNotification } from "../../../../modules/notifications/store";
import { ValidationError } from "../../../../modules/shared/errors";
import { isWarehouse } from "../../../../modules/shared/warehouses";

/**
 * POST /api/inventory/adjust
 *
 * Reference implementation for every sensitive ERP mutation. Every layer
 * runs in order and every layer can independently reject the request:
 *
 *   1. Session + rate limit + permission -> guardMutation()
 *   2. Validation  -> reject malformed input before it touches the ledger
 *   3. Mutation    -> event-sourced: appends a ledger entry, never a bare
 *                     stock decrement (see modules/inventory/store.ts)
 *   4. Audit log   -> append-only record of what changed and why
 *
 * Never skip a layer "because the UI already checked" — the UI's job is
 * only to decide what buttons to show.
 */

interface AdjustBody {
  variantId: string;
  warehouse: string;
  quantityDelta: number;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "inventory.adjust");

    const body = (await request.json()) as Partial<AdjustBody>;
    if (!body.variantId || !body.warehouse || typeof body.quantityDelta !== "number" || !Number.isInteger(body.quantityDelta) || body.quantityDelta === 0 || !body.reason?.trim()) {
      throw new ValidationError("variantId, warehouse, a non-zero whole quantityDelta, and a reason are required");
    }
    if (!isWarehouse(body.warehouse)) {
      throw new ValidationError("Select a valid warehouse");
    }

    const { product, variant } = requireVariant(body.variantId);
    const before = getStockByWarehouse(variant.id).find((row) => row.warehouse === body.warehouse);

    adjustStock({
      variantId: variant.id,
      warehouse: body.warehouse,
      quantityDelta: body.quantityDelta,
      reason: body.reason.trim(),
      actorId: session.userId,
    });

    const after = getStockByWarehouse(variant.id).find((row) => row.warehouse === body.warehouse);

    recordAudit({
      action: "inventory.adjust",
      entityType: "product_variant",
      entityId: variant.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { onHand: before?.onHand ?? 0 },
      afterValue: { onHand: after?.onHand ?? 0 },
      reason: body.reason.trim(),
    });

    const reorderPoint = getReorderPoint(variant.sku);
    const beforeOnHand = before?.onHand ?? 0;
    const afterOnHand = after?.onHand ?? 0;
    if (afterOnHand <= 0 && beforeOnHand > 0) {
      createNotification({
        audienceRoles: ["executive", "warehouse_manager"],
        type: "inventory.out_of_stock",
        title: "Out of stock",
        message: `${product.name} is now out of stock at ${body.warehouse}`,
        href: "/inventory",
      });
    } else if (afterOnHand > 0 && afterOnHand <= reorderPoint && beforeOnHand > reorderPoint) {
      createNotification({
        audienceRoles: ["executive", "warehouse_manager"],
        type: "inventory.low_stock",
        title: "Low stock",
        message: `${product.name} at ${body.warehouse} dropped to ${afterOnHand} units (reorder point: ${reorderPoint})`,
        href: "/inventory",
      });
    }

    return NextResponse.json(
      { productName: product.name, sku: variant.sku, warehouse: body.warehouse, onHand: after?.onHand ?? 0 },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
