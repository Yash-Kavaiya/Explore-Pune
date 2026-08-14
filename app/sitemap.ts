import type { MetadataRoute } from "next";
import { getAllPlaces } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const places = await getAllPlaces();
  const now = new Date();

  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/places`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/request`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...places.map((place) => ({
      url: `${SITE.url}/places/${place.slug}`,
      lastModified: place.lastVerified ? new Date(place.lastVerified) : now,
      changeFrequency: "monthly" as const,
      priority: place.featured ? 0.8 : 0.7,
    })),
  ];
}
