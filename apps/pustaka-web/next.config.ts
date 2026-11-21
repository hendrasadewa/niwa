import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@niwa/ui",
    "@niwa/auth",
    "@niwa/api-client",
    "@niwa/pustaka-validators",
  ],
};

initOpenNextCloudflareForDev();

export default nextConfig;
