import Link from "next/link";
import { getSessionContext, requirePagePermission } from "../../../lib/auth/session";
import {
  getInventoryMetrics,
  getInventoryRows,
} from "../../../modules/inventory/service";
import ExportCsvButton from "../_components/ExportCsvButton";
import InventoryTable from "../_components/InventoryTable";
import MetricGrid from "../_components/MetricGrid";

const STATUS_LABEL = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" } as const;
const STATUS_TONE = { in_stock: "positive", low_stock: "warning", out_of_stock: "negative" } as const;

export default async function InventoryPage() {
  await requirePagePermission("inventory.view");
  const session = await getSessionContext();

  const metrics = getInventoryMetrics();
  const rows = getInventoryRows();
  const canAdjust = session.permissions.includes("inventory.adjust");
  const canTransfer = session.permissions.includes("inventory.transfer");
  const canCreateProduct = session.permissions.includes("products.create");

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Inventory</p>
          <h1>Stock across every location.</h1>
          <p>Live counts from the inventory ledger — every adjustment, transfer and sale is recorded as a movement, never a silent overwrite.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="inventory.csv"
            rows={rows.map((row) => ({
              product: row.product,
              variant: row.variant,
              sku: row.sku,
              warehouse: row.warehouse,
              onHand: row.onHand,
              reserved: row.reserved,
              available: row.available,
              status: row.status,
            }))}
          />
          {canCreateProduct && <Link className="erp-button primary" href="/inventory/new">Create product <span>＋</span></Link>}
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Inventory metrics" />

      <InventoryTable rows={rows} statusLabel={STATUS_LABEL} statusTone={STATUS_TONE} canAdjust={canAdjust} canTransfer={canTransfer} canManageFeatured={canCreateProduct} />
    </>
  );
}
