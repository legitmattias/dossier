import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { groupByDomain } from "./format-helpers.js";

export class PlainTextExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const lines: string[] = [];
    lines.push(`Dossier Profile: ${profile.name}`);

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

      const activeGoals = group.goals.filter((g) => g.status !== "completed");
      const completedGoals = group.goals.filter((g) => g.status === "completed");

      if (activeGoals.length > 0) {
        lines.push("  Learning Goals:");
        for (const goal of activeGoals) {
          lines.push(`    ${goal.name} [${goal.status}, ${goal.priority}]`);
        }
      }

      if (completedGoals.length > 0) {
        lines.push("  Completed Goals:");
        for (const goal of completedGoals) {
          lines.push(`    ${goal.name}`);
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
