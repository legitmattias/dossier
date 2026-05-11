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

// --- Field purpose tooltips (shown next to each form field's label) ---

export const FIELD_TOOLTIPS = {
  // Common
  name: "Display name for this item. Required.",
  description: "What this is — surfaced on public profile and exports.",
  notes: "Private notes — never exported, never shown publicly.",
  domain: "Knowledge domain this belongs to. Affects grouping in exports and visibility cascade.",
  category: "Sub-grouping within the domain. Only relevant for skills.",
  featured: "Promotes this item in exports and public views.",
  visibility: "Public means shown on your public profile. Private hides the whole item.",

  // Skill
  proficiency: "Your current level. Drives AI personalization. Hiding this reduces how well tools adapt to your knowledge.",
  proficiencyLabel: "Override the default proficiency label (e.g. 'native', 'CEFR B2'). Display only — doesn't change the underlying level.",

  // Goal
  motivation: "Why this matters to you. Often personal — consider marking private if it is.",
  priority: "How important this is. Low / Medium / High.",
  goalStatus: "Lifecycle stage: active / paused / completed / abandoned.",
  targetDate: "When you aim to complete this. Used for prioritization, not a hard deadline.",
  progress: "History of percentage updates. Private by default — granular per-update data is rarely meant for public consumption.",
  resources: "Articles, courses, or other materials you're using for this goal.",

  // Project
  url: "Link to the project — repo, live site, or write-up. Mark private if the repo is private.",
  role: "What you did on this project (e.g. 'lead developer', 'contributor').",
  status: "Current state of the project.",
  startDate: "When you started this project.",
  endDate: "When you finished (or stopped) this project.",
  highlights: "Bullet-point achievements, outcomes, or technical points worth surfacing.",
  skills: "Skills used or sharpened on this project.",

  // Interest
  interestDescription: "Why you're interested in this. Often what makes it stand out.",
} as const;

// --- Per-field private-override toggle ---

export const PRIVATE_FIELD_TOOLTIP = "Hide this field from public output, even though the item itself is public.";
export const PRIVATE_FIELD_PROFICIENCY_WARNING = "Hides your proficiency level publicly. Note: AI tools that personalize to your skill level lose this signal.";
export const PRIVATE_FIELDS_BADGE_TOOLTIP = "Some fields on this item are hidden from public view.";
