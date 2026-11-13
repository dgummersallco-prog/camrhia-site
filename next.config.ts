import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // Apple's Universal Links verification file — must be served with
        // application/json content type, and this exact no-extension path
        // is a fixed convention iOS looks for, not something we can change.
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
      {
        // Photographer sites run on their own host, so code Camri writes can never reach the dashboard,
        // and this policy stops it talking to anything outside Camrhia and Supabase.
        source: "/:path*",
        has: [{ type: "host", value: "sites.camrhia.com" }],
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://camrhia.com https://www.camrhia.com" },
        ],
      },
    ];
  },
};

export default nextConfig;
