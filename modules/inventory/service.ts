import { listVariants } from "../catalog/store";
import { computeTrend, splitByRecency, WEEK_MS, type Trend } from "../shared/trend";
import { getAssignedWarehouses, getReorderPoint, getStockByWarehouse, listLedgerEntries } from "./store";

export interface InventoryRow {
  variantId: string;
  productId: string;
  product: string;
  featured: boolean;
  variant: string;
  imageUrl: string | null;
  sku: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface InventoryMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
  trend?: Trend;
}

function statusFor(onHand: number, reorderPoint: number): InventoryRow["status"] {
  if (onHand <= 0) return "out_of_stock";
  if (onHand <= reorderPoint) return "low_stock";
  return "in_stock";
}

const STATUS_LABEL: Record<InventoryRow["status"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const STATUS_TONE: Record<InventoryRow["status"], string> = {
  in_stock: "positive",
  low_stock: "warning",
  out_of_stock: "negative",
};

export function getInventoryRows(): InventoryRow[] {
  const rows: InventoryRow[] = [];
  for (const variant of listVariants()) {
    const reorderPoint = getReorderPoint(variant.sku);
    const variantLabel = [variant.size, variant.color].filter(Boolean).join(" · ") || "Standard";
    const assignedWarehouses = new Set(getAssignedWarehouses(variant.id));
    for (const stock of getStockByWarehouse(variant.id)) {
      if (!assignedWarehouses.has(stock.warehouse)) continue;
      rows.push({
        variantId: variant.id,
        productId: variant.productId,
        product: variant.productName,
        featured: variant.featured,
        variant: variantLabel,
        imageUrl: variant.imageUrl,
        sku: variant.sku,
        warehouse: stock.warehouse,
        onHand: stock.onHand,
        reserved: stock.reserved,
        available: stock.available,
        reorderPoint,
        status: statusFor(stock.onHand, reorderPoint),
      });
    }
  }
  return rows.sort((a, b) => a.product.localeCompare(b.product));
}

export function getInventoryStatusLabel(status: InventoryRow["status"]): string {
  return STATUS_LABEL[status];
}

export function getInventoryStatusTone(status: InventoryRow["status"]): string {
  return STATUS_TONE[status];
}

export function getInventoryValue(): number {
  const priceBySku = new Map(listVariants().map((variant) => [variant.sku, variant.price]));
  return getInventoryRows().reduce((sum, row) => sum + row.onHand * (priceBySku.get(row.sku) ?? 0), 0);
}

export function getInventoryMetrics(): InventoryMetric[] {
  const rows = getInventoryRows();
  const lowStock = rows.filter((row) => row.status === "low_stock").length;
  const outOfStock = rows.filter((row) => row.status === "out_of_stock").length;
  const unitsAvailable = rows.reduce((sum, row) => sum + Math.max(0, row.available), 0);
  const warehouses = new Set(rows.map((row) => row.warehouse)).size;

  // Stock levels are a point-in-time snapshot with no stored history, so
  // "units available" can't be compared to "units available last week"
  // directly -- but the ledger records every movement with a timestamp,
  // so net on-hand movement (restocks minus adjustments/sales) this week
  // vs last week is a real, honest proxy for whether stock is trending up.
  const onHandEntries = listLedgerEntries().filter((entry) => entry.bucket === "on_hand");
  const { current, previous } = splitByRecency(onHandEntries, (entry) => entry.occurredAt, WEEK_MS);
  const netThisWeek = current.reduce((sum, entry) => sum + entry.quantity, 0);
  const netLastWeek = previous.reduce((sum, entry) => sum + entry.quantity, 0);

  return [
    {
      label: "Units available",
      value: unitsAvailable.toLocaleString(),
      change: `Across ${warehouses} locations`,
      tone: "neutral",
      trend: computeTrend(netThisWeek, netLastWeek, "up"),
    },
    { label: "Low stock lines", value: String(lowStock), change: "Reorder suggested", tone: lowStock ? "warning" : "positive" },
    { label: "Out of stock", value: String(outOfStock), change: outOfStock ? "Needs attention" : "All lines covered", tone: outOfStock ? "warning" : "positive" },
    { label: "SKUs tracked", value: String(listVariants().length), change: "Live inventory ledger", tone: "neutral" },
  ];
}
