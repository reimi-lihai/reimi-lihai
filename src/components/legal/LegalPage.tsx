"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";
import { Info } from "lucide-react";

type Kind = "privacy" | "terms" | "cancellation";
type Section = { h: string; b: string };

/**
 * Sample legal copy. Deliberately generic and marked as "sample" so it can be
 * replaced before launch (see legal.sampleNotice). Bodies are provided in JA/EN;
 * other UI languages fall back to JA. Replace with professionally-reviewed text.
 */
const CONTENT: Record<Kind, { ja: Section[]; en: Section[] }> = {
  privacy: {
    ja: [
      { h: "1. 取得する情報", b: "予約・お問い合わせ・本人確認の際に、氏名・連絡先・パスポート情報等をお預かりします。" },
      { h: "2. 利用目的", b: "宿泊予約の管理、法令に基づく本人確認・宿泊者名簿の作成、お問い合わせ対応の目的で利用します。" },
      { h: "3. 第三者提供", b: "法令に基づく場合を除き、ご本人の同意なく第三者に提供しません。" },
      { h: "4. 決済情報", b: "カード情報は決済事業者（Stripe等）が処理し、当社サーバーには保存しません。" },
      { h: "5. お問い合わせ", b: "個人情報の開示・訂正・削除のご請求は、お問い合わせ窓口までご連絡ください。" },
    ],
    en: [
      { h: "1. Information we collect", b: "When you book, contact us or verify your identity, we receive your name, contact details and passport information." },
      { h: "2. Purpose of use", b: "To manage bookings, perform legally-required identity verification and guest registry, and respond to inquiries." },
      { h: "3. Third parties", b: "We do not share your data with third parties without consent, except as required by law." },
      { h: "4. Payment data", b: "Card details are processed by our payment provider (e.g. Stripe) and are never stored on our servers." },
      { h: "5. Contact", b: "For disclosure, correction or deletion requests, please contact us." },
    ],
  },
  terms: {
    ja: [
      { h: "1. 適用", b: "本規約は、当サイトの利用および宿泊予約に関する条件を定めるものです。" },
      { h: "2. 予約と契約", b: "予約は、お支払いの完了および当社の確認をもって成立します。" },
      { h: "3. 利用者の義務", b: "正確な情報の提供、ハウスルール・法令の遵守をお願いします。" },
      { h: "4. 禁止事項", b: "定員超過、無断転貸、近隣への迷惑行為等を禁止します。" },
      { h: "5. 免責", b: "不可抗力による履行不能について、当社は責任を負わない場合があります。" },
    ],
    en: [
      { h: "1. Scope", b: "These terms govern use of this site and accommodation bookings." },
      { h: "2. Booking & contract", b: "A booking is formed upon completed payment and our confirmation." },
      { h: "3. Guest obligations", b: "Provide accurate information and comply with house rules and the law." },
      { h: "4. Prohibited acts", b: "Exceeding occupancy, unauthorized subletting and nuisance to neighbors are prohibited." },
      { h: "5. Disclaimer", b: "We may not be liable for non-performance due to force majeure." },
    ],
  },
  cancellation: {
    ja: [
      { h: "1. キャンセル区分", b: "チェックイン日からの日数に応じてキャンセル料が発生する場合があります（プランにより異なります）。" },
      { h: "2. 目安", b: "例：14日前まで無料／7日前まで宿泊料金の30%／前日・当日100%（掲載例）。" },
      { h: "3. 変更", b: "日程・人数の変更は空室状況により対応します。差額が生じる場合があります。" },
      { h: "4. 不可抗力", b: "災害・交通遮断等の場合は個別にご相談ください。" },
    ],
    en: [
      { h: "1. Cancellation tiers", b: "Cancellation fees may apply based on days before check-in (varies by plan)." },
      { h: "2. Guideline", b: "e.g. free up to 14 days prior / 30% up to 7 days / 100% day-before & same-day (sample)." },
      { h: "3. Changes", b: "Date/guest changes are subject to availability; a price difference may apply." },
      { h: "4. Force majeure", b: "For disasters or transport disruptions, please contact us individually." },
    ],
  },
};

export function LegalPage({ kind }: { kind: Kind }) {
  const { t, locale } = useI18n();
  const titleKey = kind === "privacy" ? "legal.privacyTitle" : kind === "terms" ? "legal.termsTitle" : "legal.cancelTitle";
  const sections = locale === "en" ? CONTENT[kind].en : CONTENT[kind].ja;

  return (
    <div className="container-page py-10">
      <SectionHeading title={t(titleKey)} />
      <p className="mt-2 text-sm text-muted">
        {t("legal.lastUpdated")}: 2026-09-01
      </p>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-gold/50 bg-gold-soft/15 p-4 text-sm text-brand-deep">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
        <p>{t("legal.sampleNotice")}</p>
      </div>

      <div className="mt-8 max-w-3xl space-y-6">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-serif text-lg font-bold text-ink">{s.h}</h2>
            <p className="mt-1.5 text-ink/85">{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
