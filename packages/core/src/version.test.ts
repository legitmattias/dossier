import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { VERSION, getVersionInfo } from "./version.js";

describe("VERSION", () => {
  it("is a non-empty semver string", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
  });
});

describe("getVersionInfo", () => {
  const originalSha = process.env["DOSSIER_COMMIT_SHA"];
  const originalBuiltAt = process.env["DOSSIER_BUILT_AT"];

  beforeEach(() => {
    delete process.env["DOSSIER_COMMIT_SHA"];
    delete process.env["DOSSIER_BUILT_AT"];
  });

  afterEach(() => {
    if (originalSha === undefined) {
      delete process.env["DOSSIER_COMMIT_SHA"];
    } else {
      process.env["DOSSIER_COMMIT_SHA"] = originalSha;
    }
    if (originalBuiltAt === undefined) {
      delete process.env["DOSSIER_BUILT_AT"];
    } else {
      process.env["DOSSIER_BUILT_AT"] = originalBuiltAt;
    }
  });

  it("falls back to 'dev' and 'development' when env vars are unset", () => {
    expect(getVersionInfo()).toEqual({
      version: VERSION,
      commitSha: "dev",
      builtAt: "development",
    });
  });

  it("reads DOSSIER_COMMIT_SHA and DOSSIER_BUILT_AT from env", () => {
    process.env["DOSSIER_COMMIT_SHA"] = "abc1234567";
    process.env["DOSSIER_BUILT_AT"] = "2026-04-17T10:00:00Z";

    expect(getVersionInfo()).toEqual({
      version: VERSION,
      commitSha: "abc1234567",
      builtAt: "2026-04-17T10:00:00Z",
    });
  });
});
