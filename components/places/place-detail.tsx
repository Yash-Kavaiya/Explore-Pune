import Link from "next/link";
import {
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Ticket,
  CalendarDays,
  Users,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { CategoryBadge } from "@/components/places/category-badge";
import { PlaceCard } from "@/components/places/place-card";
import { PlaceCover } from "@/components/places/place-cover";
import { RatingStars } from "@/components/places/rating-stars";
import { RecordPlaceView } from "@/components/places/record-place-view";
import { ReviewSection } from "@/components/places/review-section";
import { GardenExperience } from "@/components/places/okayama/garden-experience";
import {
  GardenEtiquette,
  GardenFaqs,
  GardenStory,
} from "@/components/places/okayama/garden-story";
import { FortExperience } from "@/components/places/shaniwar/fort-experience";
import {
  FortEtiquette,
  FortFaqs,
  FortStory,
} from "@/components/places/shaniwar/fort-story";
import { TempleExperience } from "@/components/places/temple/temple-experience";
import {
  TempleEtiquette,
  TempleFaqs,
  TempleStory,
} from "@/components/places/temple/temple-story";
import { MuseumExperience } from "@/components/places/kelkar/museum-experience";
import {
  MuseumEtiquette,
  MuseumFaqs,
  MuseumStory,
} from "@/components/places/kelkar/museum-story";
import { PalaceExperience } from "@/components/places/agakhan/palace-experience";
import {
  PalaceEtiquette,
  PalaceFaqs,
  PalaceStory,
} from "@/components/places/agakhan/palace-story";
import { SinhagadExperience } from "@/components/places/sinhagad/sinhagad-experience";
import {
  SinhagadEtiquette,
  SinhagadFaqs,
  SinhagadStory,
} from "@/components/places/sinhagad/sinhagad-story";
import { MahalExperience } from "@/components/places/lalmahal/mahal-experience";
import {
  MahalEtiquette,
  MahalFaqs,
  MahalStory,
} from "@/components/places/lalmahal/mahal-story";
import { ParvatiExperience } from "@/components/places/parvati/parvati-experience";
import {
  ParvatiEtiquette,
  ParvatiFaqs,
  ParvatiStory,
} from "@/components/places/parvati/parvati-story";
import { OshoExperience } from "@/components/places/osho/osho-experience";
import {
  OshoEtiquette,
  OshoFaqs,
  OshoStory,
} from "@/components/places/osho/osho-story";
import { HillExperience } from "@/components/places/vetal/hill-experience";
import {
  HillEtiquette,
  HillFaqs,
  HillStory,
} from "@/components/places/vetal/hill-story";
import { CaveExperience } from "@/components/places/pataleshwar/cave-experience";
import {
  CaveEtiquette,
  CaveFaqs,
  CaveStory,
} from "@/components/places/pataleshwar/cave-story";
import { MemorialExperience } from "@/components/places/memorial/memorial-experience";
import {
  MemorialEtiquette,
  MemorialFaqs,
  MemorialStory,
} from "@/components/places/memorial/memorial-story";
import { DamExperience } from "@/components/places/dam/dam-experience";
import {
  DamEtiquette,
  DamFaqs,
  DamStory,
} from "@/components/places/dam/dam-story";
import { BaugExperience } from "@/components/places/saras/baug-experience";
import {
  BaugEtiquette,
  BaugFaqs,
  BaugStory,
} from "@/components/places/saras/baug-story";
import { EmpressExperience } from "@/components/places/empress/empress-experience";
import {
  EmpressEtiquette,
  EmpressFaqs,
  EmpressStory,
} from "@/components/places/empress/empress-story";
import { GARDEN_FAQS } from "@/lib/data/okayama-garden";
import { FORT_FAQS } from "@/lib/data/shaniwar-wada";
import { TEMPLE_FAQS } from "@/lib/data/dagdusheth-temple";
import { MUSEUM_FAQS } from "@/lib/data/kelkar-museum";
import { PALACE_FAQS } from "@/lib/data/aga-khan-palace";
import { SINHAGAD_FAQS } from "@/lib/data/sinhagad-fort";
import { LAL_MAHAL_FAQS } from "@/lib/data/lal-mahal";
import { PARVATI_FAQS } from "@/lib/data/parvati-hill-temple";
import { OSHO_FAQS } from "@/lib/data/osho-resort";
import { HILL_FAQS } from "@/lib/data/vetal-tekdi";
import { CAVE_FAQS } from "@/lib/data/pataleshwar-cave";
import { MEMORIAL_FAQS } from "@/lib/data/national-war-memorial";
import { DAM_FAQS } from "@/lib/data/khadakwasla-dam";
import { BAUG_FAQS } from "@/lib/data/saras-baug";
import { EMPRESS_FAQS } from "@/lib/data/empress-garden";
import { PlaceLocationMap } from "@/components/map/place-location-map";
import { SITE } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AUDIENCE_LABELS, SEASON_LABELS, getCategory } from "@/lib/data/categories";
import { formatDate, cn } from "@/lib/utils";
import type { Place, Review } from "@/lib/types";
import type { RatingSummary } from "@/lib/store/reviews.repo";

