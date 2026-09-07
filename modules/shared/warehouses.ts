export const WAREHOUSES = ["Lagos showroom", "Guangzhou hub"] as const;
export type Warehouse = (typeof WAREHOUSES)[number];

export function isWarehouse(value: unknown): value is Warehouse {
  return typeof value === "string" && (WAREHOUSES as readonly string[]).includes(value);
}
