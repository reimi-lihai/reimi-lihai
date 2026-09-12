import type { Metadata } from "next";
import { getProperties } from "@/lib/data";
import { ViewingForm } from "@/components/properties/ViewingForm";

export const metadata: Metadata = {
  title: "内見予約 / Book a viewing",
  description: "物件の内見を予約できます。担当者が日程を確認のうえご連絡します。",
  robots: { index: false },
};

export default async function ViewingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const items = await getProperties();
  const pre = searchParams.property;
  const preselect = Array.isArray(pre) ? pre[0] : pre;
  return <ViewingForm properties={items} preselect={preselect} />;
}
