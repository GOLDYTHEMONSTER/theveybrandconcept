import { ValidationError } from "../shared/errors";
import { isWarehouse } from "../shared/warehouses";
import { CATEGORIES, type Category, type CreateProductInput, type ProductStatus, PRODUCT_STATUSES } from "./domain";

function requiredString(value: unknown, field: string, { min = 1, max = 200 } = {}): string {
  if (typeof value !== "string" || value.trim().length < min) {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be ${max} characters or fewer`);
  }
  return trimmed;
}

function optionalString(value: unknown, max = 500): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("Invalid text value");
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`Value must be ${max} characters or fewer`);
  return trimmed || null;
}

function requiredPositiveNumber(value: unknown, field: string): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || Number.isNaN(num) || num <= 0) {
    throw new ValidationError(`${field} must be a number greater than 0`);
  }
  return Math.round(num * 100) / 100;
}

function requiredNonNegativeInteger(value: unknown, field: string): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
    throw new ValidationError(`${field} must be a whole number of 0 or more`);
  }
  return num;
}

/**
 * The single source of truth for what "Create Product" requires. The
 * form on the client mirrors these same fields with `required`
 * attributes, but that is UX only — this is the actual boundary.
 */
export function parseCreateProductInput(input: unknown): CreateProductInput {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Product details are required");
  }
  const candidate = input as Record<string, unknown>;

  const name = requiredString(candidate.name, "Product name", { min: 2, max: 120 });

  const category = requiredString(candidate.category, "Category") as Category;
  if (!CATEGORIES.includes(category)) {
    throw new ValidationError(`Category must be one of: ${CATEGORIES.join(", ")}`);
  }

  const statusRaw = candidate.status ?? "active";
  const status = requiredString(statusRaw, "Status") as ProductStatus;
  if (!PRODUCT_STATUSES.includes(status)) {
    throw new ValidationError(`Status must be one of: ${PRODUCT_STATUSES.join(", ")}`);
  }

  const sku = requiredString(candidate.sku, "SKU", { min: 3, max: 40 }).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(sku)) {
    throw new ValidationError("SKU may only contain letters, numbers and hyphens");
  }

  const price = requiredPositiveNumber(candidate.price, "Price");
  const compareAtPrice = candidate.compareAtPrice === undefined || candidate.compareAtPrice === null || candidate.compareAtPrice === ""
    ? null
    : requiredPositiveNumber(candidate.compareAtPrice, "Compare-at price");

  const initialStock = requiredNonNegativeInteger(candidate.initialStock, "Initial stock");

  const warehouse = requiredString(candidate.warehouse, "Warehouse");
  if (!isWarehouse(warehouse)) {
    throw new ValidationError("Select a valid warehouse");
  }

  const imageUrl = optionalString(candidate.imageUrl, 300);
  if (imageUrl && !imageUrl.startsWith("/products/")) {
    throw new ValidationError("Invalid image reference");
  }

  return {
    name,
    category,
    description: optionalString(candidate.description, 2000),
    status,
    imageUrl,
    sku,
    color: optionalString(candidate.color, 40),
    size: optionalString(candidate.size, 20),
    price,
    compareAtPrice,
    initialStock,
    warehouse,
  };
}
