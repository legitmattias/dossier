import { defineConfig } from "vitest/config";

const pkgProject = (name: string) => ({
  test: {
    name,
    include: [`packages/${name}/src/**/*.test.ts`],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});

export default defineConfig({
  test: {
    projects: [
      pkgProject("core"),
      pkgProject("cli"),
      pkgProject("mcp"),
      pkgProject("api"),
    ],
    passWithNoTests: true,
  },
});
