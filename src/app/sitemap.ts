import type { MetadataRoute } from "next";
import { allAccommodationSlugs, allPropertySlugs } from "@/lib/data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/stays",
    "/properties",
    "/inbound",
    "/checkin",
    "/company",
    "/contact",
    "/privacy",
    "/terms",
    "/cancellation",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  const stayRoutes = allAccommodationSlugs().map((slug) => ({
    url: `${BASE}/stays/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const propertyRoutes = allPropertySlugs().map((slug) => ({
    url: `${BASE}/properties/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...stayRoutes, ...propertyRoutes];
}
