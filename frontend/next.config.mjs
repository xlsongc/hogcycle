/** @type {import('next').NextConfig} */

// A GitHub project Pages site is served from /<repo>/, not from the root, so
// every asset path needs the prefix. Set only in CI: locally and in `next dev`
// the site is served at the root, and hard-coding the prefix would break both.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  // Phase 1 ships as a static site: no server, free hosting, and the wall is
  // rebuilt by CI whenever the pipeline runs. Removing this one line turns on
  // API routes in phase 3 without changing frameworks. See docs/adr/0006.
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  // GitHub Pages serves /path/ as /path/index.html; without this, every route
  // but the root 404s.
  trailingSlash: true,
};
export default nextConfig;
