"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { ACCENT_HEX } from "@/lib/colors";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import type { Coordinates } from "@/lib/types";

export function PlaceLocationMap({
  coordinates,
  title,
  accent,
  className,
}: {
  coordinates: Coordinates;
  title: string;
  accent: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

  if (!apiKey) return <MapPlaceholder className={className} compact />;

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={mapId}
          defaultCenter={coordinates}
          defaultZoom={14}
          gestureHandling="cooperative"
          disableDefaultUI
          className="h-full w-full overflow-hidden rounded-2xl"
        >
          <AdvancedMarker position={coordinates} title={title}>
            <Pin background={ACCENT_HEX[accent]} borderColor="#ffffff" glyphColor="#ffffff" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
