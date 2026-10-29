import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths so the same build works at a site root (tunnel, any
  // static host) and under a sub-path such as GitHub Pages' /Math-Flash/.
  base: './',
  // Allow access through a Cloudflare quick tunnel (https://*.trycloudflare.com),
  // which gives other devices the HTTPS origin browsers require for the microphone.
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { allowedHosts: ['.trycloudflare.com'] },
  test: { environment: 'node' },
});
