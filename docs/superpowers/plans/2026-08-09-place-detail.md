# Place Directory + Detail Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship `/places` and `/places/[slug]` so Shaniwar Wada (and all places) have a full end-to-end guide with reviews and view tracking.

**Architecture:** Next.js App Router server pages load catalog + reviews; client islands handle review form and view ping. Reuse `PlacesDirectory`, `PlaceCard`, `PlaceLocationMap`, and existing APIs.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, existing Zod/API routes, sonner toasts.

## Global Constraints

- `params` and `searchParams` are Promises (await them).
- Match ExplorePune heritage visual language (Playfair headings, warm accents).
- Do not invent new APIs; use `/api/reviews` and `/api/stats`.
- No commits unless the user asks.

---

### Task 1: `/places` directory page

**Files:**
- Create: `app/places/page.tsx`

- [ ] Parse `searchParams` into `DirectoryInitial`
- [ ] Load `getAllPlaces()` + `getAreas()`
- [ ] Render heading + `PlacesDirectory`
- [ ] Verify: `http://localhost:3000/places` returns 200

### Task 2: Place detail page shell

**Files:**
- Create: `app/places/[slug]/page.tsx`
- Create: `components/places/place-detail.tsx`

- [ ] `generateStaticParams` from seed places
- [ ] `generateMetadata` from place
- [ ] Load place, nearby, reviews, summary; `notFound()` if missing
- [ ] Render all sections with place fields
- [ ] Verify: `/places/shaniwar-wada` returns 200; unknown slug 404

### Task 3: Reviews + view tracking clients

**Files:**
- Create: `components/places/review-section.tsx`
- Create: `components/places/record-place-view.tsx`

- [ ] Review list + form → POST `/api/reviews` → toast + refresh
- [ ] Mount view recorder that POSTs `/api/stats` once per visit
- [ ] Verify: submit review appears after refresh; stats increments

### Task 4: Smoke check

- [ ] `npm run typecheck` and `npm run test`
- [ ] Hit `/places`, `/places/shaniwar-wada`, `/api/reviews?placeSlug=shaniwar-wada`
