/**
 * Simple logger that writes to stderr (stdout is reserved for stdio transport).
 */
export const log = {
  info(message: string): void {
    console.error(`[dossier-mcp] ${message}`);
  },
  warn(message: string): void {
    console.error(`[dossier-mcp] WARN: ${message}`);
  },
  error(message: string): void {
    console.error(`[dossier-mcp] ERROR: ${message}`);
  },
};
