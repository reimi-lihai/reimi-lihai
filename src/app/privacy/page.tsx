import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "プライバシーポリシー / Privacy Policy" };

export default function Page() {
  return <LegalPage kind="privacy" />;
}
