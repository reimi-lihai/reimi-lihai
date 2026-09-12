import type { Locale } from "@/i18n/config";

/** A localized string: keys are locales, `ja` is guaranteed. */
export type Localized = { ja: string } & Partial<Record<Locale, string>>;

export type StayType = "machiya" | "apartment" | "house" | "villa";

export interface RoomPlan {
  id: string;
  name: Localized;
  /** base price per night, in JPY (integer yen) */
  pricePerNight: number;
  maxGuests: number;
  includes: Localized[];
}

export interface Accommodation {
  id: string;
  slug: string;
  demo: true; // every listing here is demo data — never presented as a real, bookable property
  name: Localized;
  type: StayType;
  area: Localized;
  address: Localized;
  summary: Localized;
  description: Localized;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  pricePerNight: number; // "from" price, JPY
  cleaningFee: number; // JPY
  rating: number;
  reviews: number;
  checkInTime: string;
  checkOutTime: string;
  amenities: Localized[];
  highlights: Localized[];
  houseRules: Localized[];
  plans: RoomPlan[];
  /** image accent hue for the CSS placeholder art */
  accent: string;
  heroImage?: string;
}

export type Deal = "sale" | "rent";
export type PropertyType = "apartment" | "house" | "building" | "land";

export interface Property {
  id: string;
  slug: string;
  demo: true;
  name: Localized;
  deal: Deal;
  type: PropertyType;
  area: Localized;
  address: Localized;
  /** JPY — total for sale, monthly for rent */
  price: number;
  layout: string; // e.g. "2LDK"
  sizeSqm: number;
  builtYear: number;
  summary: Localized;
  features: Localized[];
  highlights: Localized[];
  minpakuReady: boolean;
  accent: string;
}

export interface PriceBreakdown {
  nights: number;
  nightly: number; // total nightly across the stay
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  options: number;
  total: number;
  currency: "JPY";
}

export interface BookingDraft {
  accommodationId: string;
  planId: string;
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  adults: number;
  children: number;
}
