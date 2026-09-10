import { accommodations, company, inquiryCategories, languages, properties, servicePillars } from "./data.mjs";
import {
  calculateStayTotal,
  createDemoReservation,
  todayIso,
  validateContactPayload,
  validateViewingPayload
} from "./booking-service.mjs";
import { formatCurrency, formatDate, getStoredLanguage, pickLocalized, storeLanguage, t } from "./i18n.mjs";

const app = document.querySelector("#app");
const page = document.body.dataset.page || "home";
const storage = {
  bookingDraft: "reikai.bookingDraft",
  bookingStep: "reikai.bookingStep",
  latestReservation: "reikai.latestReservation",
  chatDraft: "reikai.chatDraft",
  chatMessages: "reikai.chatMessages"
};

const state = {
  lang: getStoredLanguage(),
  bookingErrors: {},
  viewingErrors: {},
  contactErrors: {},
  notice: ""
};

const navLinks = [
  ["home", "index.html", "common.home"],
  ["stays", "stays.html", "common.stays"],
  ["booking", "booking.html", "common.booking"],
  ["properties", "properties.html", "common.properties"],
  ["inbound", "inbound.html", "common.inbound"],
  ["company", "company.html", "common.company"],
  ["contact", "contact.html", "common.contact"]
];

function render() {
  document.documentElement.lang = state.lang;
  app.innerHTML = `
    <div class="site-shell">
      ${renderHeader()}
      <main id="main">${renderPage()}</main>
      ${renderFooter()}
      ${renderChat()}
      <div class="sr-status" aria-live="polite" id="sr-status"></div>
    </div>
  `;
  bindCommon();
  bindPage();
  renderChatMessages();
  updateCanonical();
}

function renderHeader() {
  const links = navLinks
    .map(([key, href, label]) => {
      const current = isCurrentPage(key);
      return `<a class="nav-link" href="${href}" ${current ? 'aria-current="page"' : ""}>${t(state.lang, label)}</a>`;
    })
    .join("");

  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="index.html" aria-label="${t(state.lang, "common.brand")}">
          <img src="./assets/logo.svg" alt="${t(state.lang, "common.brand")}">
        </a>
        <nav class="desktop-nav" aria-label="${t(state.lang, "nav.primary")}">${links}</nav>
        <div class="header-actions">
          ${renderLanguageSelector()}
          <button class="icon-button menu-button" type="button" data-menu-toggle aria-expanded="false" aria-controls="mobile-menu" aria-label="${t(state.lang, "common.menu")}">☰</button>
        </div>
      </div>
      <nav class="mobile-menu" id="mobile-menu" aria-label="${t(state.lang, "nav.mobile")}">${links.replaceAll("nav-link", "mobile-nav-link")}</nav>
    </header>
    <nav class="mobile-bottom-nav" aria-label="${t(state.lang, "nav.mobile")}">
      <a class="mobile-nav-link" href="index.html" ${isCurrentPage("home") ? 'aria-current="page"' : ""}>⌂<span>${t(state.lang, "common.home")}</span></a>
      <a class="mobile-nav-link" href="stays.html" ${isCurrentPage("stays") ? 'aria-current="page"' : ""}>⌕<span>${t(state.lang, "common.stays")}</span></a>
      <a class="mobile-nav-link" href="booking.html" ${isCurrentPage("booking") ? 'aria-current="page"' : ""}>✓<span>${t(state.lang, "common.booking")}</span></a>
      <a class="mobile-nav-link" href="contact.html" ${isCurrentPage("contact") ? 'aria-current="page"' : ""}>✉<span>${t(state.lang, "common.contact")}</span></a>
    </nav>
  `;
}

function renderLanguageSelector() {
  const current = languages.find((language) => language.code === state.lang) || languages[0];
  const options = languages
    .map(
      (language) => `
        <button class="language-option" type="button" data-language="${language.code}" aria-pressed="${language.code === state.lang}">
          ${language.label}
        </button>
      `
    )
    .join("");

  return `
    <div class="language-selector">
      <button class="language-button" type="button" data-language-toggle aria-expanded="false" aria-controls="language-menu">
        <span>${t(state.lang, "common.language")}</span>
        <span>${current.label}</span>
      </button>
      <div class="language-menu" id="language-menu" role="menu" aria-label="${t(state.lang, "common.selectLanguage")}">
        ${options}
      </div>
    </div>
  `;
}

function renderPage() {
  const renderers = {
    home: renderHome,
    stays: renderStays,
    "stay-detail": renderStayDetail,
    booking: renderBooking,
    properties: renderProperties,
    "property-detail": renderPropertyDetail,
    viewing: renderViewing,
    inbound: renderInbound,
    company: renderCompany,
    contact: renderContact,
    reservation: renderReservation,
    "payment-result": renderPaymentResult,
    privacy: () => renderLegal("privacy"),
    terms: () => renderLegal("terms"),
    cancellation: () => renderLegal("cancellation"),
    offline: renderOffline,
    "not-found": renderNotFound
  };
  return (renderers[page] || renderNotFound)();
}

function renderHome() {
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <div class="hero-badge-row">
            <span class="badge">${t(state.lang, "hero.badge")}</span>
            <span class="status-pill">${t(state.lang, "common.demoMode")}</span>
          </div>
          <h1>${t(state.lang, "common.concept")}</h1>
          <p class="hero-lead">${t(state.lang, "hero.subtitle")}</p>
          <p>${t(state.lang, "hero.lead")}</p>
          <div class="hero-actions">
            <a class="primary-button" href="stays.html">⌕ ${t(state.lang, "common.searchStays")}</a>
            <a class="secondary-button" href="properties.html">⌂ ${t(state.lang, "common.searchProperties")}</a>
            <a class="secondary-button" href="inbound.html">✦ ${t(state.lang, "common.consult")}</a>
            <a class="primary-button" href="booking.html">✓ ${t(state.lang, "common.startBooking")}</a>
          </div>
        </div>
        <aside class="hero-panel" aria-label="${t(state.lang, "sections.search")}">
          <div class="visual-stage">
            <span class="media-label">${t(state.lang, "hero.pwa")}</span>
          </div>
          <div class="hero-metrics">
            <div class="metric"><strong>5</strong><span>${t(state.lang, "common.language")}</span></div>
            <div class="metric"><strong>PWA</strong><span>Android / iOS</span></div>
            <div class="metric"><strong>Stripe</strong><span>${t(state.lang, "common.demoMode")}</span></div>
          </div>
        </aside>
      </div>
    </section>
    <section class="section compact">
      ${sectionHeading("sections.search", "sections.pageIntro")}
      ${renderStaySearchForm()}
    </section>
    <section class="section">
      ${sectionHeading("sections.featuredStays", "sections.connected")}
      <div class="grid three">${accommodations.map(renderStayCard).join("")}</div>
    </section>
    <section class="section">
      ${sectionHeading("sections.realEstate", "sections.pageIntro")}
      <div class="grid two">
        ${renderValueCard(t(state.lang, "services.stayManagement"), "stayManagement")}
        ${renderValueCard(t(state.lang, "services.propertyManagement"), "propertyManagement")}
      </div>
    </section>
    <section class="section">
      ${sectionHeading("sections.featuredProperties", "sections.realEstate")}
      <div class="grid three">${properties.map(renderPropertyCard).join("")}</div>
    </section>
    <section class="section">
      ${sectionHeading("sections.inbound", "inbound.lead")}
      <div class="grid three">
        ${servicePillars.slice(2).map((pillar) => renderValueCard(t(state.lang, `services.${pillar}`), pillar)).join("")}
      </div>
      <p class="notice">${t(state.lang, "inbound.safe")}</p>
    </section>
    <section class="section">
      ${sectionHeading("sections.flow", "sections.connected")}
      <div class="grid three">
        ${["1. " + t(state.lang, "common.searchStays"), "2. " + t(state.lang, "common.startBooking"), "3. " + t(state.lang, "common.contact")]
          .map((label) => `<article class="card"><div class="card-body"><h3>${label}</h3><p>${t(state.lang, "sections.pageIntro")}</p></div></article>`)
          .join("")}
      </div>
    </section>
    <section class="section">
      ${sectionHeading("sections.faq", "sections.pageIntro")}
      <div class="grid two">
        <article class="card"><div class="card-body"><h3>Stripe</h3><p>${t(state.lang, "booking.paymentLead")}</p></div></article>
        <article class="card"><div class="card-body"><h3>${t(state.lang, "chat.title")}</h3><p>${t(state.lang, "chat.noAutoTranslate")}</p></div></article>
      </div>
    </section>
  `;
}

