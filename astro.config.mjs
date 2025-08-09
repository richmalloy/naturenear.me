// @ts-check
import { defineConfig } from "astro/config";
import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  build: {
    inlineStylesheets: "auto",
    assets: "_astro",
  },
  compressHTML: true,
  integrations: [
    compress({
      CSS: true,
      HTML: true,
      Image: false, // We'll handle images separately
      JavaScript: true,
      SVG: true,
    }),
  ],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
