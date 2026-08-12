import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/places/place-detail";
import { getAllPlaces, getPlaceBySlug } from "@/lib/catalog";
import { getNearbyPlaces, getSeedPlaces } from "@/lib/places";
import { getRatingSummary, listReviews } from "@/lib/store/reviews.repo";
import { SITE } from "@/lib/site";

export async function generateStaticParams() {
  return getSeedPlaces().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return { title: "Place not found" };
  return {
    title: place.name,
    description: place.shortDescription,
    openGraph: {
      title: `${place.name} · ${SITE.name}`,
      description: place.shortDescription,
      url: `${SITE.url}/places/${place.slug}`,
    },
  };
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const allPlaces = await getAllPlaces();
  const nearby = getNearbyPlaces(place, allPlaces);
  const [reviews, summary] = await Promise.all([
    listReviews(place.slug),
    getRatingSummary(place.slug),
  ]);

  return (
    <PlaceDetail
      place={place}
      nearby={nearby}
      reviews={reviews}
      summary={summary}
    />
  );
}
