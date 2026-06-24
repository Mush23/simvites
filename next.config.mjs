import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root — the parent folder contains other lockfiles.
  turbopack: { root: projectRoot },
  images: {
    remotePatterns: [
      // Supabase Storage (public bucket) — tighten to your project ref in prod.
      { protocol: 'https', hostname: '*.supabase.co' },
      // Unsplash placeholders used by the seed template content.
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
}

export default nextConfig
