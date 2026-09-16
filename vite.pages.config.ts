import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL("./github-pages", import.meta.url)),
  base: "/touchline/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: { alias: { "@": root } },
  plugins: [react()],
  css: { postcss: root },
  build: {
    outDir: fileURLToPath(new URL("./dist-pages", import.meta.url)),
    emptyOutDir: true,
  },
});
