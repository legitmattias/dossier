import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain, resolveCategoryId, resolveSkillId } from "../helpers/resolve.js";
import { info, table } from "../helpers/output.js";

export function registerListCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("list [name]")
    .description("List skills in your profile, or show detail for a specific skill")
    .option("-d, --domain <domain>", "Filter by domain")
    .option("-c, --category <category>", "Filter by category (requires --domain)")
    .option("-p, --proficiency <level>", "Filter by proficiency level")
    .action(
      withErrorHandler(async (name: string | undefined, opts: {
        domain?: string;
        category?: string;
        proficiency?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        // Detail view for a single skill
        if (name) {
          const skillId = resolveSkillId(profile, name);
          const skill = profile.skills.find((s) => s.id === skillId)!;

          const domainName = profile.domains.find((d) => d.id === skill.domainId)?.name ?? skill.domainId;
          const categoryName = profile.domains
            .flatMap((d) => d.categories)
            .find((c) => c.id === skill.categoryId)?.name ?? skill.categoryId;

          const lines: string[] = [];
          lines.push(`Name:         ${skill.name}`);
          if (skill.description) {
            lines.push(`Description:  ${skill.description}`);
          }
          lines.push(`Proficiency:  ${skill.proficiency}`);
          lines.push(`Domain:       ${domainName}`);
          lines.push(`Category:     ${categoryName}`);
          if (skill.notes) {
            lines.push(`Notes:        ${skill.notes}`);
          }
          lines.push(`Featured:     ${skill.featured ? "yes" : "no"}`);
          lines.push(`Visibility:   ${skill.visibility}`);
          const domain = profile.domains.find(d => d.id === skill.domainId);
          if (domain?.visibility === "private") {
            lines.push(`Domain vis.:  private (hidden from exports)`);
          }
          lines.push(`Created:      ${skill.createdAt.toISOString().slice(0, 10)}`);

          if (skill.usage.length > 0) {
            lines.push("");
            lines.push("Usage:");
            for (const u of skill.usage) {
              lines.push(`  - ${u.lastUsed.toISOString().slice(0, 10)} (${u.context})`);
            }
          }

          if (skill.sources.length > 0) {
            lines.push("");
            lines.push("Sources:");
            for (const s of skill.sources) {
              const detail = s.detail ? `: ${s.detail}` : "";
              lines.push(`  - ${s.type}${detail} (${s.date.toISOString().slice(0, 10)})`);
            }
          }

          console.log(lines.join("\n"));
          return;
        }

        // Table view
        let domainId: string | undefined;
        let categoryId: string | undefined;

        if (opts.domain) {
          const domain = resolveDomain(profile, opts.domain);
          domainId = domain.id;

          if (opts.category) {
            categoryId = resolveCategoryId(domain, opts.category);
          }
        }

        const result = await application.listSkills(container, {
          domainId,
          categoryId,
          proficiency: opts.proficiency,
        });

        if (result.skills.length === 0) {
          info("No skills found.");
          return;
        }

        // Build ID → name lookup maps (keyed by plain string for DTO compatibility)
        const domainNames = new Map<string, string>(profile.domains.map((d) => [d.id, d.name]));
        const categoryNames = new Map<string, string>(
          profile.domains.flatMap((d) => d.categories.map((c) => [c.id, c.name])),
        );

        table(
          ["Name", "Proficiency", "Domain", "Category"],
          result.skills.map((s) => [
            s.featured ? `★ ${s.name}` : s.name,
            s.proficiency,
            domainNames.get(s.domainId) ?? s.domainId,
            categoryNames.get(s.categoryId) ?? s.categoryId,
          ]),
        );
      }),
    );
}
