import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PROFICIENCY_LEVELS, application } from "@dossier/core";

import type { DossierOperations } from "./operations.js";
import { log } from "./logger.js";

export function registerTools(server: McpServer, ops: DossierOperations): void {
  server.registerTool(
    "dossier_search",
    {
      title: "Search Profile",
      description:
        "Search across all entity types (skills, goals, interests, projects) by partial name match. " +
        "Use this to check for duplicates before adding items, or to discover existing entries. " +
        "Returns results grouped by type with IDs for follow-up operations.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Search term (case-insensitive substring match)"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.searchProfile({ query: input.query });
      if (result.total === 0) {
        return ok(`No matches found for "${input.query}".`);
      }
      const sections: string[] = [];
      sections.push(`Found ${result.total} match${result.total === 1 ? "" : "es"} for "${input.query}":`);
      if (result.results.skills.length > 0) {
        sections.push("\nSkills:");
        for (const s of result.results.skills) {
          sections.push(`  - ${s.name} (${s.meta}) [id: ${s.id}]`);
        }
      }
      if (result.results.goals.length > 0) {
        sections.push("\nGoals:");
        for (const g of result.results.goals) {
          sections.push(`  - ${g.name} (${g.meta}) [id: ${g.id}]`);
        }
      }
      if (result.results.interests.length > 0) {
        sections.push("\nInterests:");
        for (const i of result.results.interests) {
          sections.push(`  - ${i.name} [id: ${i.id}]`);
        }
      }
      if (result.results.projects.length > 0) {
        sections.push("\nProjects:");
        for (const p of result.results.projects) {
          sections.push(`  - ${p.name} (${p.meta}) [id: ${p.id}]`);
        }
      }
      return ok(sections.join("\n"));
    }),
  );

  server.registerTool(
    "dossier_add_skill",
    {
      title: "Add Skill",
      description: "Add a new skill to the profile. Requires name, domainId, categoryId, and proficiency level. Before adding, use dossier_search to check if a similar skill already exists. After adding, consider linking the skill to relevant projects using dossier_update_project with skillIds.",
      inputSchema: z.object({
        name: z.string().describe("Skill name (e.g. 'TypeScript', 'Swedish')"),
        description: z.string().optional().describe("Brief description of this skill"),
        domainId: z.string().describe("Domain ID, slug, or name (e.g. 'software-development' or 'Software Development')"),
        categoryId: z.string().describe("Category ID, slug, or name (e.g. 'languages' or 'Programming Languages')"),
        proficiency: z.enum(PROFICIENCY_LEVELS).describe("Proficiency level"),
        notes: z.string().optional().describe("Optional notes about this skill"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
      }),
    },
    withErrorHandler(async (input) => {
      const { domainId, categoryId } = await resolveIds(ops, input.domainId, input.categoryId);
      const result = await ops.addSkill({ ...input, domainId, categoryId });
      return ok(`Added skill: ${result.skill.name} (${result.skill.proficiency})`);
    }),
  );

  server.registerTool(
    "dossier_list_skills",
    {
      title: "List Skills",
      description: "List skills with optional filters. Returns skill names, proficiency levels, domain, and category.",
      inputSchema: z.object({
        domainId: z.string().optional().describe("Filter by domain ID, slug, or name"),
        categoryId: z.string().optional().describe("Filter by category ID"),
        proficiency: z.enum(PROFICIENCY_LEVELS).optional().describe("Filter by proficiency level"),
      }),
    },
    withErrorHandler(async (input) => {
      let resolvedDomainId: string | undefined;
      if (input.domainId) {
        const profile = await ops.getProfile();
        if (profile) {
          const domain = application.resolveDomainInProfile(profile, input.domainId);
          resolvedDomainId = domain.id;
        }
      }
      const result = await ops.listSkills({ ...input, domainId: resolvedDomainId });
      if (result.skills.length === 0) {
        return ok("No skills found matching the filters.");
      }
      const domains = await ops.getDomains();
      const domainNames = new Map(domains.map((d) => [d.id, d.name]));
      const categoryNames = new Map(domains.flatMap((d) => d.categories.map((c) => [c.id, c.name])));
      const lines = result.skills.map((s) => {
        const domain = domainNames.get(s.domainId) ?? s.domainId;
        const category = categoryNames.get(s.categoryId) ?? s.categoryId;
        return `- ${s.name} (${s.proficiency}) [${domain} > ${category}]`;
      });
      return ok(lines.join("\n"));
    }),
  );

  server.registerTool(
    "dossier_update_skill",
    {
      title: "Update Skill",
      description: "Update an existing skill's proficiency, description, notes, or name. Use visibility 'private' to hide from exports, or featured=true to highlight in exports.",
      inputSchema: z.object({
        skillId: z.string().describe("Skill ID to update"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("Updated description"),
        domainId: z.string().optional().describe("Move to domain (ID, slug, or name)"),
        categoryId: z.string().optional().describe("Move to category (ID, slug, or name)"),
        proficiency: z.enum(PROFICIENCY_LEVELS).optional().describe("New proficiency level"),
        notes: z.string().optional().describe("Updated notes"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.updateSkill(input);
      return ok(`Updated skill: ${result.skill.name} (${result.skill.proficiency})`);
    }),
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
    withErrorHandler(async (input) => {
      await ops.removeSkill(input);
      return ok("Skill removed.");
    }),
  );

  server.registerTool(
    "dossier_add_goal",
    {
      title: "Add Learning Goal",
      description: "Add a new learning goal to the profile. Before adding, use dossier_search to check if a similar goal or interest already exists — consider promoting an existing interest instead of creating a duplicate.",
      inputSchema: z.object({
        name: z.string().describe("Goal name (e.g. 'Learn Rust')"),
        domainId: z.string().describe("Domain ID, slug, or name"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Priority level (default: medium)"),
        description: z.string().optional().describe("Goal description or motivation"),
        notes: z.string().optional().describe("Internal notes (not exported)"),
        targetDate: z.string().optional().describe("Target date in ISO format (e.g. '2026-12-31')"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = application.resolveDomainInProfile(profile, input.domainId);
      const result = await ops.addGoal({ ...input, domainId: domain.id });
      return ok(`Added goal: ${result.goal.name} (${result.goal.priority} priority)`);
    }),
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
    withErrorHandler(async (input) => {
      const result = await ops.listGoals(input);
      if (result.goals.length === 0) {
        return ok("No goals found matching the filter.");
      }
      const lines = result.goals.map((g) =>
        `- ${g.name} (${g.status}, ${g.priority} priority)`,
      );
      return ok(lines.join("\n"));
    }),
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
    withErrorHandler(async (input) => {
      const result = await ops.updateGoalProgress(input);
      const latest = result.goal.progress[result.goal.progress.length - 1];
      return ok(`Updated goal: ${result.goal.name} → ${latest?.percentage ?? input.percentage}%`);
    }),
  );

  server.registerTool(
    "dossier_complete_goal",
    {
      title: "Complete Goal",
      description: "Mark a learning goal as completed and create a corresponding skill.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID to complete"),
        categoryId: z.string().describe("Category ID, slug, or name for the new skill"),
        proficiency: z.enum(PROFICIENCY_LEVELS).optional().describe("Initial proficiency (default: novice)"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const goal = profile.goals.find((g) => g.id === input.goalId);
      if (!goal) throw new Error(`Goal not found: ${input.goalId}`);
      const domain = profile.domains.find((d) => d.id === goal.domainId);
      if (!domain) throw new Error("Domain not found for goal");
      const category = application.resolveCategoryInDomain(domain, input.categoryId);
      const result = await ops.completeGoal({ ...input, categoryId: category.id });
      return ok(`Completed goal: ${result.goal.name}. Created skill: ${result.skill.name} (${result.skill.proficiency})`);
    }),
  );

  server.registerTool(
    "dossier_add_interest",
    {
      title: "Add Interest",
      description: "Add a topic of interest — something you're curious about but haven't committed to learning. Before adding, use dossier_search to check if a skill or goal already covers this topic.",
      inputSchema: z.object({
        name: z.string().describe("Interest name"),
        domainId: z.string().describe("Domain ID, slug, or name"),
        description: z.string().optional().describe("Why you're interested"),
        notes: z.string().optional().describe("Internal notes (not exported)"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = application.resolveDomainInProfile(profile, input.domainId);
      const result = await ops.addInterest({ ...input, domainId: domain.id });
      return ok(`Added interest: ${result.interest.name}`);
    }),
  );

  server.registerTool(
    "dossier_mark_used",
    {
      title: "Mark Skill Used",
      description: "Record that a skill was used recently.",
      inputSchema: z.object({
        skillId: z.string().describe("Skill ID to mark as used"),
        context: z.string().optional().describe("Usage context (e.g. 'work project')"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.updateSkill({
        skillId: input.skillId,
        addUsage: [{ context: input.context ?? "Used", lastUsed: new Date() }],
      });
      return ok(`Marked as used: ${result.skill.name}`);
    }),
  );

  server.registerTool(
    "dossier_add_domain",
    {
      title: "Add Custom Domain",
      description: "Add a new custom knowledge domain (e.g. 'Music', 'Design').",
      inputSchema: z.object({
        name: z.string().describe("Domain name"),
        description: z.string().optional().describe("Brief description"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.addDomain(input);
      return ok(`Added domain: ${result.domain.name} (id: ${result.domain.id}, slug: ${result.domain.slug})`);
    }),
  );

  server.registerTool(
    "dossier_add_category",
    {
      title: "Add Category to Domain",
      description: "Add a new category to an existing domain.",
      inputSchema: z.object({
        domainId: z.string().describe("Domain ID, slug, or name"),
        name: z.string().describe("Category name"),
        description: z.string().optional().describe("Brief description"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = application.resolveDomainInProfile(profile, input.domainId);
      const result = await ops.addCategory({ ...input, domainId: domain.id });
      return ok(`Added category: ${result.category.name} (id: ${result.category.id}) to domain ${domain.name}`);
    }),
  );

  server.registerTool(
    "dossier_add_project",
    {
      title: "Add Project",
      description: "Add a project to the profile — something you're working on or have worked on. After adding, link relevant skills by updating the project with dossier_update_project and providing skillIds. Use dossier_search or dossier_list_skills to find skill IDs.",
      inputSchema: z.object({
        name: z.string().describe("Project name"),
        description: z.string().optional().describe("Brief description"),
        url: z.string().optional().describe("Project URL (repository, website, etc.)"),
        role: z.string().optional().describe("Your role in the project"),
        status: z.enum(["active", "completed", "paused", "ideation"]).optional().describe("Project status (default: active)"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Project priority (default: medium)"),
        featured: z.boolean().optional().describe("Whether this is a featured/showcase project"),
        skillIds: z.array(z.string()).optional().describe("IDs of skills used in this project"),
        highlights: z.array(z.string()).optional().describe("Key achievements or highlights"),
        notes: z.string().optional().describe("Internal notes about this project"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.addProject(input);
      return ok(`Added project: ${result.project.name} (${result.project.status})`);
    }),
  );

  server.registerTool(
    "dossier_list_projects",
    {
      title: "List Projects",
      description: "List projects with optional filters by status or featured flag.",
      inputSchema: z.object({
        status: z.enum(["active", "completed", "paused", "ideation"]).optional().describe("Filter by project status"),
        featured: z.boolean().optional().describe("Filter by featured flag"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.listProjects(input);
      if (result.projects.length === 0) {
        return ok("No projects found matching the filters.");
      }
      const lines = result.projects.map((p) => {
        let line = `- ${p.name} (${p.status}, ${p.priority} priority)`;
        if (p.featured) line += " ★";
        if (p.description) line += ` — ${p.description}`;
        return line;
      });
      return ok(lines.join("\n"));
    }),
  );

  server.registerTool(
    "dossier_update_project",
    {
      title: "Update Project",
      description: "Update an existing project's details. Use skillIds to link skills to this project — find skill IDs with dossier_search or dossier_list_skills.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID to update"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("Updated description"),
        url: z.string().optional().describe("Updated URL"),
        role: z.string().optional().describe("Updated role"),
        status: z.enum(["active", "completed", "paused", "ideation"]).optional().describe("New status"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("New priority"),
        featured: z.boolean().optional().describe("Set featured flag"),
        skillIds: z.array(z.string()).optional().describe("Updated skill IDs"),
        highlights: z.array(z.string()).optional().describe("Updated highlights"),
        notes: z.string().optional().describe("Updated notes"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.updateProject(input);
      return ok(`Updated project: ${result.project.name} (${result.project.status})`);
    }),
  );

  server.registerTool(
    "dossier_remove_project",
    {
      title: "Remove Project",
      description: "Remove a project from the profile.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID to remove"),
      }),
    },
    withErrorHandler(async (input) => {
      await ops.removeProject(input);
      return ok("Project removed.");
    }),
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
    withErrorHandler(async (input) => {
      const content = await ops.exportProfile(input.format);
      return { content: [{ type: "text", text: content }] };
    }),
  );
}

function ok(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }] };
}

function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

type ToolHandler<T> = (input: T) => Promise<CallToolResult>;

function withErrorHandler<T>(handler: ToolHandler<T>): ToolHandler<T> {
  return async (input: T): Promise<CallToolResult> => {
    try {
      return await handler(input);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Tool error: ${message}`);
      return fail(message);
    }
  };
}

async function resolveIds(
  ops: DossierOperations,
  domainIdOrSlug: string,
  categoryIdOrSlug: string,
): Promise<{ domainId: string; categoryId: string }> {
  const profile = await ops.getProfile();
  if (!profile) throw new Error("No profile found.");
  const domain = application.resolveDomainInProfile(profile, domainIdOrSlug);
  const category = application.resolveCategoryInDomain(domain, categoryIdOrSlug);
  return { domainId: domain.id, categoryId: category.id };
}
