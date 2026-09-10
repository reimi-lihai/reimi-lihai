const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function dateToUtc(dateText) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function nightsBetween(checkIn, checkOut) {
  const start = dateToUtc(checkIn);
  const end = dateToUtc(checkOut);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function findStay(stayId, accommodations) {
  return accommodations.find((stay) => stay.id === stayId) || accommodations[0];
}

export function calculateStayTotal(input, accommodations) {
  const stay = findStay(input.stayId, accommodations);
  const nights = Math.max(nightsBetween(input.checkIn, input.checkOut), stay.minNights);
  const adults = Math.max(Number(input.adults || 0), 0);
  const children = Math.max(Number(input.children || 0), 0);
  const guests = adults + children;
  const nightlySubtotal = stay.baseNightlyRate * nights;
  const cleaningFee = stay.cleaningFee;
  const optionFee = input.withSupport ? stay.optionFee : 0;
  const serviceTax = Math.round((nightlySubtotal + cleaningFee + optionFee) * 0.1);
  const total = nightlySubtotal + cleaningFee + optionFee + serviceTax;

  return {
    stay,
    nights,
    guests,
    nightlySubtotal,
    cleaningFee,
    optionFee,
    serviceTax,
    total,
    currency: "JPY"
  };
}

export function validateBookingPayload(input, accommodations, options = {}) {
  const errors = {};
  const now = options.now || new Date();
  const today = todayIso(now);
  const stay = findStay(input.stayId, accommodations);
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const adults = Number(input.adults || 0);
  const children = Number(input.children || 0);
  const guests = adults + children;

  if (!input.checkIn || input.checkIn < today) errors.checkIn = "errors.futureDate";
  if (!input.checkOut || nights <= 0) errors.checkOut = "errors.checkoutAfter";
  if (nights > 0 && nights < stay.minNights) errors.checkOut = "errors.minNights";
  if (!Number.isInteger(adults) || !Number.isInteger(children) || guests < 1) {
    errors.guests = "errors.guests";
  }
  if (guests > stay.capacity) errors.guests = "errors.capacity";
  if (!String(input.fullName || "").trim()) errors.fullName = "errors.required";
  if (!EMAIL_PATTERN.test(String(input.email || ""))) errors.email = "errors.email";
  if (!String(input.phone || "").trim()) errors.phone = "errors.required";
  if (!String(input.country || "").trim()) errors.country = "errors.required";
  if (!String(input.arrivalTime || "").trim()) errors.arrivalTime = "errors.required";
  if (!input.agree) errors.agree = "errors.agree";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function createReservationNumber(now = new Date(), random = Math.random) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const entropy = Math.floor(random() * 2176782336).toString(36).padStart(6, "0").toUpperCase();
  return `RK-${date}-${entropy}`;
}

export function createDemoReservation(input, accommodations, options = {}) {
  const validation = validateBookingPayload(input, accommodations, options);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const price = calculateStayTotal(input, accommodations);
  return {
    ok: true,
    reservation: {
      number: createReservationNumber(options.now || new Date(), options.random || Math.random),
      stayId: price.stay.id,
      stayName: price.stay.name.ja,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: Number(input.adults || 0),
      children: Number(input.children || 0),
      total: price.total,
      currency: price.currency,
      paymentStatus: "demo_pending",
      reservationStatus: "payment_required",
      idempotencyKey: `demo-${cryptoSafeId(options.random || Math.random)}`
    },
    price
  };
}

export function validateViewingPayload(input, options = {}) {
  const errors = {};
  const today = todayIso(options.now || new Date());
  if (!String(input.propertyId || "").trim()) errors.propertyId = "errors.required";
  if (!input.preferredDate || input.preferredDate < today) errors.preferredDate = "errors.futureDate";
  if (!String(input.preferredTime || "").trim()) errors.preferredTime = "errors.required";
  if (!String(input.fullName || "").trim()) errors.fullName = "errors.required";
  if (!EMAIL_PATTERN.test(String(input.email || ""))) errors.email = "errors.email";
  if (!String(input.phone || "").trim()) errors.phone = "errors.required";
  if (!String(input.message || "").trim()) errors.message = "errors.required";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateContactPayload(input) {
  const errors = {};
  if (!String(input.fullName || "").trim()) errors.fullName = "errors.required";
  if (!EMAIL_PATTERN.test(String(input.email || ""))) errors.email = "errors.email";
  if (!String(input.topic || "").trim()) errors.topic = "errors.required";
  if (!String(input.message || "").trim()) errors.message = "errors.required";
  return { valid: Object.keys(errors).length === 0, errors };
}

function cryptoSafeId(random) {
  const fallback = Math.floor(random() * 2176782336).toString(36).padStart(6, "0");
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`.slice(0, 12).toUpperCase();
  }
  return fallback.toUpperCase();
}
