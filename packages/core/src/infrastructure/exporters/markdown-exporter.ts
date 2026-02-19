import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { getLatestProgress, groupByDomain } from "./format-helpers.js";

export class MarkdownExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const lines: string[] = [];
    lines.push(`# ${profile.name} — Dossier Profile`);

    const groups = groupByDomain(profile);

    for (const group of groups) {
      lines.push("");
      lines.push(`## ${group.domain.name}`);

      if (group.skills.length > 0) {
        lines.push("");
        lines.push("### Skills");
        lines.push("| Skill | Proficiency | Notes |");
        lines.push("|-------|-------------|-------|");
        for (const skill of group.skills) {
          const notes = skill.notes ?? "-";
          lines.push(`| ${skill.name} | ${skill.proficiency} | ${notes} |`);
        }
      }

      const activeGoals = group.goals.filter((g) => g.status !== "completed");
      const completedGoals = group.goals.filter((g) => g.status === "completed");

      if (activeGoals.length > 0) {
        lines.push("");
        lines.push("### Learning Goals");
        for (const goal of activeGoals) {
          const progress = getLatestProgress(goal);
          lines.push(
            `- **${goal.name}** (${goal.status}, ${goal.priority} priority) — ${progress}% complete`,
          );
        }
      }

      if (completedGoals.length > 0) {
        lines.push("");
        lines.push("### Completed Goals");
        for (const goal of completedGoals) {
          lines.push(`- ~~${goal.name}~~`);
        }
      }

      if (group.interests.length > 0) {
        lines.push("");
        lines.push("### Interests");
        for (const interest of group.interests) {
          lines.push(`- ${interest.name}`);
        }
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}
