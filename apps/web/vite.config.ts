import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins:[
    react(),
    tailwindcss(),
    VitePWA({
      registerType:"autoUpdate",
      includeAssets:["icon.svg"],
      manifest:{
        id:"/",
        name:"REDIO HUB EA — Redio na Video za Afrika Mashariki",
        short_name:"REDIO HUB EA",
        description:"Sikiliza redio na tazama video rasmi za Afrika Mashariki.",
        start_url:"/",
        scope:"/",
        display:"standalone",
        background_color:"#080B16",
        theme_color:"#080B16",
        lang:"sw",
        icons:[{src:"/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},{src:"/icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"},{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]
      },
      workbox:{
        navigateFallback:"/index.html",
        globPatterns:["**/*.{js,css,html,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes:3_000_000,
        navigateFallbackDenylist:[/^\/api\//],
        runtimeCaching:[] // Never cache live streams, HLS segments, YouTube, or API responses.
      }
    })
  ],
  server:{port:5173}
});
