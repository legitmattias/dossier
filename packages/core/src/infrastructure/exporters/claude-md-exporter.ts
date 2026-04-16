import type { Profile } from "../../domain/entities/profile.js";
import type { Skill } from "../../domain/entities/skill.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import {
  formatTimeSince,
  getLastUsedDate,
  getLatestProgress,
  groupByDomain,
  isExportVisible,
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

    // Featured skills — called out prominently
    const featuredSkills = profile.skills.filter((s) => s.featured && isExportVisible(profile, s));
    if (featuredSkills.length > 0) {
      lines.push("");
      lines.push("## Key Skills");
      lines.push(featuredSkills.map((s) => {
        let entry = `**${s.name}** (${s.proficiency})`;
        if (s.description) entry += ` — ${s.description}`;
        return entry;
      }).join(", "));
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
    const activeGoals = profile.goals.filter((g) => g.status === "active" && isExportVisible(profile, g));
    if (activeGoals.length > 0) {
      lines.push("");
      lines.push("## Currently Learning");
      const sortedGoals = [...activeGoals].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      for (const goal of sortedGoals) {
        const progress = getLatestProgress(goal);
        const prefix = goal.featured ? "[Featured] " : "";
        let line = `- ${prefix}**${goal.name}** — ${goal.priority} priority, ${progress}% complete`;
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
    const pausedGoals = profile.goals.filter((g) => g.status === "paused" && isExportVisible(profile, g));
    if (pausedGoals.length > 0) {
      lines.push("");
      lines.push("## Paused");
      for (const goal of pausedGoals) {
        lines.push(`- ${goal.name} — paused`);
      }
    }

    // Completed goals
    const completedGoals = profile.goals.filter((g) => g.status === "completed" && isExportVisible(profile, g));
    if (completedGoals.length > 0) {
      lines.push("");
      lines.push("## Completed Learning");
      for (const goal of completedGoals) {
        lines.push(`- ~~${goal.name}~~`);
      }
    }

    // Skill name lookup for project skill references
    const skillNameMap = new Map<string, string>(profile.skills.map((s) => [s.id, s.name]));

    // Featured projects — shown prominently
    const featuredProjects = profile.projects.filter((p) => p.featured && isExportVisible(profile, p));
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
        if (project.skillIds.length > 0) {
          const skillNames = project.skillIds.map((id) => skillNameMap.get(id)).filter(Boolean);
          if (skillNames.length > 0) {
            line += `\n  Skills: ${skillNames.join(", ")}`;
          }
        }
        lines.push(line);
      }
    }

    // Other active projects
    const otherProjects = profile.projects.filter((p) => !p.featured && p.status === "active" && isExportVisible(profile, p));
    if (otherProjects.length > 0) {
      lines.push("");
      lines.push("## Active Projects");
      for (const project of otherProjects) {
        let line = `- ${project.name}`;
        if (project.description) line += ` — ${project.description}`;
        if (project.role) line += ` (${project.role})`;
        if (project.skillIds.length > 0) {
          const skillNames = project.skillIds.map((id) => skillNameMap.get(id)).filter(Boolean);
          if (skillNames.length > 0) {
            line += `\n  Skills: ${skillNames.join(", ")}`;
          }
        }
        lines.push(line);
      }
    }

    // Interests
    const visibleInterests = profile.interests.filter((i) => isExportVisible(profile, i));
    if (visibleInterests.length > 0) {
      lines.push("");
      lines.push("## On My Radar");
      const sortedInterests = [...visibleInterests].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      for (const interest of sortedInterests) {
        const prefix = interest.featured ? "**" : "";
        const suffix = interest.featured ? "**" : "";
        if (interest.description) {
          lines.push(`- ${prefix}${interest.name}${suffix} — ${interest.description}`);
        } else {
          lines.push(`- ${prefix}${interest.name}${suffix}`);
        }
      }
    }

    // Guidance section — compact summary, not per-skill lines
    const strongSkills = profile.skills.filter(
      (s) => (s.proficiency === "advanced" || s.proficiency === "expert") && isExportVisible(profile, s),
    );
    const noviceSkills = profile.skills.filter(
      (s) => s.proficiency === "novice" && isExportVisible(profile, s),
    );
    const activeGoalNames = profile.goals
      .filter((g) => g.status === "active" && isExportVisible(profile, g))
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
  const descSuffix = skill.description ? ` — ${skill.description}` : "";

  // Only show freshness when there IS usage data
  if (!lastUsed) {
    return `${skill.name} (${skill.proficiency})${descSuffix}`;
  }

  const timeSince = formatTimeSince(lastUsed, now);
  const freshness = timeSince === "recently"
    ? "last used: recently"
    : `last used: ${timeSince}`;

  return `${skill.name} (${skill.proficiency}) [${freshness}]${descSuffix}`;
}
