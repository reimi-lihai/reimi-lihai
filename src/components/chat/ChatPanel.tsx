"use client";

import { useEffect, useRef } from "react";
import { Send, X, RefreshCw, Check, Clock, AlertCircle, Info } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { chatStore, useChat } from "@/lib/chat/store";
import { demoTransport } from "@/lib/chat/transport";
import type { ChatMessage, InquiryCategory } from "@/lib/chat/types";

const CATEGORIES: InquiryCategory[] = [
  "checkin",
  "key",
  "facility",
  "cleaning",
  "noise",
  "change",
  "extend",
  "viewing",
  "realestate",
  "other",
];

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ChatPanel() {
  const { t } = useI18n();
  const chat = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    if (chat.open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chat.messages, chat.open, chat.started]);

  // Focus & ESC handling.
  useEffect(() => {
    if (!chat.open) return;
    const el = chat.started ? inputRef.current : panelRef.current?.querySelector<HTMLElement>("button");
    el?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") chatStore.close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [chat.open, chat.started]);

  async function send() {
    const text = chat.draft.trim();
    if (!text) return;
    const id = uid();
    const msg: ChatMessage = { id, author: "guest", text, createdAt: Date.now(), status: "sending" };
    chatStore.addMessage(msg);
    chatStore.setDraft("");

    const result = await demoTransport.sendMessage({
      text, // sent verbatim — never translated
      category: chat.category,
      bookingRef: chat.bookingRef,
    });

    if (result.ok) {
      chatStore.updateMessage(id, { status: "sent" });
      if (result.reply) {
        // small delay so it reads like a reply arriving
        setTimeout(() => chatStore.addMessage(result.reply!), 600);
      } else {
        setTimeout(
          () =>
            chatStore.addMessage({
              id: uid(),
              author: "staff",
              text: t("chat.autoReply"),
              createdAt: Date.now(),
              status: "sent",
            }),
          600
        );
      }
    } else {
      chatStore.updateMessage(id, { status: "failed" });
    }
  }

  function retry(m: ChatMessage) {
    chatStore.setDraft(m.text);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  if (!chat.open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-0 bottom-0 z-[75] flex h-[82dvh] flex-col glass sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[380px] sm:rounded-2xl"
      role="dialog"
      aria-modal="false"
      aria-label={t("chat.title")}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-line/70 bg-brand-deep px-4 py-3 text-white sm:rounded-t-2xl">
        <div>
          <p className="font-semibold leading-tight">{t("chat.title")}</p>
          <p className="text-xs text-white/70">{t("chat.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => chatStore.close()}
          className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {!chat.started ? (
        /* ---- Category picker ---- */
        <div className="flex-1 overflow-y-auto p-4 thin-scroll">
          <p className="mb-3 text-sm text-muted">{t("chat.startPrompt")}</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => chatStore.setCategory(c)}
                className="rounded-lg border border-line bg-panel/70 px-3 py-3 text-left text-sm text-ink transition hover:border-brand/60 hover:bg-brand/5"
              >
                {t(`chat.cat.${c}`)}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="field-label">{t("chat.linkBooking")}</span>
            <input
              className="field"
              value={chat.bookingRef}
              onChange={(e) => chatStore.setBookingRef(e.target.value)}
              placeholder="RK-XXXXXX"
              inputMode="text"
            />
          </label>
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-brand/5 p-2.5 text-xs text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            {t("chat.noTranslateNote")}
          </p>
        </div>
      ) : (
        <>
          {/* ---- Conversation ---- */}
          <div className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-2 text-xs text-muted">
            <span className="chip">{t(`chat.cat.${chat.category}`)}</span>
            {chat.bookingRef ? <span className="truncate">#{chat.bookingRef}</span> : null}
            <button
              type="button"
              onClick={() => chatStore.reset()}
              className="ml-auto text-brand hover:underline"
            >
              {t("chat.categoryPrompt")}
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 thin-scroll" aria-live="polite">
            <p className="rounded-lg bg-brand/5 p-2.5 text-center text-xs text-muted">
              {t("chat.noTranslateNote")}
            </p>
            {chat.messages.map((m) => (
              <div key={m.id} className={`flex ${m.author === "guest" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  {m.author === "staff" && (
                    <p className="mb-0.5 text-xs text-muted">{t("chat.agentName")}</p>
                  )}
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                      m.author === "guest"
                        ? "bg-brand text-white"
                        : "border border-line bg-panel text-ink"
                    }`}
                  >
                    {/* Rendered as plain text (whitespace-pre-wrap), NOT HTML,
                        and NOT translated — exactly as the sender typed it. */}
                    {m.text}
                  </div>
                  {m.author === "guest" && (
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-muted">
                      {m.status === "sending" && (
                        <>
                          <Clock className="h-3 w-3" aria-hidden /> {t("chat.sending")}
                        </>
                      )}
                      {m.status === "sent" && (
                        <>
                          <Check className="h-3 w-3" aria-hidden /> {t("chat.sent")}
                        </>
                      )}
                      {m.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => retry(m)}
                          className="flex items-center gap-1 text-crimson hover:underline"
                        >
                          <AlertCircle className="h-3 w-3" aria-hidden /> {t("chat.failed")} ·{" "}
                          <RefreshCw className="h-3 w-3" aria-hidden /> {t("chat.retry")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ---- Composer ---- */}
          <div className="border-t border-line/70 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={chat.draft}
                onChange={(e) => chatStore.setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={t("chat.placeholder")}
                aria-label={t("chat.placeholder")}
                className="field max-h-28 min-h-[44px] resize-none py-2.5"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!chat.draft.trim()}
                className="btn-primary h-11 w-11 shrink-0 !px-0"
                aria-label={t("chat.send")}
              >
                <Send className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
