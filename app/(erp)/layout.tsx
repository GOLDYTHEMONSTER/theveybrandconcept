import { redirect } from "next/navigation";
import { getSessionContext } from "../../lib/auth/session";
import { getInventoryRows } from "../../modules/inventory/service";
import { listOrders } from "../../modules/orders/store";
import { listReturns } from "../../modules/returns/store";
import ErpShell from "./_components/ErpShell";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await getSessionContext();
  } catch {
    redirect("/login");
  }

  const lowStockCount = getInventoryRows().filter((row) => row.status !== "in_stock").length;
  const pendingOrdersCount = listOrders().filter((order) => order.status === "pending").length;
  const pendingReturnsCount = listReturns().filter((r) => r.status === "requested").length;

  return (
    <ErpShell
      roleLabel={session.roleLabel}
      name={session.name}
      permissions={session.permissions}
      badges={{ "/inventory": lowStockCount, "/orders": pendingOrdersCount, "/returns": pendingReturnsCount }}
    >
      {children}
    </ErpShell>
  );
}
