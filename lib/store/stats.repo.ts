import { isPersistent, mutate, readDb } from "@/lib/store/db";

export type AdminStats = {
  requests: { total: number; pending: number; approved: number; rejected: number };
  reviews: number;
  totalViews: number;
  topViewed: { slug: string; views: number }[];
};

export async function incrementView(slug: string): Promise<number> {
  // Place pages fire this on every first visit. Without Redis that used to
  // 500 in production logs; skip the write and keep the page healthy.
  if (!isPersistent()) {
    const db = await readDb();
    return db.views[slug] ?? 0;
  }
  return mutate((db) => {
    db.views[slug] = (db.views[slug] ?? 0) + 1;
    return db.views[slug];
  });
}

export async function getViews(): Promise<Record<string, number>> {
  const db = await readDb();
  return db.views;
}

export async function getStats(): Promise<AdminStats> {
  const db = await readDb();
  const requests = db.requests;
  const topViewed = Object.entries(db.views)
    .map(([slug, views]) => ({ slug, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return {
    requests: {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    },
    reviews: db.reviews.length,
    totalViews: Object.values(db.views).reduce((a, b) => a + b, 0),
    topViewed,
  };
}
