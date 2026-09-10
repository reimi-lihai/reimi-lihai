import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { accommodations } from "../src/data.mjs";
import {
  calculateStayTotal,
  createDemoReservation,
  nightsBetween,
  validateBookingPayload,
  validateContactPayload,
  validateViewingPayload
} from "../src/booking-service.mjs";

const fixedNow = new Date("2026-09-10T00:00:00.000Z");

test("nightsBetween counts checkout as the end date", () => {
  assert.equal(nightsBetween("2026-09-11", "2026-09-14"), 3);
});

test("validateBookingPayload rejects past dates, invalid checkout, and missing agreement", () => {
  const result = validateBookingPayload(
    {
      stayId: "demo-minato-suite",
      checkIn: "2026-09-09",
      checkOut: "2026-09-09",
      adults: 0,
      children: 0,
      fullName: "",
      email: "bad",
      phone: "",
      country: "",
      arrivalTime: "",
      agree: false
    },
    accommodations,
    { now: fixedNow }
  );

  assert.equal(result.valid, false);
  assert.equal(result.errors.checkIn, "errors.futureDate");
  assert.equal(result.errors.checkOut, "errors.checkoutAfter");
  assert.equal(result.errors.guests, "errors.guests");
  assert.equal(result.errors.email, "errors.email");
  assert.equal(result.errors.agree, "errors.agree");
});

test("calculateStayTotal recalculates server-side values instead of trusting a submitted total", () => {
  const price = calculateStayTotal(
    {
      stayId: "demo-minato-suite",
      checkIn: "2026-09-11",
      checkOut: "2026-09-13",
      adults: 2,
      children: 0,
      withSupport: true,
      clientTotal: 1
    },
    accommodations
  );

  assert.equal(price.nights, 2);
  assert.equal(price.nightlySubtotal, 56000);
  assert.equal(price.cleaningFee, 7800);
  assert.equal(price.optionFee, 2200);
  assert.equal(price.serviceTax, 6600);
  assert.equal(price.total, 72600);
});

test("createDemoReservation issues a non-sequential reservation pending payment", () => {
  const result = createDemoReservation(
    {
      stayId: "demo-minato-suite",
      checkIn: "2026-09-11",
      checkOut: "2026-09-13",
      adults: 2,
      children: 0,
      withSupport: true,
      fullName: "Test User",
      email: "guest@example.com",
      phone: "09000000000",
      country: "Japan",
      arrivalTime: "16:00",
      agree: true
    },
    accommodations,
    { now: fixedNow, random: () => 0.5 }
  );

  assert.equal(result.ok, true);
  assert.match(result.reservation.number, /^RK-20260910-[0-9A-Z]{6}$/);
  assert.equal(result.reservation.reservationStatus, "payment_required");
  assert.equal(result.reservation.paymentStatus, "demo_pending");
});

test("viewing and contact validation require safe contact details", () => {
  assert.equal(
    validateViewingPayload(
      {
        propertyId: "",
        preferredDate: "2026-09-09",
        preferredTime: "",
        fullName: "",
        email: "x",
        phone: "",
        message: ""
      },
      { now: fixedNow }
    ).valid,
    false
  );

  assert.equal(validateContactPayload({ fullName: "A", email: "a@example.com", topic: "other", message: "Hello" }).valid, true);
});

test("chat rendering keeps user message text as textContent", async () => {
  const mainSource = await readFile(new URL("../src/main.mjs", import.meta.url), "utf8");
  assert.match(mainSource, /body\.textContent = message\.text/);
  assert.doesNotMatch(mainSource, /innerHTML = message\.text/);
});
