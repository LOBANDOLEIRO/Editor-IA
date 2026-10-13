/** @type {import('next').NextConfig} */
const nextConfig = {
  // A CLI do HyperFrames roda como processo separado no render; não precisa ir para o bundle.
  serverExternalPackages: ["hyperframes"],
};

export default nextConfig;
