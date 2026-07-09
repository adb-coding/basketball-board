import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative base so the build also works inside a Capacitor webview
  base: './',
  // /mnt/c (WSL drvfs) has no inotify — poll so edits invalidate the module graph
  server: { watch: { usePolling: true, interval: 300 } },
});
