import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePagePermission } from "../../../../../lib/auth/session";
import { getProduct } from "../../../../../modules/catalog/store";
import { getStockByWarehouse } from "../../../../../modules/inventory/store";
import ProductDetailsForm from "../../../_components/ProductDetailsForm";
import ProductImagesManager from "../../../_components/ProductImagesManager";
import ProductVariantsManager from "../../../_components/ProductVariantsManager";

export const dynamic = "force-dynamic";

export default async function ProductEditPage({ params }: { params: { productId: string } }) {
  await requirePagePermission("products.create");

  const product = getProduct(params.productId);
  if (!product) notFound();

  const variantsWithStock = product.variants.map((variant) => ({
    variant,
    stock: getStockByWarehouse(variant.id),
  }));

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Inventory · Edit product</p>
          <h1>{product.name}</h1>
          <p>{product.category} · {product.status === "active" ? "Active" : "Draft"} · {product.variants.length} size{product.variants.length === 1 ? "" : "s"}</p>
        </div>
        <div className="erp-hero-actions">
          <Link href="/inventory" className="erp-button secondary">Back to inventory</Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Details</p><h2>Product information</h2></div></div>
          <ProductDetailsForm product={product} />
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Media</p><h2>Images</h2></div></div>
          <ProductImagesManager productId={product.id} imageUrl={product.imageUrl} images={product.images} />
        </article>
      </section>

      <section className="erp-panel" style={{ marginTop: 18 }}>
        <div className="panel-heading"><div><p className="erp-eyebrow">Sizes &amp; pricing</p><h2>Variants</h2></div></div>
        <ProductVariantsManager productId={product.id} variantsWithStock={variantsWithStock} />
      </section>
    </>
  );
}
