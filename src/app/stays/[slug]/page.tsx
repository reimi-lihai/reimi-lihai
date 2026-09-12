import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAccommodationBySlug, allAccommodationSlugs } from "@/lib/data";
import { StayDetail } from "@/components/stays/StayDetail";
import { LoadingState } from "@/components/ui/states";

export function generateStaticParams() {
  return allAccommodationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const stay = await getAccommodationBySlug(params.slug);
  if (!stay) return { title: "Not found" };
  return {
    title: stay.name.ja,
    description: stay.summary.ja,
    openGraph: { title: stay.name.ja, description: stay.summary.ja },
  };
}

export default async function StayDetailPage({ params }: { params: { slug: string } }) {
  const stay = await getAccommodationBySlug(params.slug);
  if (!stay) notFound();
  return (
    <Suspense fallback={<LoadingState />}>
      <StayDetail stay={stay} />
    </Suspense>
  );
}
