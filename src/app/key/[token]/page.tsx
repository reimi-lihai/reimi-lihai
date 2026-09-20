import type { Metadata, Viewport } from "next";
import { GuestKey } from "@/components/key/GuestKey";

export const metadata: Metadata = {
  title: "Smart Key",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#0c285c",
};

export default function KeyPage({ params }: { params: { token: string } }) {
  return <GuestKey token={params.token} />;
}
