import Link from "next/link";

export default function ErpNotFound() {
  return (
    <section className="erp-hero">
      <div>
        <p className="erp-eyebrow">404</p>
        <h1>Nothing here.</h1>
        <p>
          Whatever you were looking for — an order, a return, a product — doesn&apos;t exist, or the link to it
          was out of date. It hasn&apos;t been deleted from under you; it just isn&apos;t at this address.
        </p>
      </div>
      <div className="erp-hero-actions">
        <Link href="/dashboard" className="erp-button primary">Back to dashboard</Link>
      </div>
    </section>
  );
}
