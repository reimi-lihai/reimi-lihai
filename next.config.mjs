/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Local placeholder images are used by default. Add remote hosts here
    // if you later serve property/accommodation photos from a CDN or CMS.
    remotePatterns: [],
  },
  experimental: {
    // Server-only DB drivers (embedded PGlite ships WASM; postgres-js uses Node sockets).
    serverComponentsExternalPackages: ["@electric-sql/pglite", "postgres"],
    // Ship SQL migrations with the serverless functions (embedded DB migrates at runtime).
    outputFileTracingIncludes: {
      "/**": ["./src/server/db/migrations/**/*"],
    },
  },
};

export default nextConfig;
