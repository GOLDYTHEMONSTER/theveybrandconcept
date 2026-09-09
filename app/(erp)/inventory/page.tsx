import Link from "next/link";
import { getSessionContext, requirePagePermission } from "../../../lib/auth/session";
import {
  getInventoryMetrics,
  getInventoryRows,
} from "../../../modules/inventory/service";
import InventoryTable from "../_components/InventoryTable";

const STATUS_LABEL = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" } as const;
const STATUS_TONE = { in_stock: "positive", low_stock: "warning", out_of_stock: "negative" } as const;

export default async function InventoryPage() {
  await requirePagePermission("inventory.view");
  const session = await getSessionContext();

  const metrics = getInventoryMetrics();
  const rows = getInventoryRows();
  const canAdjust = session.permissions.includes("inventory.adjust");
  const canCreateProduct = session.permissions.includes("products.create");

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Inventory</p>
          <h1>Stock across every location.</h1>
          <p>Live counts from the inventory ledger — every adjustment, transfer and sale is recorded as a movement, never a silent overwrite.</p>
        </div>
        {canCreateProduct && (
          <div className="erp-hero-actions">
            <Link className="erp-button primary" href="/inventory/new">Create product <span>＋</span></Link>
          </div>
        )}
      </section>

      <section className="metric-grid" aria-label="Inventory metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <InventoryTable rows={rows} statusLabel={STATUS_LABEL} statusTone={STATUS_TONE} canAdjust={canAdjust} canManageFeatured={canCreateProduct} />
    </>
  );
}
