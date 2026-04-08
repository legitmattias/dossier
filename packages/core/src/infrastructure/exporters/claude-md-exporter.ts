import type { Profile } from "../../domain/entities/profile.js";
import type { Skill } from "../../domain/entities/skill.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import {
  formatTimeSince,
  getLastUsedDate,
  getLatestProgress,
  groupByDomain,
} from "./format-helpers.js";

export class ClaudeMdExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const lines: string[] = [];
    const now = new Date();

    lines.push(`# Dossier Profile: ${profile.name}`);

    // Skills grouped by domain > category
    const groups = groupByDomain(profile);
    const hasSkills = groups.some((g) => g.skills.length > 0);

    if (hasSkills) {
      lines.push("");
      lines.push("## Skills");

      for (const group of groups) {
        if (group.skills.length === 0) continue;

        lines.push("");
        lines.push(`### ${group.domain.name}`);

        // Group skills by category within the domain
        const byCategory = new Map<string, Skill[]>();
        for (const skill of group.skills) {
          const list = byCategory.get(skill.categoryId) ?? [];
          list.push(skill);
          byCategory.set(skill.categoryId, list);
        }

        for (const [categoryId, skills] of byCategory) {
          const category = group.domain.categories.find((c) => c.id === categoryId);
          const categoryName = category?.name ?? "Other";
          lines.push(`**${categoryName}:** ${skills.map((s) => formatSkillLine(s, now)).join(", ")}`);
        }
      }
    }

    // Active goals
    const activeGoals = profile.goals.filter((g) => g.status === "active");
    if (activeGoals.length > 0) {
      lines.push("");
      lines.push("## Currently Learning");
      for (const goal of activeGoals) {
        const progress = getLatestProgress(goal);
        lines.push(
          `- **${goal.name}** — ${goal.priority} priority, ${progress}% complete`,
        );
      }
    }

    // Paused goals
    const pausedGoals = profile.goals.filter((g) => g.status === "paused");
    if (pausedGoals.length > 0) {
      lines.push("");
      lines.push("## Paused");
      for (const goal of pausedGoals) {
        lines.push(`- ${goal.name} — paused`);
      }
    }

    // Completed goals
    const completedGoals = profile.goals.filter((g) => g.status === "completed");
    if (completedGoals.length > 0) {
      lines.push("");
      lines.push("## Completed Learning");
      for (const goal of completedGoals) {
        lines.push(`- ~~${goal.name}~~`);
      }
    }

    // Interests
    if (profile.interests.length > 0) {
      lines.push("");
      lines.push("## On My Radar");
      for (const interest of profile.interests) {
        lines.push(`- ${interest.name}`);
      }
    }

    // Guidance section — compact summary, not per-skill lines
    const strongSkills = profile.skills.filter(
      (s) => s.proficiency === "advanced" || s.proficiency === "expert",
    );
    const noviceSkills = profile.skills.filter(
      (s) => s.proficiency === "novice",
    );
    const activeGoalNames = profile.goals
      .filter((g) => g.status === "active")
      .map((g) => `${g.name} (${g.priority})`);

    if (strongSkills.length > 0 || noviceSkills.length > 0 || activeGoalNames.length > 0) {
      lines.push("");
      lines.push("## Guidance");
      if (strongSkills.length > 0) {
        lines.push(`**Key strengths (advanced/expert):** ${strongSkills.map((s) => s.name).join(", ")}.`);
      }
      if (activeGoalNames.length > 0) {
        lines.push(`**Currently learning:** ${activeGoalNames.join(", ")}.`);
      }
      if (noviceSkills.length > 0) {
        lines.push(`${noviceSkills.length} skills are at novice level — check proficiency above before assuming knowledge.`);
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}

function formatSkillLine(skill: Skill, now: Date): string {
  const lastUsed = getLastUsedDate(skill);

  // Only show freshness when there IS usage data — suppress "[no usage recorded]"
  if (!lastUsed) {
    return `${skill.name} (${skill.proficiency})`;
  }

  const timeSince = formatTimeSince(lastUsed, now);
  const freshness = timeSince === "recently"
    ? "last used: recently"
    : `last used: ${timeSince}`;

  return `${skill.name} (${skill.proficiency}) [${freshness}]`;
}
