import { createHash, randomUUID } from "crypto";
import { ConflictError, NotFoundError } from "../shared/errors";
import type { CreateProductInput, Product, ProductVariant } from "./domain";

const ORGANIZATION_ID = "theveybrand-sandbox";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Deterministic id for the fixed seed catalog. Vercel can route requests
 * for the same product to different serverless instances, and each one
 * re-runs this module fresh -- randomUUID() there meant every instance
 * invented different ids for the same 10 products, so a link built from
 * one instance's id 404'd the moment a follow-up request (viewing the
 * product, adding it to cart) landed on another. Seed ids must be a pure
 * function of the product's own data, not randomness. Runtime-created
 * products (createProduct below) are real new entities each time, so
 * those still get a real random id.
 */
function stableId(seed: string): string {
  const hex = createHash("sha1").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function seedProducts(): Product[] {
  const seed: Array<{
    name: string;
    category: Product["category"];
    description: string;
    imageUrl: string | null;
    images?: string[];
    videoUrl?: string | null;
    variants: Array<Omit<ProductVariant, "id" | "productId">>;
  }> = [
    {
      name: "Naha Veil Sequence Dress",
      category: "Dresses",
      description: "A fitted sequence dress in soft champagne, cut close through the body with a hand-finished hem. Built for evening light — the kind of piece that catches every angle without trying too hard.",
      imageUrl: "/products/naha-veil-sequence-dress.jpg",
      variants: [
        { sku: "VY-NVD-S-CH", color: "Champagne", size: "S", price: 76000, compareAtPrice: null },
        { sku: "VY-NVD-M-CH", color: "Champagne", size: "M", price: 76000, compareAtPrice: null },
      ],
    },
    {
      name: "Barley Sequence Dress",
      category: "Dresses",
      description: "Navy sequins shot through with silver, a mermaid silhouette that skims the waist and flares below the knee. Structured shoulder detail keeps it from ever feeling costume-y.",
      imageUrl: "/products/barley-sequence-dress.jpg",
      variants: [
        { sku: "VY-BSD-M-NS", color: "Navy-Silver", size: "M", price: 84000, compareAtPrice: 96000 },
        { sku: "VY-BSD-L-NS", color: "Navy-Silver", size: "L", price: 84000, compareAtPrice: 96000 },
      ],
    },
    {
      name: "Omega Sequence Dress",
      category: "Gowns",
      description: "Onyx sequins on a full-length gown with a deep V-back. Weighted hem for a clean drape, built for the kind of room where you want the dress to move when you do.",
      imageUrl: null,
      variants: [
        { sku: "VY-OMG-M-ON", color: "Onyx", size: "M", price: 112000, compareAtPrice: null },
        { sku: "VY-OMG-L-ON", color: "Onyx", size: "L", price: 112000, compareAtPrice: null },
      ],
    },
    {
      name: "Solene Wrap Gown",
      category: "Gowns",
      description: "Ivory wrap gown with a soft cowl neckline and a self-tie waist. Quietly dramatic — the fabric does the work, no embellishment needed.",
      imageUrl: null,
      variants: [
        { sku: "VY-SWG-S-IV", color: "Ivory", size: "S", price: 98000, compareAtPrice: null },
        { sku: "VY-SWG-M-IV", color: "Ivory", size: "M", price: 98000, compareAtPrice: null },
      ],
    },
    {
      name: "Moho Dress",
      category: "Gowns",
      description: "A plunging halter neckline in white, finished with hand-set stones from shoulder to hem. Column silhouette, side slit — built for a single grand entrance.",
      imageUrl: "/products/moho-dress.jpg",
      variants: [{ sku: "VY-MOH-M-WH", color: "White", size: "M", price: 68000, compareAtPrice: null }],
    },
    {
      name: "Coca Stud Dress",
      category: "Dresses",
      description: "Copper mesh, fully stud-embellished, cut long and lean with a high halter neck and open back. Best worn somewhere with good lighting.",
      imageUrl: "/products/coca-stud-dress.jpg",
      variants: [{ sku: "VY-COC-M-BR", color: "Copper Mesh", size: "M", price: 72000, compareAtPrice: null }],
    },
    // Storefront flagship pieces (public/index.html + shop.html) — kept in
    // sync by SKU with the hardcoded showroom entries in public/script.js.
    {
      name: "The Sienna Gown",
      category: "Gowns",
      description: "An editorial evening piece designed for red-carpet moments and private dinners. A structured bodice and hidden shaping give way to a fluid skirt that holds its line without weighing the body down — dramatic, but worn with ease.",
      imageUrl: "/product1/fashn-export-1786297249232.webp",
      images: [
        "/product1/fashn-export-1786297249232.webp",
        "/product1/fashn-export-1786193085690.webp",
        "/product1/0d6b541c953ad00fd2967e69b791dc60e61b5662.webp",
      ],
      videoUrl: "/product1/fashn-export-1786297223826.mp4",
      variants: [{ sku: "VY-SIENNA-GOWN", color: "Champagne", size: null, price: 145000, compareAtPrice: null }],
    },
    {
      name: "The Atelier Set",
      category: "Outerwear",
      description: "Soft tailoring in ivory, built as a considered two-piece rather than a single statement. Lounge-weight fabric with the finish of proper outerwear — equally at home over dinner or under a coat.",
      imageUrl: "/product2/fashn-export-1786299961980.webp",
      images: [
        "/product2/fashn-export-1786299961980.webp",
        "/product2/fashn-export-1786300035818.webp",
        "/product2/8822279671f6c00c92f6e1f073b90e12b7936f2b.webp",
      ],
      videoUrl: "/product2/fashn-export-1786300232150.mp4",
      variants: [{ sku: "VY-ATELIER-SET", color: "Ivory", size: null, price: 98000, compareAtPrice: null }],
    },
    {
      name: "The Noir Mini",
      category: "Dresses",
      description: "A sculpted cocktail dress that balances elegance and edge — a precise waistline over a fluid, body-skimming mini. Tailored shaping and a subtle sheen make it read as polished rather than overtly dressed-up.",
      imageUrl: "/product3/a025ab9385dadeb593946db6f70668ac1e237547.webp",
      images: [
        "/product3/a025ab9385dadeb593946db6f70668ac1e237547.webp",
        "/product3/fashn-export-1786446685459.webp",
        "/product3/fashn-export-1786446780454.webp",
      ],
      videoUrl: "/product3/fashn-export-1786446897296.mp4",
      variants: [{ sku: "VY-NOIR-MINI", color: "Midnight", size: null, price: 62000, compareAtPrice: null }],
    },
    {
      name: "The Velvet Shift",
      category: "Accessories",
      description: "A rosewood velvet top with a clean, architectural line. Relaxed drape at the body, structured through the neckline — built to layer for evening or dress down for daytime.",
      imageUrl: "/product4/9ff8a662b150b5824caf960e2decde085a087038.webp",
      images: [
        "/product4/9ff8a662b150b5824caf960e2decde085a087038.webp",
        "/product4/fashn-export-1786447149299.webp",
        "/product4/fashn-export-1786447226697.webp",
      ],
      videoUrl: "/product4/omega_video_0.mp4",
      variants: [{ sku: "VY-VELVET-SHIFT", color: "Rosewood", size: null, price: 54000, compareAtPrice: null }],
    },
  ];

  const now = new Date().toISOString();
  return seed.map((entry) => {
    const productId = stableId(`product:${entry.name}`);
    return {
      id: productId,
      organizationId: ORGANIZATION_ID,
      name: entry.name,
      slug: slugify(entry.name),
      category: entry.category,
      description: entry.description,
      status: "active",
      imageUrl: entry.imageUrl,
      images: entry.images ?? (entry.imageUrl ? [entry.imageUrl] : []),
      videoUrl: entry.videoUrl ?? null,
      createdBy: "sandbox-executive",
      createdAt: now,
      variants: entry.variants.map((variant) => ({ ...variant, id: stableId(`variant:${variant.sku}`), productId })),
    };
  });
}

const globalCatalog = globalThis as typeof globalThis & { __veyCatalog?: Product[] };
if (!globalCatalog.__veyCatalog) {
  globalCatalog.__veyCatalog = seedProducts();
}

function store(): Product[] {
  return globalCatalog.__veyCatalog!;
}

export function listProducts(): Product[] {
  return store();
}

export function listVariants(): Array<
  ProductVariant & { productName: string; category: Product["category"]; imageUrl: string | null; images: string[]; videoUrl: string | null }
> {
  return store().flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      productName: product.name,
      category: product.category,
      imageUrl: product.imageUrl,
      images: product.images,
      videoUrl: product.videoUrl,
    }))
  );
}

