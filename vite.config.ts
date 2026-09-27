import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build` → dist/index.html, one self-contained file you can host anywhere.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: { chunkSizeWarningLimit: 3000 },
});
