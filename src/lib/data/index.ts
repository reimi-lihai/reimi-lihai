/**
 * Data access layer.
 *
 * UI and API code import ONLY from here, never from the raw data modules, so the
 * source can later be swapped for a CMS / database / REST API without touching
 * components. Functions are async on purpose to mirror a real data source.
 */
import { accommodations } from "./accommodations";
import { properties } from "./properties";
import type { Accommodation, Property } from "../types";

export async function getAccommodations(): Promise<Accommodation[]> {
  return accommodations;
}

export async function getAccommodationBySlug(
  slug: string
): Promise<Accommodation | undefined> {
  return accommodations.find((a) => a.slug === slug);
}

export async function getAccommodationById(
  id: string
): Promise<Accommodation | undefined> {
  return accommodations.find((a) => a.id === id);
}

export async function getFeaturedAccommodations(n = 3): Promise<Accommodation[]> {
  return [...accommodations].sort((a, b) => b.rating - a.rating).slice(0, n);
}

export async function getProperties(): Promise<Property[]> {
  return properties;
}

export async function getPropertyBySlug(slug: string): Promise<Property | undefined> {
  return properties.find((p) => p.slug === slug);
}

export async function getFeaturedProperties(n = 3): Promise<Property[]> {
  return properties.slice(0, n);
}

// Synchronous variants for static params generation.
export function allAccommodationSlugs(): string[] {
  return accommodations.map((a) => a.slug);
}
export function allPropertySlugs(): string[] {
  return properties.map((p) => p.slug);
}
