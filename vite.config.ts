import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solidPlugin()],
  
  envPrefix: ["VITE_", "YAAGL_"],
  build: {
    target: "safari13",
    minify: true,
    sourcemap: false,
    outDir: "dist",
    rollupOptions: {
    }
  },
});
