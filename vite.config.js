import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// "npm run build" genera la app normal (dist/) que sirve el servidor Node.
// "npm run build:demo" genera un solo archivo HTML autocontenido (dist-demo/index.html).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "demo" ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === "demo" ? "dist-demo" : "dist",
    assetsInlineLimit: mode === "demo" ? 100000000 : 4096,
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
}));
