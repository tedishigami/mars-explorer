import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

// vite-plugin-cesium copies Cesium's static assets (workers, internal
// textures, third-party libs) into the build and sets CESIUM_BASE_URL
// automatically, so we never have to touch that plumbing by hand.
export default defineConfig({
  plugins: [react(), cesium()],
});
