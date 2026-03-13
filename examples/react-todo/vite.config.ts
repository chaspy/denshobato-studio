import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { denshobato } from '@chaspy/denshobato-vite-plugin';

export default defineConfig({
  plugins: [denshobato(), react()],
});
