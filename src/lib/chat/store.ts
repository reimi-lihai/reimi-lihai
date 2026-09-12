"use client";

import { useSyncExternalStore } from "react";
import type { ChatState, ChatMessage, InquiryCategory } from "./types";

/**
 * Minimal subscribable chat store shared by the launcher (unread badge) and the
 * panel. Persists to localStorage so an in-progress draft and history survive
 * navigation and reloads. Every storage access is guarded.
 *
 * NOTE: message text is stored verbatim — never translated (see transport.ts).
 */
const KEY = "reikai.chat.v1";

const initial: ChatState = {
  open: false,
  started: false,
  category: null,
  bookingRef: "",
  draft: "",
  messages: [],
  unread: 0,
};

let state: ChatState = initial;
const listeners = new Set<() => void>();

function persist() {
  try {
    const { open, ...rest } = state; // don't persist "open"
    void open;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function set(patch: Partial<ChatState>) {
  state = { ...state, ...patch };
  persist();
  emit();
}

let hydrated = false;
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatState>;
      state = { ...initial, ...parsed, open: false };
    }
  } catch {
    /* ignore */
  }
}

export const chatStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): ChatState {
    return state;
  },
  getServerSnapshot(): ChatState {
    return initial;
  },
  open() {
    set({ open: true, unread: 0 });
  },
  close() {
    set({ open: false });
  },
  toggle() {
    set({ open: !state.open, unread: state.open ? state.unread : 0 });
  },
  setCategory(category: InquiryCategory) {
    set({ category, started: true });
  },
  setBookingRef(bookingRef: string) {
    set({ bookingRef });
  },
  setDraft(draft: string) {
    set({ draft });
  },
  addMessage(msg: ChatMessage) {
    set({
      messages: [...state.messages, msg],
      unread: msg.author === "staff" && !state.open ? state.unread + 1 : state.unread,
    });
  },
  updateMessage(id: string, patch: Partial<ChatMessage>) {
    set({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  },
  reset() {
    set({ started: false, category: null, messages: [], draft: "", bookingRef: "" });
  },
};

export function useChat(): ChatState {
  return useSyncExternalStore(
    chatStore.subscribe,
    chatStore.getSnapshot,
    chatStore.getServerSnapshot
  );
}
