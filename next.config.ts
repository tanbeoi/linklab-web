import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname:
                    "linklab-uploads.s3.ap-southeast-2.amazonaws.com",
                pathname: "/users/**",
            },
        ],
    },
};

export default nextConfig;