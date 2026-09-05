/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 1 ships as a static site: no server, free hosting, and the wall is
  // rebuilt by CI whenever the pipeline runs. Removing this one line turns on
  // API routes in phase 3 without changing frameworks. See docs/adr/0006.
  output: "export",
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
};
export default nextConfig;
