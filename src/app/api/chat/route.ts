import { NextResponse } from "next/server";

/**
 * Demo chat endpoint.
 *
 * IMPORTANT: this endpoint does NOT translate, summarize or rewrite the guest's
 * message. It receives the text and (in a real deployment) would route it to a
 * staff inbox / realtime channel verbatim. Here it simply acknowledges receipt
 * so the send/receive flow can be verified without a backend.
 *
 * The acknowledgement text is a fixed staff message — it is NOT a translation of
 * the guest's input and it is NOT an AI answer to their question.
 *
 * Replace with a real transport (WebSocket / Supabase Realtime / Firebase) and
 * add rate limiting + auth before production.
 */
export async function POST(request: Request) {
  let body: { text?: string; category?: string; bookingRef?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 413 });
  }

  // In production: persist `text` verbatim + notify staff here.
  // We intentionally do not return the guest's text back, nor any translation.
  return NextResponse.json({
    ok: true,
    // Neutral fixed acknowledgement (not a translation, not an AI answer).
    ackText:
      "Thank you — your message has been received. Our staff will reply here. / メッセージを受け付けました。担当者よりご返信します。",
  });
}
