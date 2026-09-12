/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Local placeholder images are used by default. Add remote hosts here
    // if you later serve property/accommodation photos from a CDN or CMS.
    remotePatterns: [],
  },
};

export default nextConfig;
