import { z } from "zod";

/**
 * Zod schemas — used for both client-side validation and (where relevant)
 * server-side request validation. Error *messages* here are stable keys the UI
 * maps to the active language; forms translate them via the i18n dictionary.
 */
export const emailSchema = z.string().trim().email("errors.email");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+()\-\s0-9]{7,20}$/, "errors.phone");

export const guestFormSchema = z.object({
  fullName: z.string().trim().min(1, "errors.required"),
  email: emailSchema,
  phone: phoneSchema,
  country: z.string().trim().min(1, "errors.required"),
  arrivalTime: z.string().optional(),
  messagingId: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  agree: z.literal(true, { errorMap: () => ({ message: "booking.agreeRequired" }) }),
});
export type GuestForm = z.infer<typeof guestFormSchema>;

export const viewingFormSchema = z.object({
  propertyId: z.string().min(1, "errors.required"),
  date: z.string().min(1, "errors.required"),
  time: z.string().min(1, "errors.required"),
  name: z.string().trim().min(1, "errors.required"),
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().max(2000).optional(),
});
export type ViewingForm = z.infer<typeof viewingFormSchema>;

export const contactFormSchema = z.object({
  category: z.string().min(1, "errors.required"),
  name: z.string().trim().min(1, "errors.required"),
  email: emailSchema,
  phone: z.string().optional(),
  message: z.string().trim().min(5, "errors.required"),
});
export type ContactForm = z.infer<typeof contactFormSchema>;

// Server-side checkout request validation.
export const checkoutSchema = z.object({
  accommodationId: z.string().min(1),
  planId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(30),
  children: z.number().int().min(0).max(30),
  guest: z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(5).max(30),
    country: z.string().trim().min(1).max(80),
  }),
  // demo-only hint; ignored for the authoritative price which is recomputed server-side
  simulate: z.enum(["success", "failure"]).optional(),
});
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