/**
 * Selected places get a bespoke, interactive 3D hero and editorial sections
 * instead of the standard cover image.
 */
const GARDEN_SLUG = "okayama-friendship-garden";
const FORT_SLUG = "shaniwar-wada";
const TEMPLE_SLUG = "dagdusheth-halwai-ganapati";
const MUSEUM_SLUG = "raja-dinkar-kelkar-museum";
const PALACE_SLUG = "aga-khan-palace";
const SINHAGAD_SLUG = "sinhagad-fort";
const LAL_MAHAL_SLUG = "lal-mahal";
const PARVATI_SLUG = "parvati-hill-temple";
const OSHO_SLUG = "osho-meditation-resort";
const VETAL_SLUG = "vetal-tekdi";
const CAVE_SLUG = "pataleshwar-cave-temple";
const MEMORIAL_SLUG = "national-war-memorial";
const DAM_SLUG = "khadakwasla-dam";
const SARAS_SLUG = "saras-baug";
const EMPRESS_SLUG = "empress-garden";

export function PlaceDetail({
  place,
  nearby,
  reviews,
  summary,
}: {
  place: Place;
  nearby: Place[];
  reviews: Review[];
  summary: RatingSummary;
}) {
  const cat = getCategory(place.category);
  const displayRating = summary.count > 0 ? summary.average : place.rating;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`;
  const isGarden = place.slug === GARDEN_SLUG;
  const isFort = place.slug === FORT_SLUG;
  const isTemple = place.slug === TEMPLE_SLUG;
  const isMuseum = place.slug === MUSEUM_SLUG;
  const isPalace = place.slug === PALACE_SLUG;
  const isSinhagad = place.slug === SINHAGAD_SLUG;
  const isLalMahal = place.slug === LAL_MAHAL_SLUG;
  const isParvati = place.slug === PARVATI_SLUG;
  const isOsho = place.slug === OSHO_SLUG;
  const isVetal = place.slug === VETAL_SLUG;
  const isCave = place.slug === CAVE_SLUG;
  const isMemorial = place.slug === MEMORIAL_SLUG;
  const isDam = place.slug === DAM_SLUG;
  const isSaras = place.slug === SARAS_SLUG;
  const isEmpress = place.slug === EMPRESS_SLUG;
  const has3d =
    isGarden ||
    isFort ||
    isTemple ||
    isMuseum ||
    isPalace ||
    isSinhagad ||
    isLalMahal ||
    isParvati ||
    isOsho ||
    isVetal ||
    isCave ||
    isMemorial ||
    isDam ||
    isSaras ||
    isEmpress;

  return (
    <article>
      <RecordPlaceView slug={place.slug} />
      <PlaceJsonLd place={place} summary={summary} faqs={faqsFor(place.slug)} />

      {isGarden && (
        <GardenExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isFort && (
        <FortExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isTemple && (
        <TempleExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isMuseum && (
        <MuseumExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isPalace && (
        <PalaceExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isSinhagad && (
        <SinhagadExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isLalMahal && (
        <MahalExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isParvati && (
        <ParvatiExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isOsho && (
        <OshoExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isVetal && (
        <HillExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isCave && (
        <CaveExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isMemorial && (
        <MemorialExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isDam && (
        <DamExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isSaras && (
        <BaugExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {isEmpress && (
        <EmpressExperience
          name={place.name}
          area={place.area}
          rating={displayRating}
          reviewCount={summary.count > 0 ? summary.count : undefined}
          tagline={place.shortDescription}
        />
      )}

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-4 pt-6 text-sm text-muted-foreground sm:px-6"
      >
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5 opacity-60" />
        <Link href="/places" className="hover:text-foreground">
          Places
        </Link>
        <ChevronRight className="size-3.5 opacity-60" />
        <span className="truncate text-foreground">{place.name}</span>
      </nav>

      {/* Hero — the 3D places show their model above instead of a cover image. */}
      {!has3d && (
      <header className="relative mt-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative aspect-[21/9] min-h-[220px] overflow-hidden rounded-3xl sm:min-h-[280px]">
            <PlaceCover
              src={place.heroImage || undefined}
              accent={cat.accent}
              iconKey={cat.icon}
              alt={place.name}
              priority
              sizes="100vw"
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={place.category} className="bg-white/90 text-foreground" />
                {place.featured && (
                  <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                )}
                {place.source === "community" && (
                  <Badge variant="secondary">Community pick</Badge>
                )}
              </div>
              <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {place.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {place.area}, Pune
                </span>
                {displayRating > 0 && (
                  <RatingStars
                    rating={displayRating}
                    count={summary.count > 0 ? summary.count : undefined}
                    className="[&_span]:text-white/90"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      )}

      {isGarden && <GardenStory />}
      {isFort && <FortStory />}
      {isTemple && <TempleStory />}
      {isMuseum && <MuseumStory />}
      {isPalace && <PalaceStory />}
      {isSinhagad && <SinhagadStory />}
      {isLalMahal && <MahalStory />}
      {isParvati && <ParvatiStory />}
      {isOsho && <OshoStory />}
      {isVetal && <HillStory />}
      {isCave && <CaveStory />}
      {isMemorial && <MemorialStory />}
      {isDam && <DamStory />}
      {isSaras && <BaugStory />}
      {isEmpress && <EmpressStory />}

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 lg:py-12">
        {/* Main column */}
        <div className="min-w-0 space-y-12">
          {/* The 3D pages' hero and story sections already carry both of these. */}
          {!has3d && (
            <>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {place.shortDescription}
              </p>

              <section aria-labelledby="about-heading" className="space-y-3">
                <h2 id="about-heading" className="font-heading text-2xl font-semibold">
                  About
                </h2>
                <p className="text-base leading-relaxed text-foreground/90">{place.description}</p>
              </section>
            </>
          )}

          <section aria-labelledby="reach-heading" className="space-y-3">
            <h2 id="reach-heading" className="font-heading text-2xl font-semibold">
              How to reach
            </h2>
            <p className="flex gap-3 text-base leading-relaxed text-foreground/90">
              <Navigation className="mt-1 size-5 shrink-0 text-primary" />
              <span>{place.howToReach}</span>
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 gap-1.5")}
            >
              Open in Google Maps
              <ExternalLink className="size-3.5" />
            </a>
          </section>

          {place.tips.length > 0 && (
            <section aria-labelledby="tips-heading" className="space-y-4">
              <h2 id="tips-heading" className="font-heading text-2xl font-semibold">
                Tips for visitors
              </h2>
              <ul className="space-y-3">
                {place.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-3 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm leading-relaxed"
                  >
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isGarden && <GardenEtiquette />}
          {isFort && <FortEtiquette />}
          {isTemple && <TempleEtiquette />}
          {isMuseum && <MuseumEtiquette />}
          {isPalace && <PalaceEtiquette />}
          {isSinhagad && <SinhagadEtiquette />}
          {isLalMahal && <MahalEtiquette />}
          {isParvati && <ParvatiEtiquette />}
          {isOsho && <OshoEtiquette />}
          {isVetal && <HillEtiquette />}
          {isCave && <CaveEtiquette />}
          {isMemorial && <MemorialEtiquette />}
          {isDam && <DamEtiquette />}
          {isSaras && <BaugEtiquette />}
          {isEmpress && <EmpressEtiquette />}

          <section aria-labelledby="map-heading" className="space-y-4">
            <h2 id="map-heading" className="font-heading text-2xl font-semibold">
              Location
            </h2>
            <PlaceLocationMap
              coordinates={place.coordinates}
              title={place.name}
              accent={cat.accent}
              className="h-72 w-full overflow-hidden rounded-2xl border border-border/70 sm:h-80"
            />
            <p className="text-xs text-muted-foreground">
              Approx. {place.coordinates.lat.toFixed(4)}, {place.coordinates.lng.toFixed(4)}
            </p>
          </section>

          {nearby.length > 0 && (
            <section aria-labelledby="nearby-heading" className="space-y-5">
              <h2 id="nearby-heading" className="font-heading text-2xl font-semibold">
                Nearby places
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {nearby.map((p) => (
                  <PlaceCard key={p.slug} place={p} />
                ))}
              </div>
            </section>
          )}

          {isGarden && <GardenFaqs />}
          {isFort && <FortFaqs />}
          {isTemple && <TempleFaqs />}
          {isMuseum && <MuseumFaqs />}
          {isPalace && <PalaceFaqs />}
          {isSinhagad && <SinhagadFaqs />}
          {isLalMahal && <MahalFaqs />}
          {isParvati && <ParvatiFaqs />}
          {isOsho && <OshoFaqs />}
          {isVetal && <HillFaqs />}
          {isCave && <CaveFaqs />}
          {isMemorial && <MemorialFaqs />}
          {isDam && <DamFaqs />}
          {isSaras && <BaugFaqs />}
          {isEmpress && <EmpressFaqs />}

          <ReviewSection
            placeSlug={place.slug}
            placeName={place.name}
            initialReviews={reviews}
            summary={summary}
          />
        </div>

        {/* Sticky essentials */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">Visitor essentials</h2>

            <Essential
              icon={Clock}
              label="Timings"
              value={place.timings}
            />
            <Essential
              icon={Ticket}
              label="Entry fee"
              value={place.isFree ? `Free · ${place.entryFee}` : place.entryFee}
            />
            <Essential
              icon={Clock}
              label="Suggested duration"
              value={place.durationEstimate}
            />
            <Essential
              icon={CalendarDays}
              label="Best season"
              value={place.bestSeasons.map((s) => SEASON_LABELS[s] ?? s).join(" · ")}
            />
            {place.bestFor.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Users className="size-3.5" />
                  Best for
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {place.bestFor.map((a) => (
                    <Badge key={a} variant="secondary">
                      {AUDIENCE_LABELS[a] ?? a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
              Details last verified {formatDate(place.lastVerified)}. Timings and fees change —
              confirm on site when you visit.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

/** schema.org structured data so the page can earn a rich result. */
/** FAQ entries to publish as structured data, for the pages that have them. */
function faqsFor(slug: string): { q: string; a: string }[] | undefined {
  if (slug === GARDEN_SLUG) return GARDEN_FAQS;
  if (slug === FORT_SLUG) return FORT_FAQS;
  if (slug === TEMPLE_SLUG) return TEMPLE_FAQS;
  if (slug === MUSEUM_SLUG) return MUSEUM_FAQS;
  if (slug === PALACE_SLUG) return PALACE_FAQS;
  if (slug === SINHAGAD_SLUG) return SINHAGAD_FAQS;
  if (slug === LAL_MAHAL_SLUG) return LAL_MAHAL_FAQS;
  if (slug === PARVATI_SLUG) return PARVATI_FAQS;
  if (slug === OSHO_SLUG) return OSHO_FAQS;
  if (slug === VETAL_SLUG) return HILL_FAQS;
  if (slug === CAVE_SLUG) return CAVE_FAQS;
  if (slug === MEMORIAL_SLUG) return MEMORIAL_FAQS;
  if (slug === DAM_SLUG) return DAM_FAQS;
  if (slug === SARAS_SLUG) return BAUG_FAQS;
  if (slug === EMPRESS_SLUG) return EMPRESS_FAQS;
  return undefined;
}

function PlaceJsonLd({
  place,
  summary,
  faqs,
}: {
  place: Place;
  summary: RatingSummary;
  faqs?: { q: string; a: string }[];
}) {
  const url = `${SITE.url}/places/${place.slug}`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "TouristAttraction",
      "@id": url,
      name: place.name,
      description: place.description,
      url,
      isAccessibleForFree: place.isFree,
      touristType: place.bestFor.map((a) => AUDIENCE_LABELS[a] ?? a),
      address: {
        "@type": "PostalAddress",
        addressLocality: "Pune",
        addressRegion: "Maharashtra",
        addressCountry: "IN",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: place.coordinates.lat,
        longitude: place.coordinates.lng,
      },
    },
  ];

  // Only claim an aggregate rating when real visitor reviews back it up.
  if (summary.count > 0) {
    graph[0].aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: summary.average,
      bestRating: 5,
      ratingCount: summary.count,
    };
  }

  if (faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(
          /</g,
          "\\u003c",
        ),
      }}
    />
  );
}

function Essential({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm leading-snug text-foreground">{value}</p>
      </div>
    </div>
  );
}
