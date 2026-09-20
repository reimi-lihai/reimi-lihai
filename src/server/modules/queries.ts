/** Read models for the admin screens. */
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  adminUsers,
  auditLogs,
  conversations,
  customers,
  guestAccessPasses,
  lockCredentials,
  lockDevices,
  messages,
  payments,
  properties,
  reservations,
  tasks,
} from "../db/schema";
import { localDate } from "../time";
import { recentKeyEvents } from "./keys";

const LIVE = ["confirmed", "checked_in"] as const;

export async function dashboard() {
  const db = await getDb();
  const today = localDate("Asia/Tokyo");
  const weekEnd = localDate("Asia/Tokyo", 7);

  // A fresh builder per query — Drizzle builders are mutable and must not be shared.
  const base = () =>
    db
      .select({ r: reservations, p: properties, c: customers })
      .from(reservations)
      .innerJoin(properties, eq(properties.id, reservations.propertyId))
      .innerJoin(customers, eq(customers.id, reservations.customerId));

  const [arrivals, departures, inHouse, viewings, openChats, openTasks, lowBattery, stays] = await Promise.all([
    base().where(and(eq(reservations.kind, "stay"), eq(reservations.checkIn, today), inArray(reservations.status, [...LIVE]))),
    base().where(and(eq(reservations.kind, "stay"), eq(reservations.checkOut, today), inArray(reservations.status, [...LIVE]))),
    base().where(and(eq(reservations.kind, "stay"), eq(reservations.status, "checked_in"))),
    base().where(and(eq(reservations.kind, "viewing"), gte(reservations.startsAt, new Date()), ne(reservations.status, "cancelled"))).orderBy(asc(reservations.startsAt)),
    db
      .select({ c: conversations, cust: customers })
      .from(conversations)
      .leftJoin(customers, eq(customers.id, conversations.customerId))
      .where(ne(conversations.status, "resolved"))
      .orderBy(desc(conversations.lastMessageAt)),
    db
      .select({ t: tasks, p: properties })
      .from(tasks)
      .innerJoin(properties, eq(properties.id, tasks.propertyId))
      .where(ne(tasks.status, "done"))
      .orderBy(asc(tasks.dueAt))
      .limit(8),
    db
      .select({ d: lockDevices, p: properties })
      .from(lockDevices)
      .innerJoin(properties, eq(properties.id, lockDevices.propertyId))
      .where(lte(lockDevices.batteryLevel, 25)),
    // occupancy for next 7 nights
    db
      .select({ checkIn: reservations.checkIn, checkOut: reservations.checkOut, total: reservations.totalAmount })
      .from(reservations)
      .where(and(eq(reservations.kind, "stay"), inArray(reservations.status, [...LIVE]), lte(reservations.checkIn, weekEnd), gte(reservations.checkOut, today))),
  ]);

  const stayProps = await db.select({ id: properties.id }).from(properties).where(eq(properties.business, "stay"));
  let bookedNights = 0;
  for (let i = 0; i < 7; i++) {
    const night = localDate("Asia/Tokyo", i);
    bookedNights += stays.filter((s) => s.checkIn! <= night && s.checkOut! > night).length;
  }
  const occupancy = stayProps.length ? bookedNights / (stayProps.length * 7) : 0;

  const monthStart = today.slice(0, 8) + "01";
  const [rev] = await db
    .select({ sum: sql<number>`coalesce(sum(${payments.amountCaptured} - ${payments.amountRefunded}), 0)` })
    .from(payments)
    .where(gte(payments.capturedAt, new Date(monthStart + "T00:00:00+09:00")));

  return { today, arrivals, departures, inHouse, viewings, openChats, openTasks, lowBattery, occupancy, monthRevenue: Number(rev?.sum ?? 0) };
}

