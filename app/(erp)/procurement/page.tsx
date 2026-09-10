import { requirePagePermission } from "../../../lib/auth/session";
import { getProcurementMetrics, getPurchaseOrderRows, getReorderSuggestions } from "../../../modules/procurement/service";
import CreatePurchaseOrderButton from "../_components/CreatePurchaseOrderButton";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import PurchaseOrderActions from "../_components/PurchaseOrderActions";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const session = await requirePagePermission("procurement.view");
  const canManage = session.permissions.includes("inventory.adjust");

  const suggestions = getReorderSuggestions();
  const rows = getPurchaseOrderRows();
  const metrics = getProcurementMetrics();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Procurement</p>
          <h1>Keep stock flowing in.</h1>
          <p>Low and out-of-stock lines surface here automatically — turn them into a purchase order, then receive it straight into inventory.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="purchase-orders.csv"
            rows={rows.map((row) => ({ po: `PO-${row.poNumber}`, product: row.productName, variant: row.variantLabel, sku: row.sku, warehouse: row.warehouse, supplier: row.supplier, quantity: row.quantity, status: row.statusLabel, expected: row.expectedDateLabel ?? "" }))}
          />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Procurement metrics" />

      <section style={{ marginBottom: 16 }}>
        <p className="erp-eyebrow">Needs attention</p>
        <h2 style={{ font: "500 23px 'Playfair Display', serif", margin: "0 0 16px" }}>Reorder suggestions</h2>
      </section>

      {suggestions.length === 0 ? (
        <p className="sandbox-note" style={{ marginBottom: 30 }}>
          <span>●</span> Every low-stock line already has an open purchase order, or nothing needs reordering right now.
        </p>
      ) : (
        <div className="erp-table-wrap" style={{ marginBottom: 36 }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Warehouse</th>
                <th>On hand</th>
                <th>Reorder point</th>
                <th>Supplier</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => (
                <tr key={`${suggestion.variantId}-${suggestion.warehouse}`}>
                  <td><strong>{suggestion.productName}</strong><small>{suggestion.variantLabel} · {suggestion.sku}</small></td>
                  <td>{suggestion.warehouse}</td>
                  <td className="numeric">{suggestion.onHand}</td>
                  <td className="numeric">{suggestion.reorderPoint}</td>
                  <td>{suggestion.supplier}</td>
                  {canManage && (
                    <td>
                      <CreatePurchaseOrderButton variantId={suggestion.variantId} warehouse={suggestion.warehouse} quantity={suggestion.suggestedQuantity} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section style={{ marginBottom: 16 }}>
        <p className="erp-eyebrow">History</p>
        <h2 style={{ font: "500 23px 'Playfair Display', serif", margin: "0 0 16px" }}>Purchase orders</h2>
      </section>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>PO</th>
              <th>Product</th>
              <th>Warehouse</th>
              <th>Supplier</th>
              <th>Quantity</th>
              <th>Expected</th>
              <th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>PO-{row.poNumber}</strong></td>
                <td><strong>{row.productName}</strong><small>{row.variantLabel} · {row.sku}</small></td>
                <td>{row.warehouse}</td>
                <td>{row.supplier}</td>
                <td className="numeric">{row.quantity}</td>
                <td>{row.expectedDateLabel ?? "—"}</td>
                <td><span className={`status-pill ${row.statusTone}`}>{row.statusLabel}</span></td>
                {canManage && (
                  <td>
                    <PurchaseOrderActions id={row.id} status={row.status} />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={canManage ? 8 : 7} style={{ textAlign: "center", color: "var(--muted)" }}>No purchase orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
