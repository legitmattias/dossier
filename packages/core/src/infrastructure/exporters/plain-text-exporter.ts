import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { groupByDomain } from "./format-helpers.js";

export class PlainTextExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const lines: string[] = [];
    lines.push(`Profile: ${profile.name}`);

    const groups = groupByDomain(profile);

    for (const group of groups) {
      lines.push("");
      lines.push(group.domain.name);

      if (group.skills.length > 0) {
        lines.push("  Skills:");
        for (const skill of group.skills) {
          lines.push(`    ${skill.name} (${skill.proficiency})`);
        }
      }

      if (group.goals.length > 0) {
        lines.push("  Learning Goals:");
        for (const goal of group.goals) {
          lines.push(`    ${goal.name} [${goal.status}, ${goal.priority}]`);
        }
      }

      if (group.interests.length > 0) {
        lines.push("  Interests:");
        for (const interest of group.interests) {
          lines.push(`    ${interest.name}`);
        }
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}
