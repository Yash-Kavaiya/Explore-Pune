"use client";

import * as React from "react";

/** Fire-and-forget view counter for a place detail visit. */
export function RecordPlaceView({ slug }: { slug: string }) {
  React.useEffect(() => {
    const key = `ep_viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // private mode / blocked storage — still count once per mount
    }
    void fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {
      /* ignore network errors */
    });
  }, [slug]);

  return null;
}
