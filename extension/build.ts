/**
 * GovGuide PH — Extension Multi-Target Builder (Vite API)
 * Generates Manifest V3 production bundle in extension/dist/
 */

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const extDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(extDir, 'dist');

function safeCleanDir(targetDir: string) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    return;
  }
  try {
    for (const file of fs.readdirSync(targetDir)) {
      const fullPath = resolve(targetDir, file);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } catch {
        // Safe to ignore individual locked files; Vite will overwrite them
      }
    }
  } catch {
    // Folder handle is held by Chrome; overwrite in place
  }
}

async function buildAll() {
  console.log('📦 Starting GovGuide PH Chrome Extension build...');

  // Safe clean without deleting the root dist folder (prevents Windows Chrome EPERM lock)
  safeCleanDir(distDir);

  // 1. Build Popup (HTML + React)
  console.log('1️⃣  Building Popup application...');
  await build({
    root: extDir,
    plugins: [react()],
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: resolve(extDir, 'popup.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // 2. Build Background Service Worker (ES module)
  console.log('2️⃣  Building Background Service Worker...');
  await build({
    root: extDir,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(extDir, 'src/background/index.ts'),
        name: 'GovGuideBackground',
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  // 3. Build Content Script (IIFE for instant injection)
  console.log('3️⃣  Building Content Script (IIFE)...');
  await build({
    root: extDir,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(extDir, 'src/content/index.ts'),
        name: 'GovGuideContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
    },
  });

  // 4. Copy Manifest and Icons
  console.log('4️⃣  Copying Manifest V3 and Assets...');
  fs.copyFileSync(
    resolve(extDir, 'public/manifest.json'),
    resolve(distDir, 'manifest.json')
  );

  const iconsSrcDir = resolve(extDir, 'public/icons');
  const iconsDistDir = resolve(distDir, 'icons');
  if (fs.existsSync(iconsSrcDir)) {
    fs.mkdirSync(iconsDistDir, { recursive: true });
    for (const file of fs.readdirSync(iconsSrcDir)) {
      fs.copyFileSync(resolve(iconsSrcDir, file), resolve(iconsDistDir, file));
    }
  }

  console.log('🎉 GovGuide PH Chrome Extension built successfully in extension/dist/');
}

buildAll().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
