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

        let domainId: string | undefined;
        let categoryId: string | undefined;

        if (opts.domain) {
          const profile = await container.profileRepository.load();
          if (!profile) {
            throw new application.ProfileNotFoundError();
          }
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

        table(
          ["Name", "Proficiency", "Domain", "Category"],
          result.skills.map((s) => [s.name, s.proficiency, s.domainId, s.categoryId]),
        );
      }),
    );
}
