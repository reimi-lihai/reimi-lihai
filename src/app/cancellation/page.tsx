import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "キャンセルポリシー / Cancellation Policy" };

export default function Page() {
  return <LegalPage kind="cancellation" />;
}
