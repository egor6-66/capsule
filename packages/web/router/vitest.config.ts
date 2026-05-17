import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    // wrap() и useRouter() — pure-логика, без DOM. Тяжёлый jsdom не нужен.
    environment: 'node',
    globals: false,
  },
});
