import { requirePagePermission } from "../../../lib/auth/session";
import { getAnalyticsMetrics, getChannelBreakdown, getRevenueTrend, getTopProducts } from "../../../modules/analytics/service";
import RevenueTrendChart from "../_components/charts/RevenueTrendChart";
import TopProductsBarChart from "../_components/charts/TopProductsBarChart";
import ChannelSplitChart from "../_components/charts/ChannelSplitChart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requirePagePermission("analytics.view");

  const metrics = getAnalyticsMetrics();
  const revenueTrend = getRevenueTrend(7);
  const topProducts = getTopProducts(5);
  const channels = getChannelBreakdown();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Analytics</p>
          <h1>The business, in numbers.</h1>
          <p>Computed live from real orders and inventory — the same data your team works with in Orders and Inventory.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Analytics metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <article className="erp-panel" style={{ marginBottom: 18 }}>
        <div className="panel-heading"><div><p className="erp-eyebrow">Last 7 days</p><h2>Revenue trend</h2></div></div>
        <RevenueTrendChart points={revenueTrend} />
      </article>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Best sellers</p><h2>Revenue by product</h2></div></div>
          <TopProductsBarChart rows={topProducts} />
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Channels</p><h2>Revenue split</h2></div></div>
          <ChannelSplitChart rows={channels} />
        </article>
      </section>
    </>
  );
}
