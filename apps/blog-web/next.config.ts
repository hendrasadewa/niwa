import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@niwa/ui",
    "@niwa/auth",
    "@niwa/api-client",
    "@niwa/blog-validators",
  ],
};

initOpenNextCloudflareForDev();

export default nextConfig;
