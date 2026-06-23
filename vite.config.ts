/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + React for Phase 1. Vitest runs in jsdom so the persistence layer's
// localStorage fallback (and DOM-dependent code) is exercised in tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
