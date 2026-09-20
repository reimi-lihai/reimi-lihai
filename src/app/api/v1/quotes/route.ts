import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { quoteStay } from "@/server/modules/booking";
import { publicHandler, quoteBody } from "@/server/publicApi";

export const dynamic = "force-dynamic";

/** POST /api/v1/quotes — authoritative price + availability for a stay. */
export const POST = publicHandler("quote", 60, async (req: Request) => {
  const p = quoteBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const q = await quoteStay(await getDb(), p.data);
  return NextResponse.json({ ok: true, available: q.available, reason: q.available ? null : q.reason, quote: q.quote ?? null });
});
