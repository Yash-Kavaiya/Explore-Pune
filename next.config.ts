import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray pnpm-lock.yaml in the home dir makes Next mis-infer the workspace
  // root; pin it to this project so file tracing and HMR resolve correctly.
  turbopack: {
    root: path.resolve(),
  },
  images: {
    // Locally, uploaded community photos live in /public/uploads (same-origin,
    // no config needed). On Vercel they are served from a Blob store, hence the
    // wildcard below. The rest allow swapping in real remote photos later.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
