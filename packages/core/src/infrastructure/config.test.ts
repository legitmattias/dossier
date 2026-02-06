import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDefaultProfilePath } from "./config.js";

describe("getDefaultProfilePath", () => {
  const originalEnv = process.env["XDG_CONFIG_HOME"];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["XDG_CONFIG_HOME"] = originalEnv;
    } else {
      delete process.env["XDG_CONFIG_HOME"];
    }
  });

  it("uses XDG_CONFIG_HOME when set", () => {
    process.env["XDG_CONFIG_HOME"] = "/custom/config";
    expect(getDefaultProfilePath()).toBe("/custom/config/dossier/profile.json");
  });

  it("falls back to ~/.config when XDG_CONFIG_HOME is not set", () => {
    delete process.env["XDG_CONFIG_HOME"];
    const expected = join(homedir(), ".config", "dossier", "profile.json");
    expect(getDefaultProfilePath()).toBe(expected);
  });

  it("falls back to ~/.config when XDG_CONFIG_HOME is empty", () => {
    process.env["XDG_CONFIG_HOME"] = "";
    const expected = join(homedir(), ".config", "dossier", "profile.json");
    expect(getDefaultProfilePath()).toBe(expected);
  });
});
