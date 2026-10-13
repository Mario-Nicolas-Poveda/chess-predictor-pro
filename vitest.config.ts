import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// mismo alias `@/*` que tsconfig.json
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
