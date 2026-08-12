"use client";

import * as React from "react";
import Link from "next/link";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { getCategory } from "@/lib/data/categories";
import { ACCENT_HEX } from "@/lib/colors";
import { RatingStars } from "@/components/places/rating-stars";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import { SITE } from "@/lib/site";
import type { Place } from "@/lib/types";

/** Pans/zooms the map to fit all the given places whenever they change. */
function FitBounds({ places }: { places: Place[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || places.length === 0) return;
    if (places.length === 1) {
      map.setCenter(places[0].coordinates);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of places) bounds.extend(p.coordinates);
    map.fitBounds(bounds, 64);
  }, [map, places]);
  return null;
}

export function PlacesMap({ places, className }: { places: Place[]; className?: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);

  if (!apiKey) return <MapPlaceholder className={className} />;

  const active = places.find((p) => p.slug === activeSlug) ?? null;

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={mapId}
          defaultCenter={SITE.center}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="h-full w-full overflow-hidden rounded-2xl"
        >
          <FitBounds places={places} />
          {places.map((place) => {
            const cat = getCategory(place.category);
            return (
              <AdvancedMarker
                key={place.slug}
                position={place.coordinates}
                title={place.name}
                onClick={() => setActiveSlug(place.slug)}
              >
                <Pin
                  background={ACCENT_HEX[cat.accent]}
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>
            );
          })}

          {active && (
            <InfoWindow
              position={active.coordinates}
              onCloseClick={() => setActiveSlug(null)}
              pixelOffset={[0, -36]}
            >
              <div className="max-w-[15rem] p-1">
                <p className="text-xs font-medium text-stone-500">{active.area}</p>
                <Link
                  href={`/places/${active.slug}`}
                  className="font-heading text-base font-semibold text-stone-900 hover:underline"
                >
                  {active.name}
                </Link>
                <div className="mt-1">
                  <RatingStars rating={active.rating} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-stone-600">
                  {active.shortDescription}
                </p>
                <Link
                  href={`/places/${active.slug}`}
                  className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  View details →
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
