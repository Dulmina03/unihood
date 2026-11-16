import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { maxWorkers: 2, environment: 'jsdom', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], setupFiles: ['./tests/setup.ts'] }, oxc: { jsx: { runtime: 'automatic' } } });
