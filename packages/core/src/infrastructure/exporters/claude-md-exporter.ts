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

    // Bio
    if (profile.bio) {
      lines.push("");
      lines.push(profile.bio);
    }

    // Custom instructions — rendered prominently for LLM consumption
    if (profile.customInstructions) {
      lines.push("");
      lines.push("## Instructions");
      lines.push(profile.customInstructions);
    }

    // Preferred language
    if (profile.preferredLanguage) {
      lines.push("");
      lines.push(`**Preferred language:** ${profile.preferredLanguage}`);
    }

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
        let line = `- **${goal.name}** — ${goal.priority} priority, ${progress}% complete`;
        if (goal.motivation) {
          line += ` (${goal.motivation})`;
        }
        if (goal.description) {
          line += `\n  ${goal.description}`;
        }
        lines.push(line);
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

    // Featured projects — shown prominently
    const featuredProjects = profile.projects.filter((p) => p.featured);
    if (featuredProjects.length > 0) {
      lines.push("");
      lines.push("## Featured Projects");
      for (const project of featuredProjects) {
        let line = `- **${project.name}**`;
        if (project.description) line += ` — ${project.description}`;
        if (project.role) line += ` (${project.role})`;
        if (project.url) line += ` [${project.url}]`;
        if (project.highlights.length > 0) {
          for (const highlight of project.highlights) {
            line += `\n  - ${highlight}`;
          }
        }
        lines.push(line);
      }
    }

    // Other active projects
    const otherProjects = profile.projects.filter((p) => !p.featured && p.status === "active");
    if (otherProjects.length > 0) {
      lines.push("");
      lines.push("## Active Projects");
      for (const project of otherProjects) {
        let line = `- ${project.name}`;
        if (project.description) line += ` — ${project.description}`;
        if (project.role) line += ` (${project.role})`;
        lines.push(line);
      }
    }

    // Interests
    if (profile.interests.length > 0) {
      lines.push("");
      lines.push("## On My Radar");
      for (const interest of profile.interests) {
        if (interest.description) {
          lines.push(`- ${interest.name} — ${interest.description}`);
        } else {
          lines.push(`- ${interest.name}`);
        }
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
        const n = noviceSkills.length;
        lines.push(`${n} ${n === 1 ? "skill is" : "skills are"} at novice level — check proficiency above before assuming knowledge.`);
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}

function formatSkillLine(skill: Skill, now: Date): string {
  const lastUsed = getLastUsedDate(skill);
  const notesSuffix = skill.notes ? ` — ${skill.notes}` : "";

  // Only show freshness when there IS usage data
  if (!lastUsed) {
    return `${skill.name} (${skill.proficiency})${notesSuffix}`;
  }

  const timeSince = formatTimeSince(lastUsed, now);
  const freshness = timeSince === "recently"
    ? "last used: recently"
    : `last used: ${timeSince}`;

  return `${skill.name} (${skill.proficiency}) [${freshness}]${notesSuffix}`;
}
