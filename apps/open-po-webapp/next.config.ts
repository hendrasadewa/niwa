import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@niwa/ui", "@niwa/open-po-validators"],
};

initOpenNextCloudflareForDev();

export default nextConfig;
