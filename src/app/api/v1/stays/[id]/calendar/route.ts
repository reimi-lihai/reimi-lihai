import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { priceCalendar } from "@/server/modules/booking";
import { publicHandler } from "@/server/publicApi";
import { localDate } from "@/server/time";

export const dynamic = "force-dynamic";

/** GET /api/v1/stays/:id/calendar?plan=&from=&days= — per-night price + availability. */
export const GET = publicHandler("calendar", 60, async (req: Request, { params }: { params: { id: string } }) => {
  const sp = new URL(req.url).searchParams;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("from") ?? "") ? sp.get("from")! : localDate("Asia/Tokyo");
  const days = Math.min(Math.max(Number(sp.get("days")) || 60, 1), 120);
  const cal = await priceCalendar(await getDb(), params.id, sp.get("plan") ?? undefined, from, days);
  return NextResponse.json({
    ok: true,
    from,
    days: cal.days.map((d) => ({ date: d.date, price: d.price, available: !d.booked && !d.closed && !d.past })),
  });
});
