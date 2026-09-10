export interface CustomerRecord {
  key: string;
  note: string | null;
  vipOverride: boolean | null; // null = use the computed segment; true/false forces it
  updatedBy: string | null;
  updatedAt: string | null;
}

const globalCrm = globalThis as typeof globalThis & { __veyCrm?: Map<string, CustomerRecord> };
if (!globalCrm.__veyCrm) {
  globalCrm.__veyCrm = new Map();
}

function store(): Map<string, CustomerRecord> {
  return globalCrm.__veyCrm!;
}

export function customerKeyFor(name: string): string {
  return name.trim().toLowerCase();
}

export function getCustomerRecord(key: string): CustomerRecord {
  return (
    store().get(key) ?? {
      key,
      note: null,
      vipOverride: null,
      updatedBy: null,
      updatedAt: null,
    }
  );
}

export function updateCustomerRecord(
  key: string,
  input: { note?: string | null; vipOverride?: boolean | null },
  actorId: string
): CustomerRecord {
  const current = getCustomerRecord(key);
  const updated: CustomerRecord = {
    ...current,
    note: input.note !== undefined ? input.note : current.note,
    vipOverride: input.vipOverride !== undefined ? input.vipOverride : current.vipOverride,
    updatedBy: actorId,
    updatedAt: new Date().toISOString(),
  };
  store().set(key, updated);
  return updated;
}
