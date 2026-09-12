export type ChatAuthor = "guest" | "staff";
export type ChatStatus = "sending" | "sent" | "failed";

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  /**
   * The message body, stored and displayed EXACTLY as typed.
   * It is never translated, summarized or rewritten — see the note in
   * src/lib/chat/transport.ts for why.
   */
  text: string;
  createdAt: number;
  status: ChatStatus;
}

export type InquiryCategory =
  | "checkin"
  | "key"
  | "facility"
  | "cleaning"
  | "noise"
  | "change"
  | "extend"
  | "viewing"
  | "realestate"
  | "other";

export interface ChatState {
  open: boolean;
  started: boolean;
  category: InquiryCategory | null;
  bookingRef: string;
  draft: string;
  messages: ChatMessage[];
  unread: number;
}
