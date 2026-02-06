import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
  },
  {
    entry: ["src/bin.ts"],
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
