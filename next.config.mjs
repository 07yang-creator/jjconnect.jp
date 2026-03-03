/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // TODO: fix Supabase client types
  },
};

export default nextConfig;
