import { requirePagePermission } from "../../../../lib/auth/session";
import NewOrderForm from "../../_components/NewOrderForm";

export default async function NewOrderPage() {
  await requirePagePermission("orders.create");
  return <NewOrderForm />;
}
