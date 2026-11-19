/// <reference types="vitest/config" />

declare const process: { env: Record<string, string | undefined> };
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves from https://<user>.github.io/card-odds/ (set VITE_BASE_PATH=/card-odds/).
// Local dev and `vite preview` stay at `/`.
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Card Odds',
        short_name: 'Card Odds',
        description: "Blackjack and Texas Hold'em odds trainer for home practice.",
        theme_color: '#0b5d3b',
        background_color: '#063d27',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    // .test.tsx files are screen/component tests; they opt into jsdom with a `@vitest-environment jsdom` comment.
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
