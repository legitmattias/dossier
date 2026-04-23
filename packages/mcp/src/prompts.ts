import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { DossierOperations } from "./operations.js";

export function registerPrompts(server: McpServer, ops: DossierOperations): void {

  server.registerPrompt(
    "suggest-learning",
    {
      title: "Suggest Learning",
      description: "Suggest what to learn next based on current skills, goals, and interests",
    },
    async () => {
      const context = await getProfileContext(ops);
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Based on my Dossier profile, suggest what I should learn next. Consider my current skills, active learning goals, and interests. Prioritize suggestions that build on existing strengths or fill gaps for my goals.\n\n${context}`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "recommend-stack",
    {
      title: "Recommend Tech Stack",
      description: "Recommend a tech stack for a project based on the user's skill profile",
      argsSchema: z.object({
        project: z.string().describe("Brief description of the project"),
      }),
    },
    async ({ project }) => {
      const context = await getProfileContext(ops);
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Based on my Dossier profile, recommend a tech stack for this project: "${project}". Prefer technologies I'm proficient in, but suggest alternatives if they're a better fit. Note any skills I'd need to learn.\n\n${context}`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "explain-for-level",
    {
      title: "Explain for My Level",
      description: "Explain a topic adapted to the user's proficiency level in that area",
      argsSchema: z.object({
        topic: z.string().describe("The topic to explain"),
      }),
    },
    async ({ topic }) => {
      const context = await getProfileContext(ops);
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Explain "${topic}" to me, adapting the explanation to my skill level. Use my Dossier profile to determine how much I know about this topic and related areas. If I'm a novice, start from basics. If I'm advanced, skip fundamentals and focus on nuances.\n\n${context}`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "review-stale-skills",
    {
      title: "Review Stale Skills",
      description: "Review skills that haven't been used recently and suggest which to refresh or deprecate",
    },
    async () => {
      const context = await getProfileContext(ops);
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Review my Dossier profile and identify skills that haven't been used recently or lack usage data. For each stale skill, suggest whether I should: (1) refresh it with a quick project, (2) keep it as-is, or (3) acknowledge it's rusty and deprioritize it.\n\n${context}`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "plan-learning-path",
    {
      title: "Plan Learning Path",
      description: "Create a learning path for a specific goal based on current skills",
      argsSchema: z.object({
        goal: z.string().describe("The learning goal to plan for"),
      }),
    },
    async ({ goal }) => {
      const context = await getProfileContext(ops);
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a learning path for: "${goal}". Use my Dossier profile to identify what I already know that's relevant, what gaps I need to fill, and suggest a step-by-step plan with resources.\n\n${context}`,
          },
        }],
      };
    },
  );
}

async function getProfileContext(ops: DossierOperations): Promise<string> {
  try {
    return await ops.exportProfile("llm-md");
  } catch {
    return "No Dossier profile found. The user hasn't set up their profile yet.";
  }
}
