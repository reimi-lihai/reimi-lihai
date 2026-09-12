import { Suspense } from "react";
import type { Metadata } from "next";
import { getAccommodations } from "@/lib/data";
import { StaysView } from "@/components/stays/StaysView";
import { LoadingState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "宿泊施設 / Stays",
  description: "大阪の和モダンな民泊・宿泊施設を検索。日程を選んで空室と料金を確認できます。",
};

export default async function StaysPage() {
  const stays = await getAccommodations();
  return (
    <Suspense fallback={<LoadingState />}>
      <StaysView stays={stays} />
    </Suspense>
  );
}
