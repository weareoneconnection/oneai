// apps/web/next.config.mjs
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // apps/web -> ../../ = oneai (monorepo 根目录)
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;