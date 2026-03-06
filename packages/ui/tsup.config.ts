import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/inject.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  injectStyle: true,
});
