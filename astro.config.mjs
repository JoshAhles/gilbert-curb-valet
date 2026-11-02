import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://gilbertcurbvalet.com",
  output: "static",
  build: { inlineStylesheets: "always" },
  integrations: [sitemap({ filter: (page) => !/\/(og|404)\/?$/.test(new URL(page).pathname) })],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) return "three";
            if (id.includes("node_modules/gsap")) return "gsap";
          },
        },
      },
    },
  },
});