export async function listReservations(opts: { q?: string; status?: string; kind?: string } = {}) {
  const db = await getDb();
  const conds = [];
  if (opts.status) conds.push(eq(reservations.status, opts.status as never));
  if (opts.kind) conds.push(eq(reservations.kind, opts.kind as never));
  if (opts.q) {
    const q = `%${opts.q}%`;
    conds.push(or(ilike(reservations.code, q), ilike(customers.familyName, q), ilike(customers.givenName, q), ilike(customers.email, q)));
  }
  return db
    .select({ r: reservations, p: properties, c: customers })
    .from(reservations)
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`coalesce(${reservations.checkIn}::timestamptz, ${reservations.startsAt}) desc`)
    .limit(200);
}

export async function reservationDetail(code: string) {
  const db = await getDb();
  const [row] = await db
    .select({ r: reservations, p: properties, c: customers })
    .from(reservations)
    .innerJoin(properties, eq(properties.id, reservations.propertyId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(eq(reservations.code, code));
  if (!row) return null;

  const [pays, passes, creds, convs, tks, keyEvents, history] = await Promise.all([
    db.select().from(payments).where(eq(payments.reservationId, row.r.id)),
    db.select().from(guestAccessPasses).where(eq(guestAccessPasses.reservationId, row.r.id)).orderBy(desc(guestAccessPasses.createdAt)),
    db
      .select({ c: lockCredentials, d: lockDevices })
      .from(lockCredentials)
      .innerJoin(lockDevices, eq(lockDevices.id, lockCredentials.lockDeviceId))
      .where(eq(lockCredentials.reservationId, row.r.id))
      .orderBy(asc(lockDevices.sortOrder)),
    db.select().from(conversations).where(eq(conversations.reservationId, row.r.id)),
    db.select().from(tasks).where(eq(tasks.reservationId, row.r.id)),
    recentKeyEvents(db, row.r.id),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "reservation"), eq(auditLogs.entityId, code))).orderBy(desc(auditLogs.occurredAt)),
  ]);

  const msgs = convs.length
    ? await db.select().from(messages).where(inArray(messages.conversationId, convs.map((c) => c.id))).orderBy(asc(messages.createdAt))
    : [];

  return { ...row, payments: pays, passes, credentials: creds, conversations: convs, messages: msgs, tasks: tks, keyEvents, history };
}

export async function listConversations() {
  const db = await getDb();
  const rows = await db
    .select({ c: conversations, cust: customers, r: reservations, a: adminUsers })
    .from(conversations)
    .leftJoin(customers, eq(customers.id, conversations.customerId))
    .leftJoin(reservations, eq(reservations.id, conversations.reservationId))
    .leftJoin(adminUsers, eq(adminUsers.id, conversations.assigneeId))
    .orderBy(desc(conversations.lastMessageAt));
  const ids = rows.map((r) => r.c.id);
  const msgs = ids.length ? await db.select().from(messages).where(inArray(messages.conversationId, ids)).orderBy(asc(messages.createdAt)) : [];
  return rows.map((r) => ({ ...r, messages: msgs.filter((m) => m.conversationId === r.c.id) }));
}

export async function listTasks() {
  const db = await getDb();
  return db
    .select({ t: tasks, p: properties, r: reservations, a: adminUsers })
    .from(tasks)
    .innerJoin(properties, eq(properties.id, tasks.propertyId))
    .leftJoin(reservations, eq(reservations.id, tasks.reservationId))
    .leftJoin(adminUsers, eq(adminUsers.id, tasks.assigneeId))
    .orderBy(asc(tasks.dueAt));
}

export async function listAudit(limit = 200) {
  const db = await getDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.occurredAt)).limit(limit);
}

export async function listAdmins() {
  const db = await getDb();
  return db.select().from(adminUsers).orderBy(asc(adminUsers.createdAt));
}

export async function calendar(fromDate: string, days: number) {
  const db = await getDb();
  const toDate = localDate("Asia/Tokyo", days, new Date(fromDate + "T12:00:00+09:00"));
  const props = await db.select().from(properties).where(eq(properties.business, "stay")).orderBy(asc(properties.createdAt));
  const rows = await db
    .select({ r: reservations, c: customers })
    .from(reservations)
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(and(eq(reservations.kind, "stay"), ne(reservations.status, "cancelled"), lte(reservations.checkIn, toDate), gte(reservations.checkOut, fromDate)));
  return { props, rows };
}
