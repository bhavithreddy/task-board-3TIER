import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // ─── LOCAL DEV PROXY ──────────────────────────────────────
    // When running "npm run dev", Vite proxies any request
    // starting with /api to http://localhost:5000.
    // This avoids CORS issues and mimics the production NGINX setup.
    // e.g. GET /api/tasks → http://localhost:5000/api/tasks
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        // Do NOT rewrite — keep /api prefix since backend expects it
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
