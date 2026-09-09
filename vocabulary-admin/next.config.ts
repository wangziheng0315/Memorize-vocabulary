import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the browser to load dev assets when opening the LAN URL.
  allowedDevOrigins: ["172.29.228.21"],
};

export default nextConfig;
