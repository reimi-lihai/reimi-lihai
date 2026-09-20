/**
 * Database schema (PostgreSQL / Supabase) — Drizzle ORM.
 *
 * Conventions
 *  - uuid primary keys, timestamptz stored in UTC, displayed in the viewer's TZ.
 *  - Stay dates are property-local calendar dates (`date`), [check_in, check_out).
 *  - Multilingual text is jsonb `{ ja, en?, zh-Hant?, zh-Hans?, ko? }` (same shape
 *    as the frontend `Localized` type), `ja` required.
 *  - Money is integer JPY (zero-decimal currency).
 *
 * Constraints that Drizzle can't express (exclusion constraint against double
 * booking, append-only audit log) live in migrations/0001_constraints.sql.
 */
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type LocalizedJson = { ja: string } & Partial<Record<"en" | "zh-Hant" | "zh-Hans" | "ko", string>>;

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Accounts & permissions                                              */
/* ------------------------------------------------------------------ */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["master", "admin"] }).notNull().default("admin"),
  /** fine-grained permission keys, see src/server/auth/rbac.ts */
  permissions: text("permissions").array().notNull().default([]),
  /** IANA tz, e.g. Asia/Tokyo, America/Toronto. Used for every timestamp shown to this admin. */
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  /** auto = follow the browser on each login; manual = keep `timezone` */
  timezoneMode: text("timezone_mode", { enum: ["auto", "manual"] }).notNull().default("auto"),
  locale: text("locale").notNull().default("ja"),
  /** scrypt hash — production replaces this with Supabase Auth + TOTP */
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: ts("last_login_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type", { enum: ["admin", "guest", "system"] }).notNull(),
    actorId: uuid("actor_id"),
    actorLabel: text("actor_label"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    diff: jsonb("diff"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
  },
  (t) => ({
    byTime: index("audit_logs_time_idx").on(t.occurredAt),
    byEntity: index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  })
);

/* ------------------------------------------------------------------ */
/* CMS: properties, units, plans                                       */
/* ------------------------------------------------------------------ */

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  business: text("business", { enum: ["stay", "real_estate"] }).notNull(),
  name: jsonb("name").$type<LocalizedJson>().notNull(),
  area: jsonb("area").$type<LocalizedJson>(),
  summary: jsonb("summary").$type<LocalizedJson>(),
  description: jsonb("description").$type<LocalizedJson>(),
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  checkInTime: text("check_in_time").notNull().default("15:00"),
  checkOutTime: text("check_out_time").notNull().default("11:00"),
  cleaningFee: integer("cleaning_fee").notNull().default(0),
  wifiSsid: text("wifi_ssid"),
  wifiPassword: text("wifi_password"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: jsonb("name").$type<LocalizedJson>().notNull(),
  maxGuests: integer("max_guests").notNull(),
  bedrooms: integer("bedrooms").notNull().default(1),
  createdAt: createdAt(),
});

export const ratePlans = pgTable("rate_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: jsonb("name").$type<LocalizedJson>().notNull(),
  basePrice: integer("base_price").notNull(),
  minNights: integer("min_nights").notNull().default(1),
  maxGuests: integer("max_guests").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

/** Per-date manual override of a plan: price and/or stop-sell. */
export const rateOverrides = pgTable(
  "rate_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ratePlanId: uuid("rate_plan_id").notNull().references(() => ratePlans.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    price: integer("price"),
    closed: boolean("closed").notNull().default(false),
    minNights: integer("min_nights"),
    createdAt: createdAt(),
  },
  (t) => ({ planDate: uniqueIndex("rate_overrides_plan_date_idx").on(t.ratePlanId, t.date) })
);

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** all = every stay property; otherwise targetId points at that property / unit / plan */
  scope: text("scope", { enum: ["all", "property", "unit", "plan"] }).notNull(),
  targetId: uuid("target_id"),
  name: text("name").notNull(),
  ruleType: text("rule_type", {
    enum: ["weekday", "date_range", "season", "lead_time", "length_of_stay", "occupancy"],
  }).notNull(),
  condition: jsonb("condition").notNull(),
  adjustType: text("adjust_type", { enum: ["percent", "fixed", "override"] }).notNull(),
  adjustValue: integer("adjust_value").notNull(),
  priority: integer("priority").notNull().default(100),
  stackable: boolean("stackable").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Customers & reservations                                            */
/* ------------------------------------------------------------------ */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  givenName: text("given_name").notNull(),
  familyName: text("family_name").notNull(),
  phone: text("phone"),
  country: text("country"),
  preferredLocale: text("preferred_locale").notNull().default("ja"),
  tags: text("tags").array().notNull().default([]),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  createdAt: createdAt(),
});

