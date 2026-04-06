import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { application, infrastructure, PROFICIENCY_LEVELS } from "@dossier/core";

import type { DossierMcpDeps } from "./server.js";

export function registerTools(server: McpServer, deps: DossierMcpDeps): void {
  server.registerTool(
    "dossier_add_skill",
    {
      title: "Add Skill",
      description: "Add a new skill to the profile. Requires name, domainId, categoryId, and proficiency level.",
      inputSchema: z.object({
        name: z.string().describe("Skill name (e.g. 'TypeScript', 'Swedish')"),
        domainId: z.string().describe("Domain ID (e.g. 'builtin-domain-software-development')"),
        categoryId: z.string().describe("Category ID (e.g. 'builtin-category-software-development-languages')"),
        proficiency: z.enum(PROFICIENCY_LEVELS).describe("Proficiency level"),
        notes: z.string().optional().describe("Optional notes about this skill"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.addSkill(deps, input);
      return ok(`Added skill: ${result.skill.name} (${result.skill.proficiency})`);
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
        domainId: z.string().describe("Domain ID"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Priority level (default: medium)"),
        description: z.string().optional().describe("Goal description or motivation"),
        targetDate: z.string().optional().describe("Target date in ISO format (e.g. '2026-12-31')"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.addLearningGoal(deps, input);
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
        domainId: z.string().describe("Domain ID"),
        description: z.string().optional().describe("Why you're interested"),
      }),
    },
    async (input): Promise<CallToolResult> => {
      const result = await application.addInterest(deps, input);
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
