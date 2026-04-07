import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  application,
  infrastructure,
  PROFICIENCY_LEVELS,
  createDomain,
  createCategory,
  addDomainToProfile,
  addCategoryToDomain,
  findDomainInProfile,
  updateSkillInProfile,
  toDomainId,
  toCategoryId,
} from "@dossier/core";

import type { DossierMcpDeps } from "./server.js";

export function registerTools(server: McpServer, deps: DossierMcpDeps): void {
  server.registerTool(
    "dossier_add_skill",
    {
      title: "Add Skill",
      description: "Add a new skill to the profile. Requires name, domainId, categoryId, and proficiency level.",
      inputSchema: z.object({
        name: z.string().describe("Skill name (e.g. 'TypeScript', 'Swedish')"),
        domainId: z.string().describe("Domain ID, slug, or name (e.g. 'software-development' or 'Software Development')"),
        categoryId: z.string().describe("Category ID, slug, or name (e.g. 'languages' or 'Programming Languages')"),
        proficiency: z.enum(PROFICIENCY_LEVELS).describe("Proficiency level"),
        notes: z.string().optional().describe("Optional notes about this skill"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) throw new Error("No profile found.");
      const domainId = resolveDomainId(profile, input.domainId);
      const domain = findDomainInProfile(profile, domainId);
      const categoryId = resolveCategoryId(domain, input.categoryId);
      const result = await application.addSkill(deps, { ...input, domainId, categoryId });
      return ok(`Added skill: ${result.skill.name} (${result.skill.proficiency})`);
    },
  );

  server.registerTool(
    "dossier_list_skills",
    {
      title: "List Skills",
      description: "List skills with optional filters. Returns skill names, proficiency levels, domain, and category.",
      inputSchema: z.object({
        domainId: z.string().optional().describe("Filter by domain ID"),
        categoryId: z.string().optional().describe("Filter by category ID"),
        proficiency: z.enum(PROFICIENCY_LEVELS).optional().describe("Filter by proficiency level"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) throw new Error("No profile found.");
      const resolvedInput = input.domainId ? { ...input, domainId: resolveDomainId(profile, input.domainId) } : input;
      const result = await application.listSkills(deps, resolvedInput);
      if (result.skills.length === 0) {
        return ok("No skills found matching the filters.");
      }
      // Build name lookup maps
      const domainNames = new Map(profile.domains.map((d) => [d.id, d.name]));
      const categoryNames = new Map(profile.domains.flatMap((d) => d.categories.map((c) => [c.id, c.name])));
      const lines = result.skills.map((s) => {
        const domain = domainNames.get(s.domainId) ?? s.domainId;
        const category = categoryNames.get(s.categoryId) ?? s.categoryId;
        return `- ${s.name} (${s.proficiency}) [${domain} > ${category}]`;
      });
      return ok(lines.join("\n"));
    },
  );

  server.registerTool(
    "dossier_list_goals",
    {
      title: "List Learning Goals",
      description: "List learning goals with optional status filter.",
      inputSchema: z.object({
        status: z.enum(["active", "paused", "completed", "abandoned"]).optional().describe("Filter by goal status"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) {
        return ok("No profile found.");
      }
      let goals = [...profile.goals];
      if (input.status) {
        goals = goals.filter((g) => g.status === input.status);
      }
      if (goals.length === 0) {
        return ok("No goals found matching the filter.");
      }
      const lines = goals.map((g) =>
        `- ${g.name} (${g.status}, ${g.priority} priority)`,
      );
      return ok(lines.join("\n"));
    },
  );

  server.registerTool(
    "dossier_update_skill",
    {
      title: "Update Skill",
      description: "Update an existing skill's proficiency, notes, or name.",
      inputSchema: z.object({
        skillId: z.string().describe("Skill ID to update"),
        name: z.string().optional().describe("New name"),
        proficiency: z.enum(PROFICIENCY_LEVELS).optional().describe("New proficiency level"),
        notes: z.string().optional().describe("Updated notes"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.updateSkill(deps, input);
      return ok(`Updated skill: ${result.skill.name} (${result.skill.proficiency})`);
    },
  );

  server.registerTool(
    "dossier_remove_skill",
    {
      title: "Remove Skill",
      description: "Remove a skill from the profile.",
      inputSchema: z.object({
        skillId: z.string().describe("Skill ID to remove"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      await application.removeSkill(deps, input);
      return ok("Skill removed.");
    },
  );

  server.registerTool(
    "dossier_add_goal",
    {
      title: "Add Learning Goal",
      description: "Add a new learning goal to the profile.",
      inputSchema: z.object({
        name: z.string().describe("Goal name (e.g. 'Learn Rust')"),
        domainId: z.string().describe("Domain ID, slug, or name"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Priority level (default: medium)"),
        description: z.string().optional().describe("Goal description or motivation"),
        targetDate: z.string().optional().describe("Target date in ISO format (e.g. '2026-12-31')"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) throw new Error("No profile found.");
      const domainId = resolveDomainId(profile, input.domainId);
      const result = await application.addLearningGoal(deps, { ...input, domainId });
      return ok(`Added goal: ${result.goal.name} (${result.goal.priority} priority)`);
    },
  );

  server.registerTool(
    "dossier_update_goal",
    {
      title: "Update Goal Progress",
      description: "Update the progress percentage of a learning goal (0-100).",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID to update"),
        percentage: z.number().min(0).max(100).describe("Progress percentage (0-100)"),
        note: z.string().optional().describe("Progress note"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.updateGoalProgress(deps, input);
      const latest = result.goal.progress[result.goal.progress.length - 1];
      return ok(`Updated goal: ${result.goal.name} → ${latest?.percentage ?? input.percentage}%`);
    },
  );

  server.registerTool(
    "dossier_complete_goal",
    {
      title: "Complete Goal",
      description: "Mark a learning goal as completed and create a corresponding skill.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID to complete"),
        categoryId: z.string().describe("Category ID for the new skill"),
        proficiency: z.enum(PROFICIENCY_LEVELS).optional().describe("Initial proficiency for the new skill (default: novice)"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.completeGoal(deps, input);
      return ok(`Completed goal: ${result.goal.name}. Created skill: ${result.skill.name} (${result.skill.proficiency})`);
    },
  );

  server.registerTool(
    "dossier_add_interest",
    {
      title: "Add Interest",
      description: "Add a topic of interest — something you're curious about but haven't committed to learning.",
      inputSchema: z.object({
        name: z.string().describe("Interest name"),
        domainId: z.string().describe("Domain ID, slug, or name"),
        description: z.string().optional().describe("Why you're interested"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) throw new Error("No profile found.");
      const domainId = resolveDomainId(profile, input.domainId);
      const result = await application.addInterest(deps, { ...input, domainId });
      return ok(`Added interest: ${result.interest.name}`);
    },
  );

  server.registerTool(
    "dossier_mark_used",
    {
      title: "Mark Skill Used",
      description: "Record that a skill was used recently. Updates the skill's usage freshness.",
      inputSchema: z.object({
        skillId: z.string().describe("Skill ID to mark as used"),
        context: z.string().optional().describe("Usage context (e.g. 'work project', 'side project')"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.updateSkill(deps, {
        skillId: input.skillId,
        addUsage: [{
          context: input.context ?? "Used",
          lastUsed: new Date(),
        }],
      });
      return ok(`Marked as used: ${result.skill.name}`);
    },
  );

  server.registerTool(
    "dossier_add_domain",
    {
      title: "Add Custom Domain",
      description: "Add a new custom knowledge domain (e.g. 'Music', 'Design'). Domains organize skills and goals into broad fields.",
      inputSchema: z.object({
        name: z.string().describe("Domain name (e.g. 'Music', 'Design', 'Data Science')"),
        description: z.string().optional().describe("Brief description of the domain"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) throw new Error("No profile found.");

      const id = toDomainId(deps.idGenerator.generate("domain"));
      const slug = application.slugify(input.name);
      const domain = createDomain({ id, slug, name: input.name, description: input.description });
      const updated = addDomainToProfile(profile, domain);
      await deps.profileRepository.save(updated);
      return ok(`Added domain: ${domain.name} (id: ${domain.id}, slug: ${domain.slug})`);
    },
  );

  server.registerTool(
    "dossier_add_category",
    {
      title: "Add Category to Domain",
      description: "Add a new category to an existing domain (e.g. add 'instrument' to 'Music'). Categories classify skills within a domain.",
      inputSchema: z.object({
        domainId: z.string().describe("Domain ID, slug, or name"),
        name: z.string().describe("Category name (e.g. 'Instrument', 'Genre', 'Cloud Service')"),
        description: z.string().optional().describe("Brief description of the category"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const profile = await deps.profileRepository.load();
      if (!profile) throw new Error("No profile found.");

      const domainId = resolveDomainId(profile, input.domainId);
      const domain = findDomainInProfile(profile, domainId);
      const categoryId = toCategoryId(deps.idGenerator.generate("category"));
      const slug = application.slugify(input.name);
      const category = createCategory({ id: categoryId, slug, name: input.name, description: input.description });
      const updatedDomain = addCategoryToDomain(domain, category);

      const updatedProfile = {
        ...profile,
        domains: profile.domains.map((d) => d.id === domainId ? updatedDomain : d),
        updatedAt: new Date(),
      };
      await deps.profileRepository.save(updatedProfile);
      return ok(`Added category: ${category.name} (id: ${categoryId}, slug: ${category.slug}) to domain ${domain.name}`);
    },
  );

  server.registerTool(
    "dossier_export",
    {
      title: "Export Profile",
      description: "Export the profile in a specified format (json, markdown, text, claude).",
      inputSchema: z.object({
        format: z.enum(["json", "markdown", "text", "claude"]).describe("Export format"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const exporter = infrastructure.createExporter(input.format);
      const result = await application.exportProfile(
        { profileRepository: deps.profileRepository, exporter },
      );
      return { content: [{ type: "text", text: result.content }] };
    },
  );
}

function ok(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }] };
}

/**
 * Resolve a domain by ID or slug. Accepts either the full internal ID
 * (e.g. "domain-7607c507-...") or the human-friendly slug (e.g. "hobbies").
 */
function resolveDomainId(profile: import("@dossier/core").Profile, idOrSlug: string): import("@dossier/core").DomainId {
  // Try exact ID match first
  const byId = profile.domains.find((d) => d.id === idOrSlug);
  if (byId) return byId.id;

  // Fall back to slug match
  const bySlug = profile.domains.find((d) => d.slug === idOrSlug);
  if (bySlug) return bySlug.id;

  // Fall back to case-insensitive name match
  const lower = idOrSlug.toLowerCase();
  const byName = profile.domains.find((d) => d.name.toLowerCase() === lower);
  if (byName) return byName.id;

  throw new Error(`Domain not found: "${idOrSlug}". Use dossier://domains resource to see available domains.`);
}

/**
 * Resolve a category by ID or slug within a domain.
 */
function resolveCategoryId(domain: import("@dossier/core").Domain, idOrSlug: string): import("@dossier/core").CategoryId {
  const byId = domain.categories.find((c) => c.id === idOrSlug);
  if (byId) return byId.id;

  const bySlug = domain.categories.find((c) => c.slug === idOrSlug);
  if (bySlug) return bySlug.id;

  const lower = idOrSlug.toLowerCase();
  const byName = domain.categories.find((c) => c.name.toLowerCase() === lower);
  if (byName) return byName.id;

  throw new Error(`Category not found: "${idOrSlug}" in domain "${domain.name}". Available: ${domain.categories.map((c) => c.slug).join(", ")}`);
}
