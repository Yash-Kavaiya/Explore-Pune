import { Hero } from "@/components/home/hero";
import { CategoryTiles } from "@/components/home/category-tiles";
import { FeaturedPlaces } from "@/components/home/featured-places";
import { Collections } from "@/components/home/collections";
import { CtaRequest } from "@/components/home/cta-request";
import { getSeedPlaces, getFeaturedPlaces, getCategoryCounts, sortPlaces } from "@/lib/places";

export default function HomePage() {
  const places = getSeedPlaces();
  const featured = sortPlaces(getFeaturedPlaces(places), "rating").slice(0, 6);
  const counts = getCategoryCounts(places);

  return (
    <>
      <Hero placeCount={places.length} />
      <CategoryTiles counts={counts} />
      <FeaturedPlaces places={featured} />
      <Collections />
      <CtaRequest />
    </>
  );
}