function renderStays() {
  return `
    <section class="section">
      ${sectionHeading("common.stays", "sections.pageIntro")}
      ${renderStaySearchForm()}
      <div class="grid three" id="stay-results" style="margin-top: 22px;">${accommodations.map(renderStayCard).join("")}</div>
    </section>
  `;
}

function renderStayDetail() {
  const stay = getStayFromUrl();
  const price = calculateStayTotal(defaultBookingDraft(stay.id), accommodations);
  return `
    <section class="section">
      ${sectionHeadingText(pickLocalized(stay.name, state.lang), pickLocalized(stay.short, state.lang))}
      <div class="grid two">
        <div class="media" data-tone="${stay.galleryTone}"><span class="media-label">${t(state.lang, "common.demo")}</span></div>
        <div class="result-panel">
          <div class="meta-row">
            <span class="badge">${stay.area}</span>
            <span class="badge">${t(state.lang, `roomTypes.${stay.roomType}`)}</span>
            <span class="badge">${stay.capacity}${t(state.lang, "common.people")}</span>
          </div>
          <h3>${t(state.lang, "common.from")} ${formatCurrency(stay.baseNightlyRate, state.lang)} / ${t(state.lang, "common.night")}</h3>
          <p>${t(state.lang, "booking.priceBreakdown")}: ${formatCurrency(price.total, state.lang)} ${t(state.lang, "common.taxIncluded")}</p>
          <div class="meta-row">${stay.amenities.map((item) => `<span class="badge">${t(state.lang, `amenities.${item}`)}</span>`).join("")}</div>
          <div class="button-row">
            <a class="primary-button" href="booking.html?stayId=${stay.id}">${t(state.lang, "common.bookNow")}</a>
            <a class="secondary-button" href="stays.html">${t(state.lang, "common.back")}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderBooking() {
  const draft = readJson(storage.bookingDraft, defaultBookingDraft(getStayFromUrl().id));
  const step = Number(sessionStorage.getItem(storage.bookingStep) || "1");
  const price = calculateStayTotal(draft, accommodations);
  const steps = ["booking.stepSearch", "booking.stepPlan", "booking.stepGuest", "booking.stepPayment"];

  return `
    <section class="section">
      ${sectionHeading("booking.title", "booking.pending")}
      <div class="form-panel">
        <div class="stepper" aria-label="${t(state.lang, "booking.title")}">
          ${steps.map((label, index) => `<div class="step ${index + 1 === step ? "is-active" : ""}">${index + 1}. ${t(state.lang, label)}</div>`).join("")}
        </div>
        <form id="booking-form" novalidate>
          ${renderBookingStep(step, draft, price)}
        </form>
      </div>
    </section>
  `;
}

function renderBookingStep(step, draft, price) {
  if (step === 1) {
    return `
      <div class="form-grid">
        ${fieldSelect("stayId", "forms.stay", accommodations.map((stay) => [stay.id, pickLocalized(stay.name, state.lang)]), draft.stayId, state.bookingErrors.stayId, "span-2")}
        ${fieldInput("checkIn", "forms.checkIn", "date", draft.checkIn, state.bookingErrors.checkIn)}
        ${fieldInput("checkOut", "forms.checkOut", "date", draft.checkOut, state.bookingErrors.checkOut)}
        ${fieldInput("adults", "forms.adults", "number", draft.adults, state.bookingErrors.guests, "", { min: 0 })}
        ${fieldInput("children", "forms.children", "number", draft.children, "", "", { min: 0 })}
      </div>
      <div class="button-row"><button class="primary-button" type="submit" data-booking-next>${t(state.lang, "common.next")}</button></div>
    `;
  }

  if (step === 2) {
    return `
      ${hiddenBookingFields(draft)}
      <div class="grid two">
        <article class="card"><div class="card-body"><h3>${t(state.lang, "booking.availablePlans")}</h3><p>${pickLocalized(price.stay.short, state.lang)}</p><span class="badge">${t(state.lang, "common.demo")}</span></div></article>
        <label class="card"><span class="card-body" style="display: block;"><input type="checkbox" name="withSupport" ${draft.withSupport ? "checked" : ""}> ${t(state.lang, "booking.option")} ${formatCurrency(price.stay.optionFee, state.lang)}</span></label>
      </div>
      ${renderPriceBreakdown(price)}
      <div class="button-row">
        <button class="secondary-button" type="button" data-booking-back>${t(state.lang, "common.back")}</button>
        <button class="primary-button" type="submit" data-booking-next>${t(state.lang, "common.next")}</button>
      </div>
    `;
  }

  if (step === 3) {
    return `
      ${hiddenBookingFields(draft)}
      <div class="form-grid">
        ${fieldInput("fullName", "forms.fullName", "text", draft.fullName, state.bookingErrors.fullName, "span-2")}
        ${fieldInput("email", "forms.email", "email", draft.email, state.bookingErrors.email, "span-2")}
        ${fieldInput("phone", "forms.phone", "tel", draft.phone, state.bookingErrors.phone, "span-2")}
        ${fieldInput("country", "forms.country", "text", draft.country, state.bookingErrors.country, "span-2")}
        ${fieldInput("arrivalTime", "forms.arrivalTime", "time", draft.arrivalTime, state.bookingErrors.arrivalTime, "span-2")}
        ${fieldInput("notes", "forms.notes", "text", draft.notes, "", "span-2")}
        <label class="field span-4"><span><input type="checkbox" name="agree" ${draft.agree ? "checked" : ""}> ${t(state.lang, "forms.agree")}</span><span class="error-text">${errorText(state.bookingErrors.agree)}</span></label>
      </div>
      ${renderPriceBreakdown(price)}
      <div class="button-row">
        <button class="secondary-button" type="button" data-booking-back>${t(state.lang, "common.back")}</button>
        <button class="primary-button" type="submit" data-booking-next>${t(state.lang, "common.confirm")}</button>
      </div>
    `;
  }

  return `
    ${renderPriceBreakdown(price)}
    <p class="notice">${t(state.lang, "booking.paymentLead")} ${t(state.lang, "common.safeNote")}。</p>
    <div class="button-row">
      <button class="secondary-button" type="button" data-booking-back>${t(state.lang, "common.back")}</button>
      <button class="primary-button" type="button" data-demo-payment="success">${t(state.lang, "booking.paySuccess")}</button>
      <button class="secondary-button" type="button" data-demo-payment="failed">${t(state.lang, "booking.payFail")}</button>
      <button class="ghost-button" type="button" data-demo-payment="canceled">${t(state.lang, "booking.payCancel")}</button>
    </div>
  `;
}

function renderProperties() {
  return `
    <section class="section">
      ${sectionHeading("common.properties", "sections.pageIntro")}
      ${renderPropertySearchForm()}
      <div class="grid three" id="property-results" style="margin-top: 22px;">${properties.map(renderPropertyCard).join("")}</div>
    </section>
  `;
}

function renderPropertyDetail() {
  const property = getPropertyFromUrl();
  return `
    <section class="section">
      ${sectionHeadingText(pickLocalized(property.name, state.lang), pickLocalized(property.point, state.lang))}
      <div class="grid two">
        <div class="media" data-tone="${property.galleryTone}"><span class="media-label">${t(state.lang, "common.demo")}</span></div>
        <div class="result-panel">
          <dl class="data-table">
            ${dataRow(t(state.lang, "property.location"), property.area)}
            ${dataRow(t(state.lang, "property.price"), property.priceLabel)}
            ${dataRow(t(state.lang, "forms.layout"), property.layout)}
            ${dataRow(t(state.lang, "forms.propertyType"), t(state.lang, `property.${property.type}`))}
            ${dataRow(t(state.lang, "property.highlights"), pickLocalized(property.point, state.lang))}
          </dl>
          <div class="button-row">
            <a class="primary-button" href="viewing.html?propertyId=${property.id}">${t(state.lang, "common.viewing")}</a>
            <a class="secondary-button" href="contact.html">${t(state.lang, "property.management")}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderViewing() {
  const property = getPropertyFromUrl();
  return `
    <section class="section">
      ${sectionHeading("common.viewing", "sections.pageIntro")}
      <form class="form-panel" id="viewing-form" novalidate>
        <div class="form-grid">
          ${fieldSelect("propertyId", "forms.propertyType", properties.map((item) => [item.id, pickLocalized(item.name, state.lang)]), property.id, state.viewingErrors.propertyId, "span-2")}
          ${fieldInput("preferredDate", "forms.preferredDate", "date", "", state.viewingErrors.preferredDate)}
          ${fieldSelect("preferredTime", "forms.preferredTime", [["10:00", "10:00"], ["13:00", "13:00"], ["16:00", "16:00"]], "", state.viewingErrors.preferredTime)}
          ${fieldInput("fullName", "forms.fullName", "text", "", state.viewingErrors.fullName, "span-2")}
          ${fieldInput("email", "forms.email", "email", "", state.viewingErrors.email, "span-2")}
          ${fieldInput("phone", "forms.phone", "tel", "", state.viewingErrors.phone, "span-2")}
          ${fieldTextarea("message", "forms.message", "", state.viewingErrors.message, "span-4")}
        </div>
        <div class="button-row"><button class="primary-button" type="submit">${t(state.lang, "common.send")}</button></div>
        <p class="notice" id="viewing-status" hidden></p>
      </form>
    </section>
  `;
}

function renderInbound() {
  const cards = [
    ["inboundMedical", t(state.lang, "services.inboundMedical")],
    ["beautyTourism", t(state.lang, "services.beautyTourism")],
    ["residenceStatus", t(state.lang, "services.residenceStatus")],
    ["stayConsulting", t(state.lang, "services.stayConsulting")]
  ];
  return `
    <section class="section">
      ${sectionHeading("common.inbound", "inbound.lead")}
      <div class="grid two">${cards.map(([key, title]) => renderValueCard(title, key)).join("")}</div>
      <p class="notice">${t(state.lang, "inbound.safe")} ${t(state.lang, "inbound.expert")}</p>
    </section>
  `;
}

function renderCompany() {
  const purposes = [
    "旅館、ホテル、簡易宿所及び民泊施設等の企画、開発、運営及び管理",
    "不動産の売買、賃貸、仲介、斡旋及び管理",
    "海外からの医療受診者及び美容観光客に対する仲介、斡旋及びアテンドサービス",
    "外国人の日本国内における在留資格取得及び滞在に関するコンサルティング業務"
  ];
  return `
    <section class="section">
      ${sectionHeading("company.profile", "sections.pageIntro")}
      <dl class="data-table">
        ${dataRow(t(state.lang, "company.legalName"), company.legalName)}
        ${dataRow(t(state.lang, "company.englishName"), company.englishName)}
        ${dataRow(t(state.lang, "company.address"), company.address)}
        ${dataRow(t(state.lang, "company.representative"), company.representative)}
        ${dataRow(t(state.lang, "company.established"), company.established)}
        ${dataRow(t(state.lang, "company.currentBusiness"), company.currentBusiness)}
        ${dataRow(t(state.lang, "company.businessPurpose"), `<ul>${purposes.map((item) => `<li>${item}</li>`).join("")}</ul>`)}
      </dl>
      <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: company.legalName,
        alternateName: company.englishName,
        address: company.address,
        foundingDate: "2026-08-18"
      })}</script>
    </section>
  `;
}

function renderContact() {
  return `
    <section class="section">
      ${sectionHeading("common.contact", "sections.pageIntro")}
      <form class="form-panel" id="contact-form" novalidate>
        <div class="form-grid">
          ${fieldInput("fullName", "forms.fullName", "text", "", state.contactErrors.fullName, "span-2")}
          ${fieldInput("email", "forms.email", "email", "", state.contactErrors.email, "span-2")}
          ${fieldSelect("topic", "forms.topic", inquiryCategories.map((key) => [key, t(state.lang, `categories.${key}`)]), "", state.contactErrors.topic, "span-2")}
          ${fieldTextarea("message", "forms.message", "", state.contactErrors.message, "span-4")}
        </div>
        <p>${t(state.lang, "common.ask")}。電話番号、メールアドレスは正式公開前に設定してください。</p>
        <div class="button-row"><button class="primary-button" type="submit">${t(state.lang, "common.send")}</button></div>
        <p class="notice" id="contact-status" hidden></p>
      </form>
    </section>
  `;
}

function renderReservation() {
  const reservation = readJson(storage.latestReservation, null);
  if (!reservation) {
    return `<section class="section utility-page">${sectionHeading("common.reservation", "reservationPage.lead")}<p class="notice">${t(state.lang, "reservationPage.empty")}</p><a class="primary-button" href="booking.html">${t(state.lang, "common.startBooking")}</a></section>`;
  }

  return `
    <section class="section utility-page">
      ${sectionHeading("common.reservation", "reservationPage.lead")}
      <dl class="data-table">
        ${dataRow(t(state.lang, "forms.reservationNumber"), reservation.number)}
        ${dataRow(t(state.lang, "forms.stay"), reservation.stayName)}
        ${dataRow(t(state.lang, "forms.checkIn"), formatDate(reservation.checkIn, state.lang))}
        ${dataRow(t(state.lang, "forms.checkOut"), formatDate(reservation.checkOut, state.lang))}
        ${dataRow(t(state.lang, "booking.total"), formatCurrency(reservation.total, state.lang))}
        ${dataRow(t(state.lang, "reservationPage.status"), reservation.reservationStatus)}
        ${dataRow(t(state.lang, "reservationPage.payment"), reservation.paymentStatus)}
      </dl>
    </section>
  `;
}

function renderPaymentResult() {
  const params = new URLSearchParams(location.search);
  const status = params.get("status") || "unknown";
  const reservation = readJson(storage.latestReservation, null);
  const key = ["success", "failed", "canceled"].includes(status) ? status : "unknown";
  return `
    <section class="section utility-page">
      ${sectionHeading("common.paymentResult", `payment.${key}Note`)}
      <div class="result-panel">
        <span class="status-pill">${t(state.lang, `payment.${key}`)}</span>
        ${reservation ? `<h3>${reservation.number}</h3><p>${pickLocalized(getStayById(reservation.stayId).name, state.lang)} ${formatCurrency(reservation.total, state.lang)}</p>` : ""}
        <div class="button-row">
          <a class="primary-button" href="reservation.html">${t(state.lang, "common.reservation")}</a>
          <a class="secondary-button" href="booking.html">${t(state.lang, "common.startBooking")}</a>
        </div>
      </div>
    </section>
  `;
}

function renderLegal(kind) {
  return `
    <section class="section utility-page">
      ${sectionHeading(`common.${kind}`, "legal.draft")}
      <article class="result-panel">
        <p>${t(state.lang, `legal.${kind}`)}</p>
        <p>${t(state.lang, "common.ask")}。</p>
      </article>
    </section>
  `;
}

function renderOffline() {
  return `<section class="section utility-page">${sectionHeadingText(t(state.lang, "common.offline"), t(state.lang, "common.safeNote"))}</section>`;
}

function renderNotFound() {
  return `<section class="section utility-page">${sectionHeadingText(t(state.lang, "common.pageNotFound"), t(state.lang, "sections.pageIntro"))}<a class="primary-button" href="index.html">${t(state.lang, "common.home")}</a></section>`;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div>
          <img src="./assets/logo.svg" alt="${t(state.lang, "common.brand")}" width="220" height="56">
          <p>${t(state.lang, "common.closing")}</p>
          <p>${company.address}</p>
        </div>
        <div class="footer-links">
          <a href="company.html">${t(state.lang, "common.company")}</a>
          <a href="privacy.html">${t(state.lang, "common.privacy")}</a>
          <a href="terms.html">${t(state.lang, "common.terms")}</a>
          <a href="cancellation.html">${t(state.lang, "common.cancellation")}</a>
        </div>
      </div>
    </footer>
  `;
}

function renderChat() {
  const unread = 1;
  return `
    <button class="chat-launcher" type="button" data-chat-open aria-label="${t(state.lang, "chat.launcher")}">
      ✉ ${t(state.lang, "chat.title")} <span class="unread-count" aria-label="${t(state.lang, "chat.unread")}">${unread}</span>
    </button>
    <aside class="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
      <div class="chat-header">
        <div><strong id="chat-title">${t(state.lang, "chat.title")}</strong><br><small>${t(state.lang, "chat.noAutoTranslate")}</small></div>
        <button class="icon-button" type="button" data-chat-close aria-label="${t(state.lang, "common.close")}">×</button>
      </div>
      <div class="chat-meta">
        <label>${t(state.lang, "chat.reservationOptional")}<input id="chat-reservation" autocomplete="off"></label>
        <label>${t(state.lang, "chat.nameOptional")}<input id="chat-name" autocomplete="name"></label>
        <label style="grid-column: 1 / -1;">${t(state.lang, "chat.category")}
          <select id="chat-category">${inquiryCategories.map((key) => `<option value="${key}">${t(state.lang, `categories.${key}`)}</option>`).join("")}</select>
        </label>
      </div>
      <div class="chat-log" id="chat-log" aria-live="polite"></div>
      <form class="chat-compose" id="chat-form">
        <label class="sr-status" for="chat-input">${t(state.lang, "chat.placeholder")}</label>
        <textarea id="chat-input" placeholder="${t(state.lang, "chat.placeholder")}">${readText(storage.chatDraft)}</textarea>
        <button class="primary-button" type="submit">${t(state.lang, "chat.sendDemoReply")}</button>
      </form>
    </aside>
  `;
}

function renderStaySearchForm() {
  const areas = [...new Set(accommodations.map((stay) => stay.area))];
  return `
    <form class="form-panel" id="stay-search-form">
      <div class="form-grid">
        ${fieldInput("checkIn", "forms.checkIn", "date", todayIso(), "", "")}
        ${fieldInput("checkOut", "forms.checkOut", "date", addDaysIso(2), "", "")}
        ${fieldInput("adults", "forms.adults", "number", "2", "", "", { min: 0 })}
        ${fieldInput("children", "forms.children", "number", "0", "", "", { min: 0 })}
        ${fieldSelect("area", "forms.area", [["", t(state.lang, "common.all")], ...areas.map((area) => [area, area])], "", "", "span-2")}
        ${fieldSelect("roomType", "forms.roomType", [["", t(state.lang, "common.all")], ["suite", t(state.lang, "roomTypes.suite")], ["house", t(state.lang, "roomTypes.house")], ["studio", t(state.lang, "roomTypes.studio")]], "", "", "span-2")}
      </div>
      <div class="button-row"><button class="primary-button" type="submit">⌕ ${t(state.lang, "common.searchStays")}</button></div>
    </form>
  `;
}

function renderPropertySearchForm() {
  const areas = [...new Set(properties.map((property) => property.area))];
  return `
    <form class="form-panel" id="property-search-form">
      <div class="form-grid">
        ${fieldSelect("deal", "forms.deal", [["", t(state.lang, "common.all")], ["sale", t(state.lang, "property.sale")], ["rent", t(state.lang, "property.rent")]], "", "")}
        ${fieldSelect("area", "forms.area", [["", t(state.lang, "common.all")], ...areas.map((area) => [area, area])], "", "")}
        ${fieldSelect("propertyType", "forms.propertyType", [["", t(state.lang, "common.all")], ["building", t(state.lang, "property.building")], ["residence", t(state.lang, "property.residence")], ["office", t(state.lang, "property.office")]], "", "")}
        ${fieldSelect("layout", "forms.layout", [["", t(state.lang, "common.all")], ["一棟", "一棟"], ["2LDK", "2LDK"], ["区画", "区画"]], "", "")}
        <label class="field span-2"><span><input type="checkbox" name="minpakuConsult"> ${t(state.lang, "forms.minpakuConsult")}</span></label>
        <label class="field span-2"><span><input type="checkbox" name="managementConsult"> ${t(state.lang, "forms.managementConsult")}</span></label>
      </div>
      <div class="button-row"><button class="primary-button" type="submit">⌕ ${t(state.lang, "common.searchProperties")}</button></div>
    </form>
  `;
}

function renderStayCard(stay) {
  return `
    <article class="card" data-area="${stay.area}" data-room-type="${stay.roomType}">
      <div class="media" data-tone="${stay.galleryTone}"><span class="media-label">${t(state.lang, "common.demo")}</span></div>
      <div class="card-body">
        <div class="meta-row"><span class="badge">${stay.area}</span><span class="badge">${t(state.lang, `roomTypes.${stay.roomType}`)}</span></div>
        <h3>${pickLocalized(stay.name, state.lang)}</h3>
        <p>${pickLocalized(stay.short, state.lang)}</p>
        <p><strong>${t(state.lang, "common.from")} ${formatCurrency(stay.baseNightlyRate, state.lang)}</strong> / ${t(state.lang, "common.night")}</p>
        <div class="button-row">
          <a class="secondary-button" href="stay-detail.html?stayId=${stay.id}">${t(state.lang, "common.details")}</a>
          <a class="primary-button" href="booking.html?stayId=${stay.id}">${t(state.lang, "common.bookNow")}</a>
        </div>
      </div>
    </article>
  `;
}

function renderPropertyCard(property) {
  return `
    <article class="card" data-area="${property.area}" data-deal="${property.deal}" data-property-type="${property.type}" data-layout="${property.layout}" data-minpaku="${property.minpakuConsult}" data-management="${property.managementConsult}">
      <div class="media" data-tone="${property.galleryTone}"><span class="media-label">${t(state.lang, "common.demo")}</span></div>
      <div class="card-body">
        <div class="meta-row"><span class="badge">${property.area}</span><span class="badge">${t(state.lang, `property.${property.deal}`)}</span></div>
        <h3>${pickLocalized(property.name, state.lang)}</h3>
        <p>${pickLocalized(property.point, state.lang)}</p>
        <p><strong>${property.priceLabel}</strong></p>
        <div class="button-row">
          <a class="secondary-button" href="property-detail.html?propertyId=${property.id}">${t(state.lang, "common.details")}</a>
          <a class="primary-button" href="viewing.html?propertyId=${property.id}">${t(state.lang, "common.viewing")}</a>
        </div>
      </div>
    </article>
  `;
}

function renderPriceBreakdown(price) {
  return `
    <div class="result-panel" style="margin-top: 18px;">
      <h3>${t(state.lang, "booking.priceBreakdown")}</h3>
      <div class="price-list">
        ${priceLine(`${t(state.lang, "booking.nightly")} × ${price.nights}${t(state.lang, "common.night")}`, price.nightlySubtotal)}
        ${priceLine(t(state.lang, "booking.cleaning"), price.cleaningFee)}
        ${price.optionFee ? priceLine(t(state.lang, "booking.option"), price.optionFee) : ""}
        ${priceLine(t(state.lang, "booking.serviceTax"), price.serviceTax)}
        ${priceLine(t(state.lang, "booking.total"), price.total, true)}
      </div>
    </div>
  `;
}

function renderValueCard(title, key) {
  const body = {
    stayManagement: t(state.lang, "services.stayBody"),
    propertyManagement: t(state.lang, "services.propertyBody"),
    inboundMedical: t(state.lang, "inbound.safe"),
    beautyTourism: t(state.lang, "inbound.expert"),
    residenceStatus: t(state.lang, "inbound.expert")
  }[key] || t(state.lang, "sections.pageIntro");
  return `<article class="card"><div class="card-body"><span class="badge">${t(state.lang, "common.demoMode")}</span><h3>${title}</h3><p>${body}</p></div></article>`;
}

function bindCommon() {
  const languageToggle = document.querySelector("[data-language-toggle]");
  const languageMenu = document.querySelector("#language-menu");
  languageToggle?.addEventListener("click", () => {
    languageMenu.classList.toggle("is-open");
    languageToggle.setAttribute("aria-expanded", String(languageMenu.classList.contains("is-open")));
  });

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      state.lang = storeLanguage(button.dataset.language);
      state.bookingErrors = {};
      state.viewingErrors = {};
      state.contactErrors = {};
      render();
    });
  });

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("#mobile-menu");
  menuToggle?.addEventListener("click", () => {
    mobileMenu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(mobileMenu.classList.contains("is-open")));
  });

  document.querySelector("[data-chat-open]")?.addEventListener("click", openChat);
  document.querySelector("[data-chat-close]")?.addEventListener("click", closeChat);
  document.querySelector("#chat-input")?.addEventListener("input", (event) => {
    localStorage.setItem(storage.chatDraft, event.target.value);
    announce(t(state.lang, "chat.draftSaved"));
  });
  document.querySelector("#chat-form")?.addEventListener("submit", handleChatSubmit);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeChat();
      document.querySelector("#language-menu")?.classList.remove("is-open");
      document.querySelector("#mobile-menu")?.classList.remove("is-open");
    }
  }, { once: true });
}

function bindPage() {
  document.querySelector("#stay-search-form")?.addEventListener("submit", handleStaySearch);
  document.querySelector("#property-search-form")?.addEventListener("submit", handlePropertySearch);
  document.querySelector("#booking-form")?.addEventListener("submit", handleBookingNext);
  document.querySelector("[data-booking-back]")?.addEventListener("click", handleBookingBack);
  document.querySelectorAll("[data-demo-payment]").forEach((button) => button.addEventListener("click", handleDemoPayment));
  document.querySelector("#viewing-form")?.addEventListener("submit", handleViewingSubmit);
  document.querySelector("#contact-form")?.addEventListener("submit", handleContactSubmit);
}

function handleStaySearch(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const area = form.get("area");
  const roomType = form.get("roomType");
  const results = [...document.querySelectorAll("#stay-results .card")];

  if (!results.length && page === "home") {
    location.href = `stays.html?area=${encodeURIComponent(area || "")}&roomType=${encodeURIComponent(roomType || "")}`;
    return;
  }

  let visible = 0;
  results.forEach((card) => {
    const matchesArea = !area || card.dataset.area === area;
    const matchesType = !roomType || card.dataset.roomType === roomType;
    const show = matchesArea && matchesType;
    card.hidden = !show;
    if (show) visible += 1;
  });
  announce(visible ? `${visible}` : t(state.lang, "common.noResults"));
}

function handlePropertySearch(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const filters = {
    area: form.get("area"),
    deal: form.get("deal"),
    propertyType: form.get("propertyType"),
    layout: form.get("layout"),
    minpaku: form.get("minpakuConsult") ? "true" : "",
    management: form.get("managementConsult") ? "true" : ""
  };
  let visible = 0;

  document.querySelectorAll("#property-results .card").forEach((card) => {
    const show =
      (!filters.area || card.dataset.area === filters.area) &&
      (!filters.deal || card.dataset.deal === filters.deal) &&
      (!filters.propertyType || card.dataset.propertyType === filters.propertyType) &&
      (!filters.layout || card.dataset.layout === filters.layout) &&
      (!filters.minpaku || card.dataset.minpaku === filters.minpaku) &&
      (!filters.management || card.dataset.management === filters.management);
    card.hidden = !show;
    if (show) visible += 1;
  });
  announce(visible ? `${visible}` : t(state.lang, "common.noResults"));
}

function handleBookingNext(event) {
  event.preventDefault();
  const draft = collectBookingDraft(event.currentTarget);
  localStorage.setItem(storage.bookingDraft, JSON.stringify(draft));
  const step = Number(sessionStorage.getItem(storage.bookingStep) || "1");
  state.bookingErrors = {};

  if (step < 3) {
    sessionStorage.setItem(storage.bookingStep, String(step + 1));
    render();
    return;
  }

  const result = createDemoReservation(draft, accommodations);
  if (!result.ok) {
    state.bookingErrors = result.errors;
    sessionStorage.setItem(storage.bookingStep, "3");
    render();
    return;
  }

  localStorage.setItem(storage.latestReservation, JSON.stringify(result.reservation));
  sessionStorage.setItem(storage.bookingStep, "4");
  announce(t(state.lang, "booking.created"));
  render();
}

function handleBookingBack() {
  const step = Number(sessionStorage.getItem(storage.bookingStep) || "1");
  sessionStorage.setItem(storage.bookingStep, String(Math.max(step - 1, 1)));
  render();
}

function handleDemoPayment(event) {
  const status = event.currentTarget.dataset.demoPayment;
  const reservation = readJson(storage.latestReservation, null);
  if (reservation) {
    reservation.paymentStatus = `demo_${status}`;
    reservation.reservationStatus = status === "success" ? "demo_confirmed" : "payment_required";
    localStorage.setItem(storage.latestReservation, JSON.stringify(reservation));
  }
  location.href = `payment-result.html?status=${status}`;
}

function handleViewingSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  const result = validateViewingPayload(payload);
  state.viewingErrors = result.errors;
  if (!result.valid) {
    render();
    return;
  }
  const status = document.querySelector("#viewing-status");
  status.hidden = false;
  status.textContent = `${t(state.lang, "common.sent")}。担当者確認待ちです。`;
}

function handleContactSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  const result = validateContactPayload(payload);
  state.contactErrors = result.errors;
  if (!result.valid) {
    render();
    return;
  }
  const status = document.querySelector("#contact-status");
  status.hidden = false;
  status.textContent = t(state.lang, "common.sent");
}

function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.querySelector("#chat-input");
  const text = input.value.trim();
  if (!text) return;
  const messages = readJson(storage.chatMessages, defaultChatMessages());
  messages.push({
    role: "user",
    text,
    at: new Date().toISOString()
  });
  localStorage.setItem(storage.chatMessages, JSON.stringify(messages));
  localStorage.removeItem(storage.chatDraft);
  input.value = "";
  renderChatMessages();
  announce(t(state.lang, "common.sent"));
}

function renderChatMessages() {
  const log = document.querySelector("#chat-log");
  if (!log) return;
  log.replaceChildren();
  const messages = readJson(storage.chatMessages, defaultChatMessages());
  for (const message of messages) {
    const bubble = document.createElement("div");
    bubble.className = `message ${message.role === "user" ? "user" : "operator"}`;
    const body = document.createElement("div");
    // Chat bodies are evidence for direct operations support, so never translate, summarize, or render them as HTML.
    body.textContent = message.text;
    const time = document.createElement("small");
    time.textContent = new Date(message.at).toLocaleTimeString();
    bubble.append(body, time);
    log.append(bubble);
  }
  log.scrollTop = log.scrollHeight;
}

function defaultChatMessages() {
  return [
    {
      role: "operator",
      text: t(state.lang, "chat.intro"),
      at: new Date().toISOString()
    }
  ];
}

function openChat() {
  const panel = document.querySelector("#chat-panel");
  panel?.classList.add("is-open");
  document.querySelector("#chat-input")?.focus();
}

function closeChat() {
  document.querySelector("#chat-panel")?.classList.remove("is-open");
  document.querySelector("[data-chat-open]")?.focus();
}

function collectBookingDraft(form) {
  const previous = readJson(storage.bookingDraft, defaultBookingDraft(getStayFromUrl().id));
  const data = Object.fromEntries(new FormData(form));
  const hasWithSupportControl = Boolean(form.querySelector('[name="withSupport"]'));
  const hasAgreeControl = Boolean(form.querySelector('[name="agree"]'));
  return {
    ...previous,
    ...data,
    adults: Number(data.adults ?? previous.adults ?? 1),
    children: Number(data.children ?? previous.children ?? 0),
    withSupport: hasWithSupportControl ? Boolean(data.withSupport) : Boolean(previous.withSupport),
    agree: hasAgreeControl ? Boolean(data.agree) : Boolean(previous.agree)
  };
}

function hiddenBookingFields(draft) {
  return Object.entries(draft)
    .filter(([key]) => !["withSupport", "agree"].includes(key))
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeAttribute(value)}">`)
    .join("");
}

