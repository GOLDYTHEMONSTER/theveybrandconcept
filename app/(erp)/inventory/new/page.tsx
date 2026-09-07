import { requirePagePermission } from "../../../../lib/auth/session";
import NewProductForm from "../../_components/NewProductForm";

export default async function NewProductPage() {
  await requirePagePermission("products.create");
  return <NewProductForm />;
}
