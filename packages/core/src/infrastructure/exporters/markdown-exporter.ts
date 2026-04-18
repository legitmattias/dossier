import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { getDisplayProficiency, getLatestProgress, groupByDomain } from "./format-helpers.js";

export class MarkdownExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const lines: string[] = [];
    lines.push(`# ${profile.name} — Dossier Profile`);
    lines.push("");
    lines.push(`_Profile last updated: ${formatDate(profile.updatedAt)}_`);

    const groups = groupByDomain(profile);

    for (const group of groups) {
      lines.push("");
      lines.push(`## ${group.domain.name}`);

      if (group.skills.length > 0) {
        lines.push("");
        lines.push("### Skills");

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
          lines.push("");
          lines.push(`#### ${categoryName}`);
          lines.push("| Skill | Proficiency | Updated | Description |");
          lines.push("|-------|-------------|---------|-------------|");
          for (const skill of skills) {
            const prefix = skill.featured ? "★ " : "";
            const desc = skill.description ?? "-";
            lines.push(`| ${prefix}${skill.name} | ${getDisplayProficiency(skill, group.domain)} | ${formatDate(skill.updatedAt)} | ${desc} |`);
          }
        }
      }

      const activeGoals = group.goals.filter((g) => g.status !== "completed" && g.visibility !== "private");
      const completedGoals = group.goals.filter((g) => g.status === "completed" && g.visibility !== "private");

      if (activeGoals.length > 0) {
        lines.push("");
        lines.push("### Learning Goals");
        for (const goal of activeGoals) {
          const progress = getLatestProgress(goal);
          const prefix = goal.featured ? "★ " : "";
          lines.push(
            `- ${prefix}**${goal.name}** (${goal.status}, ${goal.priority} priority) — ${progress}% complete — updated ${formatDate(goal.updatedAt)}`,
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
          const prefix = interest.featured ? "★ " : "";
          lines.push(`- ${prefix}${interest.name}`);
        }
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}
