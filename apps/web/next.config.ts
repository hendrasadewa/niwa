import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
   transpilePackages: ["@niwa/ui"],
};

initOpenNextCloudflareForDev();

export default nextConfig;
