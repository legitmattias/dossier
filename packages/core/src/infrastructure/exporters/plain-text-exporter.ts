import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { getDisplayProficiency, groupByDomain } from "./format-helpers.js";

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

        // Group skills by category
        const byCategory = new Map<string, typeof group.skills[number][]>();
        for (const skill of group.skills) {
          const list = byCategory.get(skill.categoryId) ?? [];
          list.push(skill);
          byCategory.set(skill.categoryId, list);
        }

        for (const [categoryId, skills] of byCategory) {
          const category = group.domain.categories.find((c) => c.id === categoryId);
          const categoryName = category?.name ?? "Other";
          lines.push(`    ${categoryName}:`);
          for (const skill of skills) {
            const desc = skill.description ? ` — ${skill.description}` : "";
            const feat = skill.featured ? " [featured]" : "";
            lines.push(`      ${skill.name} (${getDisplayProficiency(skill, group.domain)})${desc}${feat}`);
          }
        }
      }

      const activeGoals = group.goals.filter((g) => g.status !== "completed" && g.visibility !== "private");
      const completedGoals = group.goals.filter((g) => g.status === "completed" && g.visibility !== "private");

      if (activeGoals.length > 0) {
        lines.push("  Learning Goals:");
        for (const goal of activeGoals) {
          const feat = goal.featured ? " [featured]" : "";
          lines.push(`    ${goal.name} [${goal.status}, ${goal.priority}]${feat}`);
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
          const feat = interest.featured ? " [featured]" : "";
          lines.push(`    ${interest.name}${feat}`);
        }
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}
