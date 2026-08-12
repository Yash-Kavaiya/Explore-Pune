/**
 * Central site configuration for ExplorePune.
 * Keep all brand-level constants here so they are set once and reused
 * across metadata, the header/footer, and structured data.
 */

export const SITE = {
  name: "ExplorePune",
  tagline: "Discover the soul of Pune",
  description:
    "Discover Pune's famous forts, temples, gardens and hidden gems. Browse a curated, map-based directory, read rich place guides, leave reviews, and suggest new spots for the community.",
  /** Public base URL — override with NEXT_PUBLIC_SITE_URL in production. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
  /** Pune city center — used as the default map focus. */
  center: { lat: 18.5204, lng: 73.8567 },
} as const;

export const MAIN_NAV = [
  { href: "/", label: "Home" },
  { href: "/places", label: "Places" },
  { href: "/request", label: "Suggest a place" },
] as const;

export const FOOTER_NAV = [
  {
    heading: "Explore",
    links: [
      { href: "/places", label: "All places" },
      { href: "/places?category=forts-palaces", label: "Forts & Palaces" },
      { href: "/places?category=temples-spiritual", label: "Temples & Spiritual" },
      { href: "/places?category=nature-gardens", label: "Nature & Gardens" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/request", label: "Suggest a place" },
      { href: "/admin", label: "Admin dashboard" },
    ],
  },
] as const;
