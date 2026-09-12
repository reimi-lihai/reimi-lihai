import type { Metadata } from "next";
import Link from "next/link";
import { getAccommodationById } from "@/lib/data";
import { isPaymentDemoMode } from "@/lib/stripe";
import { BookingFlow } from "@/components/booking/BookingFlow";
import type { BookingDraft } from "@/lib/types";

export const metadata: Metadata = {
  title: "宿泊予約 / Book",
  robots: { index: false },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const stayId = get("stay");
  const stay = stayId ? await getAccommodationById(stayId) : undefined;

  if (!stay) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-lg font-medium text-ink">Booking</p>
        <p className="mt-2 text-muted">No stay selected.</p>
        <Link href="/stays" className="btn-primary mt-6">Browse stays</Link>
      </div>
    );
  }

  const draft: BookingDraft = {
    accommodationId: stay.id,
    planId: get("plan") || stay.plans[0].id,
    checkIn: get("checkIn") || "",
    checkOut: get("checkOut") || "",
    adults: Number(get("adults")) || 2,
    children: Number(get("children")) || 0,
  };

  return <BookingFlow stay={stay} draft={draft} demo={isPaymentDemoMode()} />;
}
