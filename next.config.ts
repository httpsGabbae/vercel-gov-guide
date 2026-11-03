import path from 'path';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd()),
  async rewrites() {
    return [
      {
        source: '/citizen/chat',
        destination: '/chat',
      },
    ];
  },
};

export default function config(phase: string): NextConfig {
  // Next sets PORT to the actual listening port before loading the dev config.
  // Concurrent preview/recording servers must not overwrite each other's chunks.
  const port = /^\d+$/.test(process.env.PORT || '') ? process.env.PORT : '3000';
  return {
    ...nextConfig,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? `.next-dev-${port}` : '.next',
  };
}
