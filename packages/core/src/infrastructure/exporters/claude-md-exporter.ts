import type { Profile } from "../../domain/entities/profile.js";
import type { Skill } from "../../domain/entities/skill.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import type { Proficiency } from "../../domain/value-objects/proficiency.js";
import {
  formatTimeSince,
  getLastUsedDate,
  getLatestProgress,
} from "./format-helpers.js";

interface ProficiencyTier {
  readonly label: string;
  readonly levels: readonly Proficiency[];
}

const TIERS: readonly ProficiencyTier[] = [
  { label: "Strong (advanced/expert)", levels: ["advanced", "expert"] },
  { label: "Proficient", levels: ["proficient"] },
  { label: "Familiar", levels: ["familiar"] },
  { label: "Novice", levels: ["novice"] },
];

export class ClaudeMdExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const lines: string[] = [];
    const now = new Date();

    lines.push(`# Dossier Profile: ${profile.name}`);

    // Skills grouped by proficiency tier
    if (profile.skills.length > 0) {
      lines.push("");
      lines.push("## Skills");

      for (const tier of TIERS) {
        const skills = profile.skills.filter((s) =>
          (tier.levels as readonly string[]).includes(s.proficiency),
        );
        if (skills.length === 0) continue;

        lines.push("");
        lines.push(`### ${tier.label}`);
        for (const skill of skills) {
          lines.push(`- ${formatSkillLine(skill, now)}`);
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

    // Guidance section
    const strongSkills = profile.skills.filter(
      (s) => s.proficiency === "advanced" || s.proficiency === "expert",
    );
    const noviceSkills = profile.skills.filter(
      (s) => s.proficiency === "novice",
    );

    if (strongSkills.length > 0 || noviceSkills.length > 0) {
      lines.push("");
      lines.push("## When suggesting solutions:");
      for (const skill of strongSkills) {
        lines.push(`- Prefer ${skill.name} — this is a strength`);
      }
      for (const skill of noviceSkills) {
        lines.push(
          `- ${skill.name} is a novice skill — extra explanation welcome`,
        );
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}

function formatSkillLine(skill: Skill, now: Date): string {
  const lastUsed = getLastUsedDate(skill);
  let freshness: string;

  if (!lastUsed) {
    freshness = "no usage recorded";
  } else {
    const timeSince = formatTimeSince(lastUsed, now);
    freshness =
      timeSince === "recently"
        ? "last used: recently"
        : `last used: ${timeSince} - may need refresher`;
  }

  return `${skill.name} (${skill.proficiency}) [${freshness}]`;
}
