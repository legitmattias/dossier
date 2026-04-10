import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { infrastructure } from "@dossier/core";

import type { DossierOperations } from "./operations.js";

export function registerResources(server: McpServer, ops: DossierOperations): void {
  // Full profile as JSON
  server.registerResource(
    "profile",
    "dossier://profile",
    {
      title: "Full Profile",
      description: "Complete Dossier profile as JSON — all skills, goals, interests, and domains",
      mimeType: "application/json",
    },
    async (uri): Promise<ReadResourceResult> => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No Dossier profile found. Run 'dossier init' to create one.");
      const serialized = infrastructure.serializeProfile(profile);
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(serialized, null, 2) }],
      };
    },
  );

  // Profile summary in CLAUDE.md format
  server.registerResource(
    "profile-summary",
    "dossier://profile/summary",
    {
      title: "Profile Summary",
      description: "LLM-optimized profile summary (CLAUDE.md format) — ideal for system prompt context",
      mimeType: "text/markdown",
    },
    async (uri): Promise<ReadResourceResult> => {
      const text = await ops.exportProfile("claude");
      return { contents: [{ uri: uri.href, text }] };
    },
  );

  // All skills
  server.registerResource(
    "skills",
    "dossier://skills",
    {
      title: "Skills",
      description: "All skills across all domains with proficiency levels and usage data",
      mimeType: "application/json",
    },
    async (uri): Promise<ReadResourceResult> => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(profile.skills, null, 2) }],
      };
    },
  );

  // Skills filtered by domain
  server.registerResource(
    "skills-by-domain",
    new ResourceTemplate("dossier://skills/{domainSlug}", {
      list: async () => {
        const domains = await ops.getDomains();
        return {
          resources: domains.map((d) => ({
            uri: `dossier://skills/${d.slug}`,
            name: `${d.name} Skills`,
          })),
        };
      },
    }),
    {
      title: "Skills by Domain",
      description: "Skills filtered by domain slug",
      mimeType: "application/json",
    },
    async (uri, { domainSlug }): Promise<ReadResourceResult> => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const domain = profile.domains.find((d) => d.slug === domainSlug);
      if (!domain) {
        return { contents: [{ uri: uri.href, text: JSON.stringify({ error: `Domain not found: ${domainSlug}` }) }] };
      }
      const skills = profile.skills.filter((s) => s.domainId === domain.id);
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(skills, null, 2) }],
      };
    },
  );

  // All learning goals
  server.registerResource(
    "goals",
    "dossier://goals",
    {
      title: "Learning Goals",
      description: "All learning goals with status, priority, and progress",
      mimeType: "application/json",
    },
    async (uri): Promise<ReadResourceResult> => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(profile.goals, null, 2) }],
      };
    },
  );

  // Active goals only
  server.registerResource(
    "goals-active",
    "dossier://goals/active",
    {
      title: "Active Learning Goals",
      description: "Currently active learning goals (excludes paused, completed, abandoned)",
      mimeType: "application/json",
    },
    async (uri): Promise<ReadResourceResult> => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      const active = profile.goals.filter((g) => g.status === "active");
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(active, null, 2) }],
      };
    },
  );

  // All interests
  server.registerResource(
    "interests",
    "dossier://interests",
    {
      title: "Interests",
      description: "Topics of interest — things you're curious about but haven't committed to learning",
      mimeType: "application/json",
    },
    async (uri): Promise<ReadResourceResult> => {
      const profile = await ops.getProfile();
      if (!profile) throw new Error("No profile found.");
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(profile.interests, null, 2) }],
      };
    },
  );

  // All domains with categories (taxonomy discovery)
  server.registerResource(
    "domains",
    "dossier://domains",
    {
      title: "Domains & Categories",
      description: "All available domains and their categories — use this to discover valid domainId and categoryId values",
      mimeType: "application/json",
    },
    async (uri): Promise<ReadResourceResult> => {
      const domains = await ops.getDomains();
      const result = domains.map((d) => ({
        id: d.id, slug: d.slug, name: d.name, isBuiltIn: d.isBuiltIn,
        categories: d.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
      }));
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
