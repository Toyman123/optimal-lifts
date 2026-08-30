import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server blocks cross-origin requests by default, which leaves the
  // page blank when it is opened from a phone on the same network. These are
  // the private ranges a home router or phone hotspot hands out — broad on
  // purpose, so changing networks doesn't silently break phone access.
  // (Dev only; `next start` ignores this.)
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.20.10.*", // iPhone personal hotspot
  ],
};

export default nextConfig;
