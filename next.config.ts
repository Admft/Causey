import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No remote images, no experimental flags. The app must boot with an empty
  // .env, so nothing here may depend on secrets.
};

export default nextConfig;
