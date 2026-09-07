import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../modules/audit/sandbox-log";
import { parseCreateProductInput } from "../../../modules/catalog/validation";
import { createProduct } from "../../../modules/catalog/store";
import { seedInitialStock } from "../../../modules/inventory/store";
import { guardMutation, handleApiError } from "../../../modules/security/api-guard";
import { createNotification } from "../../../modules/notifications/store";

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "products.create");
    const input = parseCreateProductInput(await request.json());

    const { product, variant } = createProduct(input, session.userId);
    if (input.initialStock > 0) {
      seedInitialStock({ variantId: variant.id, warehouse: input.warehouse, quantity: input.initialStock, actorId: session.userId });
    }

    recordAudit({
      action: "products.create",
      entityType: "product",
      entityId: product.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { name: product.name, sku: variant.sku, price: variant.price, initialStock: input.initialStock, warehouse: input.warehouse },
    });

    createNotification({
      audienceRoles: ["executive", "warehouse_manager"],
      type: "product.created",
      title: "New product added",
      message: `${product.name} (${variant.sku}) was added by ${session.name}`,
      href: "/inventory",
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
