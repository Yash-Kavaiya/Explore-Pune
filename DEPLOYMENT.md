# Deploying ExplorePune

The pipeline has two halves that run independently on every push:

```
push / PR ──┬─► GitHub Actions  → lint, typecheck, test, build   (quality gate)
            └─► Vercel          → Preview deploy on a PR
                                  Production deploy on main
```

GitHub Actions is the gate you read; Vercel is what ships. Neither blocks the
other, so a red CI run still produces a preview URL you can click through —
check both before merging.

## One-time setup

### 1. Connect the repo to Vercel

1. <https://vercel.com/new> → import `Yash-Kavaiya/my-pune-trip`.
2. Framework preset is detected as Next.js. Leave the build settings alone —
   `vercel.json` already pins the framework and puts functions in `bom1`
   (Mumbai), the closest region to the audience. Drop the `regions` key if you'd
   rather use the default.
3. Skip the environment variables for now and deploy. The first build will
   succeed; the map renders a placeholder and community writes are disabled
   until you finish the steps below.

From here, Vercel deploys `main` to production and every PR to its own preview
URL. There are no GitHub secrets to manage — the Vercel GitHub App handles it.

### 2. Provision storage

The app keeps reviews, place requests and view counts in a single JSON document,
and community photos as files. Locally both live on disk. On Vercel the
filesystem is read-only and per-instance, so both need a real store.

In the Vercel dashboard → **Storage**:

| Create        | Purpose                                | Injects                              |
| ------------- | -------------------------------------- | ------------------------------------ |
| A Redis store | Reviews, requests, view counts         | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| A Blob store  | Community photo uploads                | `BLOB_READ_WRITE_TOKEN`              |

Connect each to the project and Vercel sets the variables across all
environments. Redeploy to pick them up.

Until Redis is connected the site still renders — reads return empty — but any
write returns a clear "No database configured" error instead of a filesystem
crash. Until Blob is connected, uploads fall back to a write that will not
persist.

### 3. Set the remaining environment variables

Project Settings → **Environment Variables**:

| Variable                          | Environments | Notes                                                             |
| --------------------------------- | ------------ | ----------------------------------------------------------------- |
| `ADMIN_PASSPHRASE`                | all          | Gates `/admin`. Use a real value, not the `change-me` default.     |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | all          | Without it the map degrades to a placeholder.                      |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`  | all          | Optional — enables vector maps and Advanced Markers.               |
| `NEXT_PUBLIC_SITE_URL`            | production   | Only once you have a custom domain. See below.                     |

`NEXT_PUBLIC_SITE_URL` is deliberately optional: `lib/site.ts` falls back to the
domain Vercel injects, so Open Graph tags and the sitemap point at the real
deployment rather than `localhost` even if you never set it. Set it explicitly
when you attach a custom domain.

If you restrict the Google Maps key by HTTP referrer, add `*.vercel.app`
alongside your domain or maps will be blank in preview deploys.

## Local development

```bash
cp .env.example .env.local   # fill in what you need; storage vars can stay empty
npm install
npm run dev
```

With the storage variables empty the app uses `data/db.json` and
`public/uploads`, both gitignored. No cloud account needed.

## The CI workflow

`.github/workflows/ci.yml` runs lint → typecheck → test → build on pushes to
`main` and on every PR, cancelling superseded runs on the same branch. It caches
`~/.npm` and `.next/cache`, so repeat builds are warm.

The build step is not redundant with Vercel's: it catches build-time breakage on
PRs from forks and gives one place to read all four checks. Run the same set
locally with:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

To make CI enforcing rather than advisory, add a branch protection rule on
`main` requiring the **Lint, typecheck, test, build** check.

## Notes and limits

- **Concurrent writes.** The store is one JSON document read-modify-written per
  mutation, serialized only within a single process. Two simultaneous writes on
  different serverless instances can interleave and lose one. Fine at this
  app's write volume; revisit if reviews get busy.
- **Upload size.** A Vercel function request body caps at 4.5 MB, so
  `/api/uploads` enforces 4 MB per photo. Raising that means switching to a
  client upload (`upload()` from `@vercel/blob/client`), which streams straight
  to Blob and bypasses the function.
- **`next build` no longer runs ESLint** as of Next.js 16, which is why lint is
  its own CI step. A lint failure will not fail the Vercel build.
