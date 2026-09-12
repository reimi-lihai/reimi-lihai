import type { Metadata } from "next";
import { getProperties } from "@/lib/data";
import { PropertiesView } from "@/components/properties/PropertiesView";

export const metadata: Metadata = {
  title: "不動産・物件 / Real estate",
  description: "大阪の売買・賃貸物件。民泊活用や管理のご相談も承ります。",
};

export default async function PropertiesPage() {
  const items = await getProperties();
  return <PropertiesView items={items} />;
}
