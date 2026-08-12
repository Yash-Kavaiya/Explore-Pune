# Place directory + detail (full guide) — Design

**Status:** Approved 2026-08-09  
**Scope:** `/places` directory and `/places/[slug]` full guide (all Place fields, reviews, view tracking, map, nearby).

## Goal

Visitors can browse all places, open any place (e.g. `/places/shaniwar-wada`), read a complete guide, leave a review, and see the location on a map.

## Routes

| Route | Behavior |
|-------|----------|
| `/places` | Server page → `PlacesDirectory` with `getAllPlaces()`, URL-synced filters |
| `/places/[slug]` | Full place guide; `notFound()` if unknown slug |
| Seed slugs | Prefetch via `generateStaticParams` from seed catalog |

## Detail page sections (top → bottom)

1. Breadcrumb: Home → Places → {name}
2. Hero cover + title, category, area, rating (live reviews if any, else seed), featured/source badges
3. Essentials grid: timings, entry fee, duration, best seasons, best-for tags, last verified
4. About: full description
5. How to reach + external Maps link
6. Tips list
7. Location map (`PlaceLocationMap` / placeholder)
8. Nearby places (`PlaceCard` grid)
9. Reviews: list + submit form → existing `/api/reviews`
10. Client view ping → `POST /api/stats` with `{ slug }`

## Data

- Catalog: `getPlaceBySlug` / `getAllPlaces` from `lib/catalog.ts`
- Reviews: `listReviews` / `getRatingSummary` on server; form posts to API then `router.refresh()`
- No new persistence layer

## Out of scope

Admin UI, request form page, real photography assets, sitemap.
