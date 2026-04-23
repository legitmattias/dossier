/**
 * Centralised tooltip strings for consistency across pages.
 * Keep wording short — these surface via native `title` attributes on hover.
 */

export const PROFICIENCY_TOOLTIPS: Record<string, string> = {
  novice: "Novice — learning the basics, needs reference docs constantly",
  familiar: "Familiar — built something real, can read docs productively",
  proficient: "Proficient — picks appropriate approaches, debugs non-trivially",
  advanced: "Advanced — designs systems with it, mentors others",
  expert: "Expert — domain authority, shapes best practice",
};

export const PRIORITY_TOOLTIPS: Record<string, string> = {
  low: "Low priority — nice to have",
  medium: "Medium priority — planned, not urgent",
  high: "High priority — important, actively pursuing",
};

export const GOAL_STATUS_TOOLTIPS: Record<string, string> = {
  active: "Currently being worked on",
  paused: "Temporarily stopped — intend to resume",
  completed: "Finished — promoted to a skill",
  abandoned: "Stopped pursuing — not coming back",
};

export const PROJECT_STATUS_TOOLTIPS: Record<string, string> = {
  active: "Currently being worked on",
  completed: "Finished — shipped or wrapped",
  paused: "On hold",
  ideation: "Still a concept — not started",
};

export const VISIBILITY_PRIVATE_TOOLTIP = "Private — hidden from exports and public profile";
export const VISIBILITY_DOMAIN_PRIVATE_TOOLTIP = "Hidden because the parent domain is set to private — domain visibility overrides entity visibility";

export const FEATURED_TOOLTIP = "Featured — exported prominently to highlight this in your profile";

export function proficiencyTooltip(level: string, displayLabel?: string): string {
  const base = PROFICIENCY_TOOLTIPS[level] ?? level;
  return displayLabel && displayLabel !== level ? `${displayLabel} (${base})` : base;
}