function defaultBookingDraft(stayId = accommodations[0].id) {
  return {
    stayId,
    checkIn: addDaysIso(1),
    checkOut: addDaysIso(3),
    adults: 2,
    children: 0,
    withSupport: true,
    fullName: "",
    email: "",
    phone: "",
    country: "",
    arrivalTime: "16:00",
    notes: "",
    agree: false
  };
}

function fieldInput(name, labelKey, type, value = "", error = "", className = "", attrs = {}) {
  const extra = Object.entries(attrs)
    .map(([key, attrValue]) => `${key}="${attrValue}"`)
    .join(" ");
  return `
    <label class="field ${className}">
      <span>${t(state.lang, labelKey)}</span>
      <input name="${name}" type="${type}" value="${escapeAttribute(value)}" ${extra} aria-invalid="${Boolean(error)}">
      <span class="error-text">${errorText(error)}</span>
    </label>
  `;
}

function fieldTextarea(name, labelKey, value = "", error = "", className = "") {
  return `
    <label class="field ${className}">
      <span>${t(state.lang, labelKey)}</span>
      <textarea name="${name}" aria-invalid="${Boolean(error)}">${escapeHtml(value)}</textarea>
      <span class="error-text">${errorText(error)}</span>
    </label>
  `;
}

function fieldSelect(name, labelKey, options, value = "", error = "", className = "") {
  return `
    <label class="field ${className}">
      <span>${t(state.lang, labelKey)}</span>
      <select name="${name}" aria-invalid="${Boolean(error)}">
        ${options.map(([optionValue, label]) => `<option value="${escapeAttribute(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${label}</option>`).join("")}
      </select>
      <span class="error-text">${errorText(error)}</span>
    </label>
  `;
}

function sectionHeading(titleKey, leadKey) {
  return sectionHeadingText(t(state.lang, titleKey), t(state.lang, leadKey));
}

function sectionHeadingText(title, lead) {
  return `<div class="section-heading"><span class="eyebrow">${t(state.lang, "common.brand")}</span><h2>${title}</h2><p>${lead}</p></div>`;
}

function dataRow(label, value) {
  return `<div class="data-row"><dt>${label}</dt><dd>${value}</dd></div>`;
}

function priceLine(label, value, total = false) {
  return `<div class="price-line ${total ? "total" : ""}"><span>${label}</span><strong>${formatCurrency(value, state.lang)}</strong></div>`;
}

function errorText(errorKey) {
  return errorKey ? t(state.lang, errorKey) : "";
}

function getStayFromUrl() {
  return getStayById(new URLSearchParams(location.search).get("stayId"));
}

function getStayById(stayId) {
  return accommodations.find((stay) => stay.id === stayId) || accommodations[0];
}

function getPropertyFromUrl() {
  const id = new URLSearchParams(location.search).get("propertyId");
  return properties.find((property) => property.id === id) || properties[0];
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readText(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayIso(date);
}

function escapeAttribute(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function announce(text) {
  const status = document.querySelector("#sr-status");
  if (status) status.textContent = text;
}

function isCurrentPage(key) {
  if (key === "home") return page === "home";
  if (key === "stays") return ["stays", "stay-detail"].includes(page);
  if (key === "properties") return ["properties", "property-detail", "viewing"].includes(page);
  return page === key;
}

function updateCanonical() {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = new URL(location.pathname, location.origin).toString();
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

render();