export function getProduct(productId: string): Product | undefined {
  return store().find((product) => product.id === productId);
}

export function getVariant(variantId: string): { product: Product; variant: ProductVariant } | undefined {
  for (const product of store()) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export function requireVariant(variantId: string): { product: Product; variant: ProductVariant } {
  const found = getVariant(variantId);
  if (!found) throw new NotFoundError("Product variant not found");
  return found;
}

export function findVariantBySku(sku: string): ProductVariant | undefined {
  return store()
    .flatMap((product) => product.variants)
    .find((variant) => variant.sku === sku.toUpperCase());
}

export function createProduct(input: CreateProductInput, actorId: string): { product: Product; variant: ProductVariant } {
  if (findVariantBySku(input.sku)) {
    throw new ConflictError(`SKU ${input.sku} is already in use`);
  }

  const productId = randomUUID();
  const variant: ProductVariant = {
    id: randomUUID(),
    productId,
    sku: input.sku,
    color: input.color,
    size: input.size,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
  };

  const product: Product = {
    id: productId,
    organizationId: ORGANIZATION_ID,
    name: input.name,
    slug: slugify(input.name),
    category: input.category,
    description: input.description,
    status: input.status,
    imageUrl: input.imageUrl,
    images: input.imageUrl ? [input.imageUrl] : [],
    videoUrl: null,
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    variants: [variant],
  };

  store().unshift(product);
  return { product, variant };
}
