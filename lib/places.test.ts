import { describe, it, expect } from "vitest";
import {
  filterPlaces,
  sortPlaces,
  queryPlaces,
  placeFromRequest,
  getSeedPlaces,
} from "@/lib/places";
import { slugify } from "@/lib/utils";
import type { Place, PlaceRequest } from "@/lib/types";

const places = getSeedPlaces();

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Shaniwar Wada!")).toBe("shaniwar-wada");
    expect(slugify("  Café  Goodluck  ")).toBe("cafe-goodluck");
    expect(slugify("A/B & C")).toBe("a-b-c");
  });
});

describe("filterPlaces", () => {
  it("filters by category", () => {
    const result = filterPlaces(places, { category: "temples-spiritual" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.category === "temples-spiritual")).toBe(true);
  });

  it("filters free vs paid", () => {
    expect(filterPlaces(places, { fee: "free" }).every((p) => p.isFree)).toBe(true);
    expect(filterPlaces(places, { fee: "paid" }).every((p) => !p.isFree)).toBe(true);
  });

  it("filters by audience", () => {
    const result = filterPlaces(places, { audience: "adventure" });
    expect(result.every((p) => p.bestFor.includes("adventure"))).toBe(true);
  });

  it("matches a text query across name and area", () => {
    expect(filterPlaces(places, { q: "sinhagad" }).map((p) => p.slug)).toContain("sinhagad-fort");
    expect(filterPlaces(places, { q: "koregaon" }).map((p) => p.slug)).toContain(
      "osho-meditation-resort",
    );
  });

  it("combines filters (AND semantics)", () => {
    const result = filterPlaces(places, { category: "lakes-hills", fee: "free" });
    expect(result.every((p) => p.category === "lakes-hills" && p.isFree)).toBe(true);
  });

  it("returns everything when filters are 'all'", () => {
    expect(filterPlaces(places, { category: "all", fee: "all" }).length).toBe(places.length);
  });
});

describe("sortPlaces", () => {
  it("puts featured first by default", () => {
    const sorted = sortPlaces(places, "featured");
    const firstNonFeatured = sorted.findIndex((p) => !p.featured);
    const lastFeatured = sorted.map((p) => p.featured).lastIndexOf(true);
    expect(lastFeatured).toBeLessThan(firstNonFeatured);
  });

  it("sorts by rating descending", () => {
    const sorted = sortPlaces(places, "rating");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rating).toBeGreaterThanOrEqual(sorted[i].rating);
    }
  });

  it("sorts by name", () => {
    const names = sortPlaces(places, "name").map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("does not mutate the input array", () => {
    const original = [...places];
    sortPlaces(places, "rating");
    expect(places).toEqual(original);
  });
});

describe("queryPlaces", () => {
  it("filters then sorts", () => {
    const result = queryPlaces(places, { category: "forts-palaces", sort: "rating" });
    expect(result.every((p) => p.category === "forts-palaces")).toBe(true);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].rating).toBeGreaterThanOrEqual(result[i].rating);
    }
  });
});

describe("placeFromRequest", () => {
  const req: PlaceRequest = {
    id: "abcdef12-3456-7890-abcd-ef1234567890",
    name: "Viman Nagar Sunset Point",
    area: "Viman Nagar",
    category: "nature-gardens",
    whySpecial: "A quiet ridge with lovely views over the airport runway and the eastern hills.",
    photoUrls: ["/uploads/x.jpg"],
    submittedBy: "Asha",
    status: "approved",
    createdAt: "2026-06-01T00:00:00.000Z",
    decidedAt: "2026-06-02T00:00:00.000Z",
  };

  it("builds a community place with a unique slug and sensible defaults", () => {
    const place: Place = placeFromRequest(req);
    expect(place.source).toBe("community");
    expect(place.slug).toBe("viman-nagar-sunset-point-abcdef");
    expect(place.name).toBe(req.name);
    expect(place.heroImage).toBe("/uploads/x.jpg");
    expect(place.images).toEqual(["/uploads/x.jpg"]);
    expect(place.category).toBe("nature-gardens");
  });

  it("falls back to Pune center when no coordinates supplied", () => {
    const place = placeFromRequest(req);
    expect(place.coordinates).toEqual({ lat: 18.5204, lng: 73.8567 });
  });
});
