import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain, resolveCategoryId } from "../helpers/resolve.js";
import { info, table } from "../helpers/output.js";

export function registerListCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("list")
    .description("List skills in your profile")
    .option("-d, --domain <domain>", "Filter by domain")
    .option("-c, --category <category>", "Filter by category (requires --domain)")
    .option("-p, --proficiency <level>", "Filter by proficiency level")
    .action(
      withErrorHandler(async (opts: {
        domain?: string;
        category?: string;
        proficiency?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

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
            s.name,
            s.proficiency,
            domainNames.get(s.domainId) ?? s.domainId,
            categoryNames.get(s.categoryId) ?? s.categoryId,
          ]),
        );
      }),
    );
}
