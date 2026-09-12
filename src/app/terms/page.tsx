import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "利用規約 / Terms of Use" };

export default function Page() {
  return <LegalPage kind="terms" />;
}
