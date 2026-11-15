import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({plugins:[react(),tailwindcss(),VitePWA({registerType:"autoUpdate",manifest:{name:"REDIO HUB EA",short_name:"REDIO HUB",start_url:"/",display:"standalone",background_color:"#080B16",theme_color:"#080B16",lang:"sw",icons:[]},workbox:{navigateFallback:"/index.html",globPatterns:["**/*.{js,css,html,svg,png,ico}"],runtimeCaching:[]}})],server:{port:5173}});
