import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

const VERSION = "0.1.0";

export default defineConfig({
  plugins: [remix()],
  define: {
    __DOSSIER_VERSION__: JSON.stringify(VERSION),
    __DOSSIER_SHA__: JSON.stringify(process.env["DOSSIER_COMMIT_SHA"] ?? "dev"),
    __DOSSIER_BUILT__: JSON.stringify(process.env["DOSSIER_BUILT_AT"] ?? "development"),
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
  resolve: {
    alias: {
      "~": "/app",
    },
  },
});
