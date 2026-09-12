import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { MobileTabBar } from "@/components/MobileTabBar";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "株式会社麗海 | 大阪の和モダン民泊 予約プラットフォーム",
    template: "%s | 株式会社麗海 REIKAI",
  },
  description:
    "大阪の和モダンな民泊をサイト内で検索・予約・決済。多言語対応・サイト内チャット・オンライン本人確認まで。株式会社麗海（REIKAI Co., Ltd.）。",
  applicationName: "麗海 REIKAI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    // "default" keeps the iOS status bar opaque so it never overlaps the header
    // (the header also reserves env(safe-area-inset-top) for notch devices).
    statusBarStyle: "default",
    title: "麗海 REIKAI",
  },
  openGraph: {
    type: "website",
    siteName: "株式会社麗海 REIKAI",
    title: "株式会社麗海 | 大阪の和モダン民泊 予約プラットフォーム",
    description:
      "大阪の和モダンな民泊をサイト内で検索・予約・決済。多言語・サイト内チャット・オンライン本人確認。",
    images: ["/images/hero/hero-otter-jp.png"],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#146cd6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applied before paint to avoid a theme/lang flash.
const boot = `
(function(){
  try {
    var t = localStorage.getItem('reikai.theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    var l = localStorage.getItem('reikai.locale');
    var map = { ja:'ja', en:'en', 'zh-Hant':'zh-Hant', 'zh-Hans':'zh-Hans', ko:'ko' };
    if (l && map[l]) document.documentElement.lang = map[l];
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <I18nProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          {/* Clearance so the fixed mobile tab bar never covers footer content */}
          <div className="h-[76px] lg:hidden" aria-hidden />
          <ChatLauncher />
          <MobileTabBar />
        </I18nProvider>
      </body>
    </html>
  );
}
