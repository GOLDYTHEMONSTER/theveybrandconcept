import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/session";
import { getAnalyticsMetrics, getChannelBreakdown, getOrderStatusBreakdown, getRevenueTrend, getTopProducts } from "../../../modules/analytics/service";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import RevenueTrendChart from "../_components/charts/RevenueTrendChart";
import TopProductsBarChart from "../_components/charts/TopProductsBarChart";
import ChannelSplitChart from "../_components/charts/ChannelSplitChart";
import OrderStatusBreakdownChart from "../_components/charts/OrderStatusBreakdownChart";

export const dynamic = "force-dynamic";

const METRIC_HREF: Record<string, string> = {
  Revenue: "/orders",
  "Orders fulfilled": "/orders?status=delivered",
  "Order success rate": "/orders?status=cancelled",
  "Repeat customers": "/customers",
  "Return rate": "/returns",
};

export default async function AnalyticsPage() {
  await requirePagePermission("analytics.view");

  const metrics = getAnalyticsMetrics().map((metric) => ({ ...metric, href: METRIC_HREF[metric.label] }));
  const revenueTrend = getRevenueTrend(7);
  const topProducts = getTopProducts(5);
  const channels = getChannelBreakdown();
  const statusBreakdown = getOrderStatusBreakdown();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Analytics</p>
          <h1>The business, in numbers.</h1>
          <p>Computed live from real orders and inventory — the same data your team works with in Orders and Inventory.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton filename="top-products.csv" rows={topProducts.map((row) => ({ product: row.label, revenue: row.revenue, units: row.units }))} />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Analytics metrics" />

      <article className="erp-panel" style={{ marginBottom: 18 }}>
        <div className="panel-heading"><div><p className="erp-eyebrow">Last 7 days</p><h2>Revenue trend</h2></div><Link href="/orders">View orders</Link></div>
        <RevenueTrendChart points={revenueTrend} />
      </article>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Best sellers</p><h2>Revenue by product</h2></div><Link href="/inventory">See all products</Link></div>
          <TopProductsBarChart rows={topProducts} />
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Channels</p><h2>Revenue split</h2></div><Link href="/orders">View orders</Link></div>
          <ChannelSplitChart rows={channels} />
        </article>
      </section>

      <article className="erp-panel" style={{ marginTop: 18 }}>
        <div className="panel-heading"><div><p className="erp-eyebrow">Fulfilment funnel</p><h2>Orders by status</h2></div><Link href="/orders">View orders</Link></div>
        <OrderStatusBreakdownChart rows={statusBreakdown} />
      </article>
    </>
  );
}
