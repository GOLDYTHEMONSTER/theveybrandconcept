import Link from "next/link";
import { getSessionContext, requirePagePermission } from "../../../lib/auth/session";
import { listOrders } from "../../../modules/orders/store";
import { computeTrend, splitByRecency, WEEK_MS } from "../../../modules/shared/trend";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid, { type MetricCardData } from "../_components/MetricGrid";
import OrdersTable from "../_components/OrdersTable";

const STATUS_LABEL = { pending: "Pending", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" } as const;
const STATUS_TONE = { pending: "warning", processing: "neutral", shipped: "neutral", delivered: "positive", cancelled: "negative" } as const;

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  await requirePagePermission("orders.view");
  const session = await getSessionContext();

  const rows = listOrders();
  const pending = rows.filter((row) => row.status === "pending").length;
  const processing = rows.filter((row) => row.status === "processing").length;
  const revenue = rows.filter((row) => row.status !== "cancelled").reduce((sum, row) => sum + row.total, 0);
  const cancelledCount = rows.filter((row) => row.status === "cancelled").length;
  const canCreate = session.permissions.includes("orders.create");

  const { current: ordersThisWeek, previous: ordersLastWeek } = splitByRecency(rows, (r) => r.createdAt, WEEK_MS);
  const revenueThisWeek = ordersThisWeek.filter((r) => r.status !== "cancelled").reduce((sum, r) => sum + r.total, 0);
  const revenueLastWeek = ordersLastWeek.filter((r) => r.status !== "cancelled").reduce((sum, r) => sum + r.total, 0);
  const cancelledThisWeek = ordersThisWeek.filter((r) => r.status === "cancelled").length;
  const cancelledLastWeek = ordersLastWeek.filter((r) => r.status === "cancelled").length;

  const metrics: MetricCardData[] = [
    {
      label: "Orders today",
      value: String(rows.length),
      change: `${pending} awaiting confirmation`,
      tone: pending ? "warning" : "positive",
      trend: computeTrend(ordersThisWeek.length, ordersLastWeek.length, "up"),
      href: "/orders",
    },
    { label: "Ready to pack", value: String(processing), change: "Warehouse queue", tone: "neutral", href: "/orders?status=processing" },
    {
      label: "Revenue booked",
      value: `₦${(revenue / 1_000_000).toFixed(1)}M`,
      change: "Excludes cancelled orders",
      tone: "positive",
      trend: computeTrend(revenueThisWeek, revenueLastWeek, "up"),
      href: "/orders",
    },
    {
      label: "Cancelled",
      value: String(cancelledCount),
      change: "This week",
      tone: cancelledCount ? "warning" : "positive",
      trend: computeTrend(cancelledThisWeek, cancelledLastWeek, "down"),
      href: "/orders?status=cancelled",
    },
  ];

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Orders</p>
          <h1>Every order, one workflow.</h1>
          <p>From confirmation through delivery — order status, payment status and fulfilment all stay in sync in one place.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="orders.csv"
            rows={rows.map((row) => ({
              orderNumber: row.orderNumber,
              customer: row.customer,
              channel: row.channel,
              status: row.status,
              paymentStatus: row.paymentStatus,
              total: row.total,
              placedAt: row.createdAt,
            }))}
          />
          {canCreate && <Link className="erp-button primary" href="/orders/new">Create order <span>＋</span></Link>}
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Order metrics" />

      <OrdersTable rows={rows} statusLabel={STATUS_LABEL} statusTone={STATUS_TONE} initialStatus={searchParams.status} />
    </>
  );
}
