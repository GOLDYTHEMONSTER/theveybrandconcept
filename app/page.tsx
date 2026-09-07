import { redirect } from "next/navigation";
import { getSandboxSession } from "../modules/authentication/session";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect(getSandboxSession() ? "/dashboard" : "/login");
}
