import { VERSION, getVersionInfo } from "@dossier/core";

export const CLI_VERSION = VERSION;

export function getCliVersionString(): string {
  const { version, commitSha } = getVersionInfo();
  return commitSha === "dev" ? version : `${version} (${commitSha.slice(0, 7)})`;
}
