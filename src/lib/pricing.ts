import type { PriceBreakdown } from "./types";
import { nightsBetween } from "./format";

/**
 * Central price calculator — the SINGLE source of truth for pricing.
 *
 * IMPORTANT: this runs on BOTH client (for display) and server (for the real
 * charge). The server never trusts an amount sent from the client: it recomputes
 * the total here from the plan id + dates + guests before creating a payment.
 * See src/app/api/checkout/route.ts.
 */
export const SERVICE_FEE_RATE = 0.1; // 10%
export const LODGING_TAX_RATE = 0.05; // simplified demo tax; replace with real 宿泊税 rules
export const CHILD_OPTION_FEE = 1000; // JPY per child per night (bedding/amenities), demo value

export function computePrice(params: {
  pricePerNight: number;
  cleaningFee: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}): PriceBreakdown {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const nightly = Math.max(0, Math.round(params.pricePerNight * nights));
  const cleaningFee = nights > 0 ? params.cleaningFee : 0;
  const options = Math.max(0, params.children) * CHILD_OPTION_FEE * nights;
  const preTax = nightly + cleaningFee + options;
  const serviceFee = Math.round(preTax * SERVICE_FEE_RATE);
  const taxes = Math.round((preTax + serviceFee) * LODGING_TAX_RATE);
  const total = preTax + serviceFee + taxes;

  return {
    nights,
    nightly,
    cleaningFee,
    serviceFee,
    taxes,
    options,
    total,
    currency: "JPY",
  };
}
