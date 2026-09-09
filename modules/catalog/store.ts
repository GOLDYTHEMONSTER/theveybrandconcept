import { createHash, randomUUID } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";
import type { CreateProductInput, Product, ProductVariant } from "./domain";
import csvImport from "./csv-import.json";

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
    // The Vey Brand's real catalog now comes from csv-import.json below.
    // These 4 are kept because they're the site's only products with real
    // bundled photography *and* video -- the actual "Verify it" showcase
    // pieces the storefront's signature interaction was built around. The
    // other 6 original placeholders (Naha Veil, Barley, Omega, Solene,
    // Moho, Coca) were removed: four had exact- or near-duplicate names
    // against real CSV products and two had no photography at all, so
    // keeping them just cluttered the catalog with confusing lookalikes.
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
      featured: true,
      createdBy: "sandbox-executive",
      createdAt: now,
      variants: entry.variants.map((variant) => ({ ...variant, id: stableId(`variant:${variant.sku}`), productId })),
    };
  });
}

interface CsvImportVariant {
  csvVariantId: string;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
}

interface CsvImportProduct {
  csvProductId: string;
  name: string;
  category: Product["category"];
  description: string | null;
  imageUrl: string | null;
  images: string[];
  videoUrl: string | null;
  variants: CsvImportVariant[];
}

/**
 * The brand's real catalog export (products (1).csv), converted once into
 * JSON -- see modules/catalog/csv-import.json. Ids are derived from the
 * CSV's own Product ID / Variant ID columns rather than the product name,
 * so a duplicated or renamed title can't collide with the hand-written
 * seed catalog above.
 */
function seedCsvImportProducts(): Product[] {
  const now = new Date().toISOString();
  return (csvImport as CsvImportProduct[]).map((entry) => {
    const productId = stableId(`product:csv-${entry.csvProductId}`);
    return {
      id: productId,
      organizationId: ORGANIZATION_ID,
      name: entry.name,
      slug: slugify(entry.name),
      category: entry.category,
      description: entry.description,
      status: "active",
      imageUrl: entry.imageUrl,
      images: entry.images,
      videoUrl: entry.videoUrl,
      featured: false,
      createdBy: "sandbox-executive",
      createdAt: now,
      variants: entry.variants.map((variant) => ({
        id: stableId(`variant:csv-${variant.csvVariantId}`),
        productId,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
      })),
    };
  });
}

const globalCatalog = globalThis as typeof globalThis & { __veyCatalog?: Product[] };
if (!globalCatalog.__veyCatalog) {
  globalCatalog.__veyCatalog = [...seedProducts(), ...seedCsvImportProducts()];
}

function store(): Product[] {
  return globalCatalog.__veyCatalog!;
}

export function listProducts(): Product[] {
  return store();
}

export function listVariants(): Array<
  ProductVariant & { productName: string; category: Product["category"]; imageUrl: string | null; images: string[]; videoUrl: string | null; featured: boolean }
> {
  return store().flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      productName: product.name,
      category: product.category,
      imageUrl: product.imageUrl,
      images: product.images,
      videoUrl: product.videoUrl,
      featured: product.featured,
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
    featured: false,
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    variants: [variant],
  };

  store().unshift(product);
  return { product, variant };
}

export function setProductFeatured(productId: string, featured: boolean): Product {
  const product = getProduct(productId);
  if (!product) throw new NotFoundError("Product not found");
  product.featured = featured;
  return product;
}

export interface UpdateProductInput {
  name?: string;
  category?: Product["category"];
  description?: string | null;
  status?: Product["status"];
  imageUrl?: string | null;
  images?: string[];
  videoUrl?: string | null;
  featured?: boolean;
}

export function updateProduct(productId: string, input: UpdateProductInput): Product {
  const product = getProduct(productId);
  if (!product) throw new NotFoundError("Product not found");
  if (input.name !== undefined) {
    product.name = input.name;
    product.slug = slugify(input.name);
  }
  if (input.category !== undefined) product.category = input.category;
  if (input.description !== undefined) product.description = input.description;
  if (input.status !== undefined) product.status = input.status;
  if (input.imageUrl !== undefined) product.imageUrl = input.imageUrl;
  if (input.images !== undefined) product.images = input.images;
  if (input.videoUrl !== undefined) product.videoUrl = input.videoUrl;
  if (input.featured !== undefined) product.featured = input.featured;
  return product;
}

export interface AddVariantInput {
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  compareAtPrice: number | null;
}

export function addVariant(productId: string, input: AddVariantInput): ProductVariant {
  const product = getProduct(productId);
  if (!product) throw new NotFoundError("Product not found");
  const sku = input.sku.toUpperCase();
  if (findVariantBySku(sku)) throw new ConflictError(`SKU ${sku} is already in use`);

  const variant: ProductVariant = {
    id: randomUUID(),
    productId,
    sku,
    color: input.color,
    size: input.size,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
  };
  product.variants.push(variant);
  return variant;
}

export interface UpdateVariantInput {
  color?: string | null;
  size?: string | null;
  price?: number;
  compareAtPrice?: number | null;
}

export function updateVariant(variantId: string, input: UpdateVariantInput): ProductVariant {
  const found = getVariant(variantId);
  if (!found) throw new NotFoundError("Product variant not found");
  const { variant } = found;
  if (input.color !== undefined) variant.color = input.color;
  if (input.size !== undefined) variant.size = input.size;
  if (input.price !== undefined) variant.price = input.price;
  if (input.compareAtPrice !== undefined) variant.compareAtPrice = input.compareAtPrice;
  return variant;
}

export function removeVariant(variantId: string): void {
  const found = getVariant(variantId);
  if (!found) throw new NotFoundError("Product variant not found");
  if (found.product.variants.length <= 1) {
    throw new ValidationError("A product must keep at least one size or variant — remove the product instead");
  }
  found.product.variants = found.product.variants.filter((variant) => variant.id !== variantId);
}
