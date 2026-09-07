import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/auth/session";
import { requireVariant } from "../../../../../modules/catalog/store";
import { getStockByWarehouse } from "../../../../../modules/inventory/store";
import AdjustStockForm from "../../../_components/AdjustStockForm";

export default async function AdjustStockPage({
  params,
  searchParams,
}: {
  params: { variantId: string };
  searchParams: { warehouse?: string };
}) {
  await requirePagePermission("inventory.adjust");

  const found = (() => {
    try {
      return requireVariant(params.variantId);
    } catch {
      return null;
    }
  })();
  if (!found) notFound();

  const { product, variant } = found;
  const stockByWarehouse = getStockByWarehouse(variant.id);
  const variantLabel = [variant.size, variant.color].filter(Boolean).join(" · ") || "Standard";

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Inventory · Adjust stock</p>
          <h1>{product.name}</h1>
          <p>{variantLabel} · SKU {variant.sku}</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Record a movement</p><h2>New adjustment</h2></div></div>
          <AdjustStockForm variantId={variant.id} defaultWarehouse={searchParams.warehouse ?? stockByWarehouse[0].warehouse} />
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Current stock</p><h2>By warehouse</h2></div></div>
          <div className="focus-list">
            {stockByWarehouse.map((row) => (
              <div className="focus-row" key={row.warehouse}>
                <span className="focus-index">●</span>
                <div><strong>{row.warehouse}</strong><small>{row.reserved} reserved · {row.available} available</small></div>
                <b>{row.onHand}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
