import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { getCancellationPolicy } from "@/server/modules/settings";

export const dynamic = "force-dynamic";

/** GET /api/v1/policies/cancellation — current policy for the public cancellation page. */
export async function GET() {
  try {
    const p = await getCancellationPolicy(await getDb());
    return NextResponse.json({ ok: true, tiers: p.tiers, updatedAt: p.updatedAt }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
