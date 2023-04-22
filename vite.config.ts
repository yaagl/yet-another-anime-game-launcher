/// <reference types="vitest" />
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), {
    name: "channel-client switcher",
    load:  (id) => {
      if(id.endsWith("/src/clients/index.ts")) {
        const cc = process.env["YAAGL_CHANNEL_CLIENT"] ?? "hk4ecn";
        console.info(`Building channel client ${cc}`);
        return `export * from './${cc}'`;
      }
      return null;
    }
  }, solidPlugin()],

  envPrefix: ["VITE_", "YAAGL_"],
  build: {
    target: "safari13",
    minify: true,
    sourcemap: false,
    outDir: "dist",
    rollupOptions: {},
  },
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
