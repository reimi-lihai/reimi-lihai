"use client";

import type { BookingDraft } from "./types";

/**
 * Lightweight client-side handoff between booking steps using sessionStorage.
 * This is NOT the source of truth for a real reservation — it only carries the
 * in-progress selection across pages. The confirmed booking is created after a
 * successful (demo) payment. Every access is guarded so blocked storage never
 * crashes the flow.
 */
const DRAFT_KEY = "reikai.booking.draft";
const CONFIRMED_KEY = "reikai.booking.confirmed";

export interface ConfirmedBooking {
  bookingNumber: string;
  draft: BookingDraft;
  accommodationName: string;
  guestName: string;
  email: string;
  total: number;
  currency: string;
  createdAt: string;
  status: "confirmed";
}

function safeGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
function safeRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function saveDraft(draft: BookingDraft) {
  safeSet(DRAFT_KEY, JSON.stringify(draft));
}
export function loadDraft(): BookingDraft | null {
  const raw = safeGet(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}
export function clearDraft() {
  safeRemove(DRAFT_KEY);
}

export function saveConfirmed(booking: ConfirmedBooking) {
  safeSet(CONFIRMED_KEY, JSON.stringify(booking));
}
export function loadConfirmed(): ConfirmedBooking | null {
  const raw = safeGet(CONFIRMED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConfirmedBooking;
  } catch {
    return null;
  }
}
