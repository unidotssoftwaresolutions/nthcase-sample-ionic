/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: mode === 'test' ? { conditions: ['browser', 'development'] } : undefined,
  // Relative asset paths, so the build loads the same from Capacitor's local server and from a plain file server.
  base: './',
  build: { outDir: 'dist', sourcemap: false, target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    testTimeout: 20000,
    // jsdom is a browser: resolve packages as one. Without this, @lit/react (under Ionic's React wrappers) loads its
    // server-rendering build, which never sets a component's properties (label, value, id) on the element.
    server: { deps: { inline: ['@ionic/react', '@stencil/react-output-target', '@lit/react'] } },
  },
}));
