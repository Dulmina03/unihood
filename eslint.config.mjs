import next from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/coverage/**', '**/next-env.d.ts'] },
  ...tseslint.configs.recommended,
  { files: ['apps/web/**/*.{ts,tsx,js,mjs}'], settings: { next: { rootDir: 'apps/web/' } } },
  ...next.map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,mjs}'] })),
];
