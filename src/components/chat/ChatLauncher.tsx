"use client";

import { MessageCircle } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { chatStore, useChat } from "@/lib/chat/store";
import { ChatPanel } from "./ChatPanel";

/** Fixed, always-available chat button (with unread badge) + the panel. */
export function ChatLauncher() {
  const { t } = useI18n();
  const { open, unread } = useChat();

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => chatStore.open()}
          className="btn-primary fixed bottom-6 right-6 z-[70] hidden h-14 gap-2 rounded-full !px-5 shadow-glass lg:inline-flex"
          aria-label={t("chat.launcher")}
          aria-haspopup="dialog"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">{t("chat.launcher")}</span>
          {unread > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-crimson px-1.5 text-xs font-bold text-white"
              aria-label={t("chat.unread", { n: unread })}
            >
              {unread}
            </span>
          )}
        </button>
      )}
      <ChatPanel />
    </>
  );
}
