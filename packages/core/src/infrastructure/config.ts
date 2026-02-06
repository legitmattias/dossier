import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Returns the default profile file path following XDG Base Directory Specification.
 * Uses $XDG_CONFIG_HOME/dossier/profile.json, falling back to ~/.config/dossier/profile.json.
 * Does NOT create directories — that's the repository's responsibility.
 */
export function getDefaultProfilePath(): string {
  const configHome = process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config");
  return join(configHome, "dossier", "profile.json");
}