export const RESERVATION_STATUSES = [
  "hold",
  "pending_payment",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** display number REI-1024 — never used as a credential */
    code: text("code").notNull().unique(),
    kind: text("kind", { enum: ["stay", "viewing"] }).notNull(),
    propertyId: uuid("property_id").notNull().references(() => properties.id),
    unitId: uuid("unit_id").references(() => units.id),
    ratePlanId: uuid("rate_plan_id").references(() => ratePlans.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    checkIn: date("check_in", { mode: "string" }),
    checkOut: date("check_out", { mode: "string" }),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    status: text("status", { enum: RESERVATION_STATUSES }).notNull(),
    priceSnapshot: jsonb("price_snapshot").notNull().default({}),
    totalAmount: integer("total_amount").notNull().default(0),
    currency: text("currency").notNull().default("JPY"),
    source: text("source").notNull().default("direct"),
    utmSource: text("utm_source"),
    utmCampaign: text("utm_campaign"),
    locale: text("locale").notNull().default("ja"),
    holdExpiresAt: ts("hold_expires_at"),
    note: text("note"),
    /** guest-entered at booking */
    arrivalTime: text("arrival_time"),
    messagingId: text("messaging_id"),
    guestNote: text("guest_note"),
    cancelledAt: ts("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    byStay: index("reservations_stay_idx").on(t.unitId, t.checkIn, t.checkOut),
    byStatus: index("reservations_status_idx").on(t.status),
  })
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  kind: text("kind", { enum: ["charge", "preauth", "deposit"] }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  amount: integer("amount").notNull(),
  amountCaptured: integer("amount_captured").notNull().default(0),
  amountRefunded: integer("amount_refunded").notNull().default(0),
  status: text("status").notNull(),
  qrCodeId: uuid("qr_code_id"),
  capturedAt: ts("captured_at"),
  createdAt: createdAt(),
});

/** Site-wide business settings editable from the admin (e.g. cancellation policy). */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Processed Stripe webhook events — makes webhook handling idempotent. */
export const stripeEvents = pgTable("stripe_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: ts("processed_at").notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  stripeRefundId: text("stripe_refund_id").unique(),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  requestedBy: uuid("requested_by"),
  status: text("status").notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").references(() => customers.id),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  category: text("category", {
    enum: ["facility", "booking_change", "access", "inbound", "real_estate", "other"],
  }).notNull(),
  status: text("status", { enum: ["received", "in_progress", "resolved"] }).notNull().default("received"),
  assigneeId: uuid("assignee_id").references(() => adminUsers.id),
  lastMessageAt: ts("last_message_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderType: text("sender_type", { enum: ["guest", "admin", "system"] }).notNull(),
  senderId: uuid("sender_id"),
  /** stored verbatim — never machine-translated */
  body: text("body").notNull(),
  attachments: jsonb("attachments").notNull().default([]),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Operations: tasks                                                    */
/* ------------------------------------------------------------------ */

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  reservationId: uuid("reservation_id").references(() => reservations.id, { onDelete: "set null" }),
  type: text("type", { enum: ["cleaning", "maintenance", "inspection"] }).notNull(),
  title: text("title").notNull(),
  dueAt: ts("due_at").notNull(),
  assigneeId: uuid("assignee_id").references(() => adminUsers.id),
  status: text("status", { enum: ["todo", "doing", "done"] }).notNull().default("todo"),
  autoGenerated: boolean("auto_generated").notNull().default(false),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Smart lock & guest key                                              */
/* ------------------------------------------------------------------ */

export const lockDevices = pgTable("lock_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["demo", "remotelock", "sesame", "igloohome"] }).notNull(),
  externalId: text("external_id").notNull(),
  name: jsonb("name").$type<LocalizedJson>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  batteryLevel: integer("battery_level"),
  lastSeenAt: ts("last_seen_at"),
  createdAt: createdAt(),
});

export const lockCredentials = pgTable("lock_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  lockDeviceId: uuid("lock_device_id").notNull().references(() => lockDevices.id, { onDelete: "cascade" }),
  reservationId: uuid("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  providerCredentialId: text("provider_credential_id"),
  /** production: AES-GCM encrypted. Demo stores plaintext. */
  pinCode: text("pin_code").notNull(),
  validFrom: ts("valid_from").notNull(),
  validUntil: ts("valid_until").notNull(),
  status: text("status", { enum: ["pending", "active", "revoked", "failed"] }).notNull().default("active"),
  createdAt: createdAt(),
});

export const guestAccessPasses = pgTable(
  "guest_access_passes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
    /** sha256(token) — the raw token only ever exists in the URL / QR */
    tokenHash: bytea("token_hash").notNull(),
    validFrom: ts("valid_from").notNull(),
    validUntil: ts("valid_until").notNull(),
    status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
    verifyMethod: text("verify_method", { enum: ["surname", "phone_last4"] }).notNull().default("surname"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    sentAt: ts("sent_at"),
    lastUsedAt: ts("last_used_at"),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => ({ byHash: uniqueIndex("guest_access_passes_token_idx").on(t.tokenHash) })
);

export const unlockEvents = pgTable("unlock_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  passId: uuid("pass_id").notNull().references(() => guestAccessPasses.id, { onDelete: "cascade" }),
  lockDeviceId: uuid("lock_device_id").references(() => lockDevices.id),
  action: text("action", { enum: ["verify", "unlock", "lock"] }).notNull(),
  result: text("result", { enum: ["success", "denied", "error"] }).notNull(),
  reason: text("reason"),
  ipHash: text("ip_hash"),
  occurredAt: ts("occurred_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* QR tracking                                                          */
/* ------------------------------------------------------------------ */

export const qrCodes = pgTable("qr_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id),
  purpose: text("purpose", { enum: ["preauth", "guest_key", "checkin", "marketing"] }).notNull(),
  slug: text("slug").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const qrScans = pgTable("qr_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  qrCodeId: uuid("qr_code_id").notNull().references(() => qrCodes.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  scannedAt: ts("scanned_at").notNull().defaultNow(),
});
