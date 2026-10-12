import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/current";

export default async function Home() {
  const auth = await getAuthState();
  if (auth.status === "ok") redirect("/workspace");
  if (auth.status === "expired") redirect("/session-expired");
  redirect("/login");
}
