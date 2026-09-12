import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPropertyBySlug, allPropertySlugs } from "@/lib/data";
import { PropertyDetail } from "@/components/properties/PropertyDetail";

export function generateStaticParams() {
  return allPropertySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await getPropertyBySlug(params.slug);
  if (!p) return { title: "Not found" };
  return { title: p.name.ja, description: p.summary.ja };
}

export default async function PropertyDetailPage({ params }: { params: { slug: string } }) {
  const property = await getPropertyBySlug(params.slug);
  if (!property) notFound();
  return <PropertyDetail property={property} />;
}
