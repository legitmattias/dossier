/**
 * Authoritative version source for all Dossier packages.
 * COMMIT_SHA and BUILT_AT are injected at build time via environment variables.
 */

export const VERSION = "0.1.0";

export interface VersionInfo {
  readonly version: string;
  readonly commitSha: string;
  readonly builtAt: string;
}

export function getVersionInfo(): VersionInfo {
  return {
    version: VERSION,
    commitSha: process.env["DOSSIER_COMMIT_SHA"] ?? "dev",
    builtAt: process.env["DOSSIER_BUILT_AT"] ?? "development",
  };
}
