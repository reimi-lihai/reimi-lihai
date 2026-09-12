import type { ChatMessage } from "./types";

/**
 * ============================================================================
 *  CHAT TRANSPORT — and why messages are NEVER auto-translated
 * ============================================================================
 *
 *  Per product requirement (最重要仕様): the in-site chat must NOT translate
 *  message content. Whatever a guest types is delivered to staff EXACTLY as
 *  written — English stays English, 中文 stays 中文, 한국어 stays 한국어,
 *  日本語 stays 日本語 — regardless of which UI language the website is set to.
 *
 *  This is deliberate: guest and staff talk to each other directly (like
 *  Airbnb messaging), so the raw wording, nuance and any names/addresses must
 *  be preserved. The site's language switch changes only the *interface* chrome
 *  (labels, buttons), never the conversation text.
 *
 *  Therefore: NO transport, store or renderer in this app applies any
 *  translation / summarization / rewriting to `ChatMessage.text`. Do not add
 *  one here. If a future backend offers translation, it must be an explicit,
 *  clearly-labeled, opt-in feature — never applied silently to the thread.
 *
 *  This demo transport POSTs to /api/chat (which stores/echoes verbatim) and
 *  falls back to a local acknowledgement if the network is unavailable, so the
 *  send/receive flow can be verified with no backend. Swap this implementation
 *  for WebSocket / Supabase Realtime / Firebase without touching the UI: keep
 *  the same `sendMessage` contract and deliver staff replies verbatim.
 * ============================================================================
 */

export interface SendResult {
  ok: boolean;
  /** Optional staff reply to append (verbatim). Demo only. */
  reply?: ChatMessage;
}

export interface ChatTransport {
  sendMessage(input: {
    text: string;
    category: string | null;
    bookingRef: string;
  }): Promise<SendResult>;
}

export const demoTransport: ChatTransport = {
  async sendMessage({ text, category, bookingRef }) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The exact text is sent as-is; the server does not translate it.
        body: JSON.stringify({ text, category, bookingRef }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { ok: boolean; ackText?: string };
      return {
        ok: data.ok,
        reply: data.ackText
          ? {
              id: `staff-${Date.now()}`,
              author: "staff",
              text: data.ackText,
              createdAt: Date.now(),
              status: "sent",
            }
          : undefined,
      };
    } catch {
      // Offline/demo fallback — still confirm the message was queued locally.
      return { ok: true };
    }
  },
};
