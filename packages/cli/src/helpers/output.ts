export function success(msg: string): void {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

export function info(msg: string): void {
  console.log(`\x1b[34mℹ\x1b[0m ${msg}`);
}

export function warn(msg: string): void {
  console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
}

export function error(msg: string): void {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

export function table(headers: string[], rows: string[][]): void {
  if (rows.length === 0) return;

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );

  const separator = colWidths.map((w) => "─".repeat(w + 2)).join("┼");
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell ?? "").padEnd(colWidths[i]!)} `).join("│");

  console.log(formatRow(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}
