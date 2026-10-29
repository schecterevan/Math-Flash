import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allow access through a Cloudflare quick tunnel (https://*.trycloudflare.com),
  // which gives other devices the HTTPS origin browsers require for the microphone.
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { allowedHosts: ['.trycloudflare.com'] },
  test: { environment: 'node' },
});
