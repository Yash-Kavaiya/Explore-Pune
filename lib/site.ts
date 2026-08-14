/**
 * Central site configuration for ExplorePune.
 * Keep all brand-level constants here so they are set once and reused
 * across metadata, the header/footer, and structured data.
 */

/**
 * Public base URL for metadata, Open Graph and the sitemap.
 *
 * An explicit NEXT_PUBLIC_SITE_URL always wins. Failing that we use the URLs
 * Vercel injects, so a fresh deploy never advertises localhost: the production
 * domain is stable across deploys, while the per-deployment URL is what gives
 * preview builds self-consistent links.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercelHost =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

export const SITE = {
  name: "ExplorePune",
  tagline: "Discover the soul of Pune",
  description:
    "Discover Pune's famous forts, temples, gardens and hidden gems. Browse a curated, map-based directory, read rich place guides, leave reviews, and suggest new spots for the community.",
  /** Public base URL — override with NEXT_PUBLIC_SITE_URL in production. */
  url: resolveSiteUrl(),
  locale: "en_IN",
  /** Pune city center — used as the default map focus. */
  center: { lat: 18.5204, lng: 73.8567 },
  /** UPI handle for tips / AI-credit sponsorship. */
  upiId: "explorepune@ybl",
  upiName: "ExplorePune",
  /** Microsoft Clarity project id. */
  clarityId: "y24qaod8hh",
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
