import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@niwa/ui", "@niwa/auth", "@niwa/pustaka-validators"],
};

initOpenNextCloudflareForDev();

export default nextConfig;
