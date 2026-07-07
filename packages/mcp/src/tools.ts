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
        "Pass a single `query` or an array of `queries` for batched lookups in one call (useful before bulk-linking skills to a project). " +
        "Returns results grouped by type with IDs for follow-up operations.",
      inputSchema: z.object({
        query: z.string().min(1).optional().describe("Single search term (case-insensitive substring match)"),
        queries: z.array(z.string().min(1)).optional().describe("Batch search terms — results are grouped by query"),
      }),
    },
    withErrorHandler(async (input) => {
      const terms = input.queries ?? (input.query ? [input.query] : []);
      if (terms.length === 0) {
        throw new Error("Provide `query` or `queries`.");
      }

      if (terms.length === 1) {
        const term = terms[0]!;
        const result = await ops.searchProfile({ query: term });
        return ok(renderSearchResult(term, result));
      }

      const results = await Promise.all(terms.map((t) => ops.searchProfile({ query: t })));
      const sections = terms.map((t, i) => renderSearchResult(t, results[i]!));
      return ok(sections.join("\n\n---\n\n"));
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
        proficiencyLabel: z.string().optional().describe("Custom proficiency display label (e.g. 'native', 'CEFR B2') — overrides domain default"),
        notes: z.string().optional().describe("Optional notes about this skill"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
        privateFields: z.array(z.enum(["proficiency", "proficiencyLabel"])).optional().describe("Field names to hide from public output even when the skill itself is public. Allowed: 'proficiency', 'proficiencyLabel'."),
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
      const domainMap = new Map<string, (typeof domains)[number]>(domains.map((d) => [d.id, d]));
      const categoryNames = new Map<string, string>(domains.flatMap((d) => d.categories.map((c) => [c.id, c.name] as const)));
      const privateDomainIds = new Set<string>(domains.filter((d) => d.visibility === "private").map((d) => d.id));
      const lines = result.skills.map((s) => {
        const dom = domainMap.get(s.domainId);
        const domainName = dom?.name ?? s.domainId;
        const category = categoryNames.get(s.categoryId) ?? s.categoryId;
        const labels = dom?.proficiencyLabels as Record<string, string> | undefined;
        const displayProf = s.proficiencyLabel ?? labels?.[s.proficiency] ?? s.proficiency;
        let line = `- ${s.name} (${displayProf}) [${domainName} > ${category}] [id: ${s.id}]`;
        if (privateDomainIds.has(s.domainId)) line += " (hidden by domain)";
        return line;
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
        proficiencyLabel: z.string().optional().describe("Custom proficiency display label (overrides domain default)"),
        notes: z.string().optional().describe("Updated notes"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
        privateFields: z.array(z.enum(["proficiency", "proficiencyLabel"])).optional().describe("Field names to hide from public output even when the skill itself is public. Replaces the current list; pass [] to clear."),
      }),
    },
    withErrorHandler(async (input) => {
      let resolvedInput = { ...input };
      if (input.domainId || input.categoryId) {
        const profile = await ops.getProfile();
        if (!profile) throw new Error("No profile found.");
        if (input.domainId) {
          const domain = application.resolveDomainInProfile(profile, input.domainId);
          resolvedInput = { ...resolvedInput, domainId: domain.id };
          if (input.categoryId) {
            const category = application.resolveCategoryInDomain(domain, input.categoryId);
            resolvedInput = { ...resolvedInput, categoryId: category.id };
          }
        }
      }
      const result = await ops.updateSkill(resolvedInput);
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
        status: z.enum(["active", "paused", "completed", "abandoned"]).optional().describe("Initial status (default: active)"),
        description: z.string().optional().describe("What this goal is — the objective, separate from the motivation"),
        motivation: z.string().optional().describe("Why pursuing this goal matters — exported alongside description"),
        notes: z.string().optional().describe("Internal notes (not exported)"),
        targetDate: z.string().optional().describe("Target date in ISO format (e.g. '2026-12-31')"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
        privateFields: z.array(z.enum(["motivation", "priority", "status", "targetDate", "progress", "resources"])).optional().describe("Field names to hide from public output even when the goal is public. 'progress' is private by default if omitted. Allowed: 'motivation', 'priority', 'status', 'targetDate', 'progress', 'resources'."),
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
      const domains = await ops.getDomains();
      const privateDomainIds = new Set<string>(domains.filter((d) => d.visibility === "private").map((d) => d.id));
      const lines = result.goals.map((g) => {
        let line = `- ${g.name} (${g.status}, ${g.priority} priority) [id: ${g.id}]`;
        if (privateDomainIds.has(g.domainId)) line += " (hidden by domain)";
        return line;
      });
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
    "dossier_demote_goal",
    {
      title: "Demote Goal to Interest",
      description:
        "Demote a learning goal back to an interest — removes the goal and creates an interest with the same name, domain, description, and notes. " +
        "Use when the user decides they're no longer actively committed to learning something but still want to track the topic. " +
        "Priority, status, progress, resources, motivation, and targetDate are discarded (interests don't have these fields). " +
        "Use dossier_search to find the goal ID first.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID to demote"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.demoteGoal(input);
      return ok(`Demoted goal to interest: ${result.interest.name}`);
    }),
  );

  server.registerTool(
    "dossier_edit_goal",
    {
      title: "Edit Goal",
      description:
        "Edit a learning goal's details — name, description, motivation, notes, priority, status, target date, visibility, or featured flag. " +
        "Use dossier_search to find the goal ID first. For updating progress percentage, use dossier_update_goal instead.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID to edit"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("Updated description — the objective"),
        motivation: z.string().optional().describe("Updated motivation — why this matters"),
        notes: z.string().optional().describe("Updated notes"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("New priority level"),
        status: z.enum(["active", "paused", "completed", "abandoned"]).optional().describe("New status"),
        targetDate: z.string().optional().describe("Target date in ISO format (e.g. '2026-12-31'); empty string clears"),
        privateFields: z.array(z.enum(["motivation", "priority", "status", "targetDate", "progress", "resources"])).optional().describe("Field names to hide from public output. Replaces the current list. Pass [] to publish all fields."),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
      }),
    },
    withErrorHandler(async (input) => {
      const normalized = input.targetDate === ""
        ? { ...input, targetDate: null }
        : input;
      const result = await ops.updateGoal(normalized);
      return ok(`Updated goal: ${result.goal.name} (${result.goal.status}, ${result.goal.priority} priority)`);
    }),
  );

  server.registerTool(
    "dossier_remove_goal",
    {
      title: "Remove Goal",
      description: "Remove a learning goal from the profile. Use dossier_search to find the goal ID first.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID to remove"),
      }),
    },
    withErrorHandler(async (input) => {
      await ops.removeGoal(input);
      return ok("Goal removed.");
    }),
  );

  // --- Resources (on goals) ---

  const RESOURCE_TYPE_ENUM = ["article", "video", "course", "book", "documentation", "other"] as const;

  server.registerTool(
    "dossier_add_resource",
    {
      title: "Add Resource to Goal",
      description:
        "Attach a learning resource (article, video, course, book, etc.) to an existing learning goal. " +
        "Use dossier_search to find the goal ID first. Returns the created resource with a stable ID you can use to update or remove it later.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID this resource belongs to"),
        title: z.string().describe("Resource title (e.g. 'The Rust Book')"),
        url: z.string().optional().describe("Link to the resource (e.g. 'https://doc.rust-lang.org/book/')"),
        type: z.enum(RESOURCE_TYPE_ENUM).describe("Resource format"),
        completed: z.boolean().optional().describe("Whether the user has finished this resource (default: false)"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.addResource(input);
      return ok(`Added resource '${result.resource.title}' to goal '${result.goal.name}' (id: ${result.resource.id})`);
    }),
  );

  server.registerTool(
    "dossier_update_resource",
    {
      title: "Update Resource",
      description:
        "Update a resource on a learning goal — change title, URL, type, or toggle the completed flag. " +
        "Pass only the fields you want to change. Useful for marking a resource as completed: pass `completed: true`.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID this resource belongs to"),
        resourceId: z.string().describe("Resource ID to update"),
        title: z.string().optional().describe("New title"),
        url: z.string().optional().describe("New URL (pass empty string to clear)"),
        type: z.enum(RESOURCE_TYPE_ENUM).optional().describe("New type"),
        completed: z.boolean().optional().describe("Mark completed or not"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.updateResource(input);
      return ok(`Updated resource '${result.resource.title}' on goal '${result.goal.name}' (completed: ${result.resource.completed})`);
    }),
  );

  server.registerTool(
    "dossier_remove_resource",
    {
      title: "Remove Resource",
      description: "Remove a resource from a learning goal. Use dossier_search and the goal's resources list to find the resource ID first.",
      inputSchema: z.object({
        goalId: z.string().describe("Goal ID this resource belongs to"),
        resourceId: z.string().describe("Resource ID to remove"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.removeResource(input);
      return ok(`Removed resource from goal '${result.goal.name}'`);
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
    "dossier_list_interests",
    {
      title: "List Interests",
      description: "List all interests in the profile.",
      inputSchema: z.object({}),
    },
    withErrorHandler(async () => {
      const result = await ops.listInterests();
      if (result.interests.length === 0) {
        return ok("No interests found.");
      }
      const domains = await ops.getDomains();
      const privateDomainIds = new Set<string>(domains.filter((d) => d.visibility === "private").map((d) => d.id));
      const lines = result.interests.map((i) => {
        let line = `- ${i.name} [id: ${i.id}]`;
        if (i.featured) line += " ★";
        if (i.description) line += ` — ${i.description}`;
        if (i.domainId && privateDomainIds.has(i.domainId)) line += " (hidden by domain)";
        return line;
      });
      return ok(lines.join("\n"));
    }),
  );

  server.registerTool(
    "dossier_update_interest",
    {
      title: "Update Interest",
      description:
        "Update an interest's name, description, notes, visibility, or featured flag. " +
        "Use dossier_search to find the interest ID first.",
      inputSchema: z.object({
        interestId: z.string().describe("Interest ID to update"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("Updated description"),
        notes: z.string().optional().describe("Updated notes"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility"),
        featured: z.boolean().optional().describe("Mark as featured/showcase item"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.updateInterest(input);
      return ok(`Updated interest: ${result.interest.name}`);
    }),
  );

  server.registerTool(
    "dossier_remove_interest",
    {
      title: "Remove Interest",
      description: "Remove an interest from the profile. Use dossier_search to find the interest ID first.",
      inputSchema: z.object({
        interestId: z.string().describe("Interest ID to remove"),
      }),
    },
    withErrorHandler(async (input) => {
      await ops.removeInterest(input);
      return ok("Interest removed.");
    }),
  );

  server.registerTool(
    "dossier_promote_interest",
    {
      title: "Promote Interest to Goal",
      description:
        "Promote an interest to a learning goal — removes the interest and creates a new goal with the same name and description. " +
        "Use dossier_search to find the interest ID first.",
      inputSchema: z.object({
        interestId: z.string().describe("Interest ID to promote"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Goal priority (default: medium)"),
        description: z.string().optional().describe("Override description for the new goal"),
        targetDate: z.string().optional().describe("Target date in ISO format (e.g. '2026-12-31')"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.promoteInterest(input);
      return ok(`Promoted interest to goal: ${result.goal.name} (${result.goal.priority} priority)`);
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
        visibility: z.enum(["public", "private"]).optional().describe("Domain visibility (default: public)"),
        proficiencyLabels: z.record(z.string(), z.string()).optional().describe("Custom proficiency labels (e.g. {expert: 'native', advanced: 'fluent'})"),
      }),
    },
    withErrorHandler(async (input) => {
      const result = await ops.addDomain(input);
      return ok(`Added domain: ${result.domain.name} (id: ${result.domain.id}, slug: ${result.domain.slug})`);
    }),
  );

  server.registerTool(
    "dossier_update_domain",
    {
      title: "Update Domain",
      description: "Update a domain's name, description, or visibility. Setting visibility to 'private' hides all entities in this domain from exports.",
      inputSchema: z.object({
        domainId: z.string().describe("Domain ID, slug, or name"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("Updated description"),
        visibility: z.enum(["public", "private"]).optional().describe("Domain visibility — private hides all child entities from exports"),
        proficiencyLabels: z.record(z.string(), z.string()).optional().describe("Custom proficiency labels (e.g. {expert: 'native', advanced: 'fluent'})"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = application.resolveDomainInProfile(profile, input.domainId);
      const result = await ops.updateDomain({ ...input, domainId: domain.id });
      return ok(`Updated domain: ${result.domain.name} (visibility: ${result.domain.visibility})`);
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
    "dossier_remove_domain",
    {
      title: "Remove Domain",
      description:
        "Remove a custom domain from the profile. This will also remove all categories within the domain. " +
        "Skills and goals referencing this domain will become orphaned. Use with caution.",
      inputSchema: z.object({
        domainId: z.string().describe("Domain ID, slug, or name to remove"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = application.resolveDomainInProfile(profile, input.domainId);
      await ops.removeDomain({ domainId: domain.id });
      return ok(`Removed domain: ${domain.name}`);
    }),
  );

  server.registerTool(
    "dossier_remove_category",
    {
      title: "Remove Category",
      description:
        "Remove a category from a domain. Skills referencing this category will become orphaned. Use with caution.",
      inputSchema: z.object({
        domainId: z.string().describe("Domain ID, slug, or name"),
        categoryId: z.string().describe("Category ID, slug, or name to remove"),
      }),
    },
    withErrorHandler(async (input) => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = application.resolveDomainInProfile(profile, input.domainId);
      const category = application.resolveCategoryInDomain(domain, input.categoryId);
      await ops.removeCategory({ domainId: domain.id, categoryId: category.id });
      return ok(`Removed category: ${category.name} from domain ${domain.name}`);
    }),
  );

  server.registerTool(
    "dossier_add_project",
    {
      title: "Add Project",
      description: "Add a project to the profile — something you're working on or have worked on. Pass skillNames to auto-resolve skills by name (exact match), or skillIds if you already have them. Both can be combined.",
      inputSchema: z.object({
        name: z.string().describe("Project name"),
        description: z.string().optional().describe("Brief description"),
        url: z.string().optional().describe("Project URL (repository, website, etc.)"),
        role: z.string().optional().describe("Your role in the project"),
        status: z.enum(["active", "completed", "paused", "ideation"]).optional().describe("Project status (default: active)"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Project priority (optional — omit for no priority)"),
        featured: z.boolean().optional().describe("Whether this is a featured/showcase project"),
        skillIds: z.array(z.string()).optional().describe("IDs of skills used in this project"),
        skillNames: z.array(z.string()).optional().describe("Skill names to resolve to IDs (case-insensitive exact match). Merged with skillIds."),
        highlights: z.array(z.string()).optional().describe("Key achievements or highlights"),
        notes: z.string().optional().describe("Internal notes about this project"),
        startDate: z.string().optional().describe("Start date in ISO format (e.g. '2026-03-01')"),
        endDate: z.string().optional().describe("End date in ISO format (e.g. '2026-09-30')"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        privateFields: z.array(z.enum(["url", "role", "startDate", "endDate", "highlights", "status"])).optional().describe("Field names to hide from public output even when the project is public. Most common: ['url'] for a project with a private repository link. Allowed: 'url', 'role', 'startDate', 'endDate', 'highlights', 'status'."),
      }),
    },
    withErrorHandler(async (input) => {
      const { skillNames, ...rest } = input;
      const skillIds = await mergeSkillIds(ops, rest.skillIds, skillNames);
      const result = await ops.addProject({ ...rest, skillIds });
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
        let line = `- ${p.name} (${p.status}${p.priority ? `, ${p.priority} priority` : ""}) [id: ${p.id}]`;
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
      description: "Update an existing project's details. Pass skillNames to auto-resolve by name, or skillIds if already known. Both can be combined — they merge into the final skill list (replacing the project's current skills).",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID to update"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("Updated description"),
        url: z.string().optional().describe("Updated URL"),
        role: z.string().optional().describe("Updated role"),
        status: z.enum(["active", "completed", "paused", "ideation"]).optional().describe("New status"),
        priority: z.enum(["low", "medium", "high", "none"]).optional().describe("New priority. Pass \"none\" to clear it."),
        featured: z.boolean().optional().describe("Set featured flag"),
        skillIds: z.array(z.string()).optional().describe("Updated skill IDs (replaces current list)"),
        skillNames: z.array(z.string()).optional().describe("Skill names to resolve to IDs (case-insensitive exact match). Merged with skillIds, replaces current list."),
        highlights: z.array(z.string()).optional().describe("Updated highlights"),
        notes: z.string().optional().describe("Updated notes"),
        startDate: z.string().optional().describe("Start date in ISO format"),
        endDate: z.string().optional().describe("End date in ISO format"),
        visibility: z.enum(["public", "private"]).optional().describe("Visibility (default: public)"),
        privateFields: z.array(z.enum(["url", "role", "startDate", "endDate", "highlights", "status"])).optional().describe("Field names to hide from public output. Replaces the current list. Pass [] to publish all fields."),
      }),
    },
    withErrorHandler(async (input) => {
      const { skillNames, ...rest } = input;
      const skillIds = (rest.skillIds !== undefined || skillNames !== undefined)
        ? await mergeSkillIds(ops, rest.skillIds, skillNames)
        : undefined;
      const result = await ops.updateProject({
        ...rest,
        ...(rest.priority !== undefined && { priority: rest.priority === "none" ? null : rest.priority }),
        ...(skillIds !== undefined && { skillIds }),
      });
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
    "dossier_submit_feedback",
    {
      title: "Submit Feedback on Dossier",
      description:
        "Submit feedback about Dossier itself — bugs, friction points, missing features encountered while using the MCP. " +
        "\n\n**CONSENT & PRIVACY MODEL:**" +
        "\n- This channel is **off by default** on every Dossier instance. It requires the operator to have set `DOSSIER_FEEDBACK_ENABLED=true`." +
        "\n- It also requires the authenticated user to have explicitly opted in via their Dossier settings. If they haven't, this call will return 403 — do not retry, just relay the error to the user." +
        "\n- Feedback is visible to the Dossier instance operator (admin), who may forward it to public GitHub Issues. **Do not include the user's skill names, goal contents, project details, notes, or any personal profile data in the message or reproduction fields.** Describe the interaction/friction abstractly." +
        "\n\n**USAGE RULES:**" +
        "\n- Always show the full draft to the user and get explicit confirmation before calling. `confirmed: true` represents that approval." +
        "\n- Only submit concrete, actionable observations — not generic praise or vague impressions." +
        "\n- Requires API mode; local/file mode errors.",
      inputSchema: z.object({
        category: z.enum(["bug", "friction", "suggestion", "missing-feature", "other"]).describe("What kind of feedback this is"),
        severity: z.enum(["low", "medium", "high", "critical"]).optional().describe("How much this impacts usage (default: medium)"),
        message: z.string().min(5).describe("Concrete observation or issue — what happened, what was expected, why it matters. Do not include user's personal profile data."),
        reproduction: z.string().optional().describe("Steps to reproduce, or the sequence of tool calls that led to the issue. Do not include personal profile data."),
        confirmed: z.literal(true).describe("Must be `true`. Represents explicit user approval to submit this feedback."),
      }),
    },
    withErrorHandler(async (input) => {
      try {
        const result = await ops.submitFeedback(input);
        return ok(
          `Feedback submitted (id: ${result.id}, status: ${result.status}). ` +
          `The operator of this Dossier instance will review it.`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Translate common API statuses into clearer guidance for the agent + user.
        if (/\b503\b/.test(msg)) {
          return fail(
            "Feedback submission is disabled on this Dossier instance. The operator has not enabled DOSSIER_FEEDBACK_ENABLED. " +
            "Report the issue another way (e.g., the project's GitHub repo).",
          );
        }
        if (/\b403\b/.test(msg)) {
          return fail(
            "The authenticated user has not opted in to feedback submission. " +
            "Ask them to enable it under Dossier → Settings → Feedback & Telemetry if they want to participate, then retry.",
          );
        }
        if (/\b401\b/.test(msg)) {
          return fail(
            "Feedback submission requires an authenticated user. The MCP must connect with a valid API key tied to a real user account.",
          );
        }
        throw err;
      }
    }),
  );

  server.registerTool(
    "dossier_export",
    {
      title: "Export Profile",
      description: "Export the profile in a specified format (json, markdown, text, claude).",
      inputSchema: z.object({
        format: z.enum(["json", "markdown", "text", "llm-md"]).describe("Export format. `llm-md` is markdown structured for LLM/AI context consumption (preferred for piping into agent sessions)."),
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

function renderSearchResult(query: string, result: application.SearchProfileOutput): string {
  if (result.total === 0) {
    return `No matches found for "${query}".`;
  }
  const sections: string[] = [];
  sections.push(`Found ${result.total} match${result.total === 1 ? "" : "es"} for "${query}":`);
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
  return sections.join("\n");
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

async function mergeSkillIds(
  ops: DossierOperations,
  skillIds: readonly string[] | undefined,
  skillNames: readonly string[] | undefined,
): Promise<string[] | undefined> {
  if (skillIds === undefined && skillNames === undefined) return undefined;
  const ids = new Set<string>(skillIds ?? []);
  if (skillNames && skillNames.length > 0) {
    const profile = await ops.getProfile();
    if (!profile) throw new Error("No profile found.");
    const byName = new Map<string, string[]>();
    for (const s of profile.skills) {
      const key = s.name.toLowerCase();
      const list = byName.get(key) ?? [];
      list.push(s.id);
      byName.set(key, list);
    }
    const unresolved: string[] = [];
    const ambiguous: string[] = [];
    for (const name of skillNames) {
      const matches = byName.get(name.toLowerCase()) ?? [];
      if (matches.length === 0) {
        unresolved.push(name);
      } else if (matches.length > 1) {
        ambiguous.push(name);
      } else {
        ids.add(matches[0]!);
      }
    }
    if (unresolved.length > 0 || ambiguous.length > 0) {
      const parts: string[] = [];
      if (unresolved.length > 0) parts.push(`not found: ${unresolved.join(", ")}`);
      if (ambiguous.length > 0) parts.push(`ambiguous (multiple skills share this name): ${ambiguous.join(", ")}`);
      throw new Error(`Could not resolve skillNames — ${parts.join("; ")}`);
    }
  }
  return Array.from(ids);
}
