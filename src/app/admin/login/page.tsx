import { redirect } from "next/navigation";
import { getAdmin } from "@/server/auth/session";
import { isEmbeddedDb } from "@/server/db/client";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "管理画面ログイン", robots: { index: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return <LoginForm demo={isEmbeddedDb()} />;
}
