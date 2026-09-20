"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { SectionHeading } from "@/components/ui/states";
import { Info } from "lucide-react";
import { CancellationTable } from "./CancellationTable";
import type { Locale } from "@/i18n/config";

type Kind = "privacy" | "terms" | "cancellation";
type Section = { h: string; b: string; table?: boolean };
type Lang = Locale;

/**
 * Legal copy in all 5 site languages (ja is the authoritative version).
 * Still sample text (see legal.sampleNotice) — have it reviewed before launch.
 * The cancellation FEES are not written here: the table is rendered live from
 * the policy set in 管理画面 → 設定 (GET /api/v1/policies/cancellation).
 */
const CONTENT: Record<Kind, Record<Lang, Section[]>> = {
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
    "zh-Hant": [
      { h: "1. 蒐集的資訊", b: "於訂房、洽詢及身分確認時，我們會取得您的姓名、聯絡方式及護照資料等。" },
      { h: "2. 利用目的", b: "用於管理訂房、依法進行身分確認及製作住宿者名冊，以及回覆您的洽詢。" },
      { h: "3. 提供予第三方", b: "除法令規定外，未經您本人同意，不會提供予第三方。" },
      { h: "4. 付款資訊", b: "信用卡資訊由金流服務商（如 Stripe）處理，不會儲存於本公司伺服器。" },
      { h: "5. 洽詢", b: "如需查閱、更正或刪除個人資料，請與洽詢窗口聯繫。" },
    ],
    "zh-Hans": [
      { h: "1. 收集的信息", b: "在预订、咨询及身份确认时，我们会获取您的姓名、联系方式及护照信息等。" },
      { h: "2. 使用目的", b: "用于管理预订、依法进行身份确认及制作住宿者名册，以及回复您的咨询。" },
      { h: "3. 向第三方提供", b: "除法律规定外，未经您本人同意，不会向第三方提供。" },
      { h: "4. 支付信息", b: "银行卡信息由支付服务商（如 Stripe）处理，不会保存在本公司服务器上。" },
      { h: "5. 咨询", b: "如需查询、更正或删除个人信息，请联系咨询窗口。" },
    ],
    ko: [
      { h: "1. 수집하는 정보", b: "예약, 문의 및 본인 확인 시 성명, 연락처, 여권 정보 등을 받습니다." },
      { h: "2. 이용 목적", b: "예약 관리, 법령에 따른 본인 확인 및 숙박자 명부 작성, 문의 응대를 위해 이용합니다." },
      { h: "3. 제3자 제공", b: "법령에 따른 경우를 제외하고, 본인의 동의 없이 제3자에게 제공하지 않습니다." },
      { h: "4. 결제 정보", b: "카드 정보는 결제 대행사(Stripe 등)가 처리하며, 당사 서버에는 저장되지 않습니다." },
      { h: "5. 문의", b: "개인정보의 열람·정정·삭제 요청은 문의 창구로 연락해 주세요." },
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
    "zh-Hant": [
      { h: "1. 適用範圍", b: "本條款規範本網站的使用及住宿預訂相關條件。" },
      { h: "2. 預訂與契約", b: "預訂於完成付款並經本公司確認後成立。" },
      { h: "3. 使用者義務", b: "請提供正確資訊，並遵守住宿規範及相關法令。" },
      { h: "4. 禁止事項", b: "禁止超過入住人數上限、擅自轉租及對鄰居造成困擾等行為。" },
      { h: "5. 免責", b: "因不可抗力導致無法履行時，本公司可能不承擔責任。" },
    ],
    "zh-Hans": [
      { h: "1. 适用范围", b: "本条款规定本网站的使用及住宿预订相关条件。" },
      { h: "2. 预订与合同", b: "预订在完成付款并经本公司确认后成立。" },
      { h: "3. 用户义务", b: "请提供准确信息，并遵守住宿规则及相关法律法规。" },
      { h: "4. 禁止事项", b: "禁止超过入住人数上限、擅自转租及对邻居造成困扰等行为。" },
      { h: "5. 免责", b: "因不可抗力导致无法履行时，本公司可能不承担责任。" },
    ],
    ko: [
      { h: "1. 적용", b: "본 약관은 본 사이트의 이용 및 숙박 예약에 관한 조건을 정합니다." },
      { h: "2. 예약과 계약", b: "예약은 결제 완료 및 당사의 확인으로 성립됩니다." },
      { h: "3. 이용자의 의무", b: "정확한 정보를 제공하고 하우스 룰 및 법령을 준수해 주세요." },
      { h: "4. 금지 사항", b: "정원 초과, 무단 전대, 이웃에 대한 민폐 행위 등을 금지합니다." },
      { h: "5. 면책", b: "불가항력으로 인한 이행 불능에 대해 당사는 책임을 지지 않을 수 있습니다." },
    ],
  },
  cancellation: {
    ja: [
      { h: "1. キャンセル料の基準", b: "キャンセル料は、チェックイン日（宿泊施設の現地日付）の何日前にキャンセルされたかによって決まります。" },
      { h: "2. キャンセル料", b: "下表のとおりです。", table: true },
      { h: "3. キャンセルの方法と返金", b: "予約番号を添えて、サイト内チャットまたはお問い合わせフォームからご連絡ください。キャンセル料を差し引いた金額を、お支払いに使われたカードへ返金します。カード会社の処理により、反映まで通常5〜10営業日かかります。" },
      { h: "4. 予約内容の変更", b: "日程・人数の変更は空室状況により対応します。料金に差額が生じる場合があります。" },
      { h: "5. 不可抗力", b: "災害・交通機関の運休等やむを得ない事情の場合は、個別にご相談ください。" },
    ],
    en: [
      { h: "1. How fees are determined", b: "The cancellation fee depends on how many days before the check-in date (in the property's local time) you cancel." },
      { h: "2. Cancellation fees", b: "See the table below.", table: true },
      { h: "3. How to cancel & refunds", b: "Contact us via the on-site chat or the contact form with your booking number. The amount minus the cancellation fee is refunded to the card you paid with; it usually takes 5–10 business days to appear, depending on your card issuer." },
      { h: "4. Changes to a booking", b: "Date/guest changes are subject to availability; a price difference may apply." },
      { h: "5. Force majeure", b: "For disasters, transport suspensions or other unavoidable circumstances, please contact us individually." },
    ],
    "zh-Hant": [
      { h: "1. 取消費的計算基準", b: "取消費依您於入住日（以住宿當地日期為準）前幾天取消而定。" },
      { h: "2. 取消費", b: "如下表所示。", table: true },
      { h: "3. 取消方式與退款", b: "請附上訂房編號，透過網站內聊天或洽詢表單與我們聯繫。扣除取消費後的金額將退回至您付款時使用的信用卡；依發卡機構作業，通常需 5〜10 個工作天入帳。" },
      { h: "4. 變更預訂內容", b: "日期或人數的變更將視空房情況處理，可能產生價差。" },
      { h: "5. 不可抗力", b: "如遇天災、交通停駛等不得已之情況，請個別與我們洽詢。" },
    ],
    "zh-Hans": [
      { h: "1. 取消费的计算标准", b: "取消费根据您在入住日（以住宿当地日期为准）前几天取消而定。" },
      { h: "2. 取消费", b: "如下表所示。", table: true },
      { h: "3. 取消方式与退款", b: "请附上订单号，通过网站内聊天或咨询表单与我们联系。扣除取消费后的金额将退回至您付款时使用的银行卡；视发卡机构处理情况，通常需要 5〜10 个工作日到账。" },
      { h: "4. 变更预订内容", b: "日期或人数的变更将视空房情况处理，可能产生差价。" },
      { h: "5. 不可抗力", b: "如遇自然灾害、交通停运等不得已的情况，请单独与我们咨询。" },
    ],
    ko: [
      { h: "1. 취소 수수료 기준", b: "취소 수수료는 체크인 날짜(숙소 현지 날짜 기준) 며칠 전에 취소하셨는지에 따라 정해집니다." },
      { h: "2. 취소 수수료", b: "아래 표와 같습니다.", table: true },
      { h: "3. 취소 방법 및 환불", b: "예약 번호와 함께 사이트 내 채팅 또는 문의 양식으로 연락해 주세요. 취소 수수료를 제외한 금액은 결제하신 카드로 환불되며, 카드사 처리에 따라 보통 5~10영업일이 소요됩니다." },
      { h: "4. 예약 내용 변경", b: "날짜·인원 변경은 예약 가능 여부에 따라 대응하며, 요금 차액이 발생할 수 있습니다." },
      { h: "5. 불가항력", b: "재해, 교통기관 운휴 등 부득이한 사정이 있는 경우 개별적으로 문의해 주세요." },
    ],
  },
};

export function LegalPage({ kind }: { kind: Kind }) {
  const { t, locale } = useI18n();
  const titleKey = kind === "privacy" ? "legal.privacyTitle" : kind === "terms" ? "legal.termsTitle" : "legal.cancelTitle";
  const sections = CONTENT[kind][locale] ?? CONTENT[kind].ja;

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
            {s.table && <CancellationTable />}
          </section>
        ))}
      </div>
    </div>
  );
}
