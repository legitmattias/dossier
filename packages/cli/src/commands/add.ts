import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain, resolveCategoryId } from "../helpers/resolve.js";
import { success } from "../helpers/output.js";

export function registerAddCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("add <name>")
    .description("Add a skill to your profile")
    .requiredOption("-d, --domain <domain>", "Domain (name or slug)")
    .requiredOption("-c, --category <category>", "Category (name or slug)")
    .option("-p, --proficiency <level>", "Proficiency level", "novice")
    .option("--notes <text>", "Notes about this skill")
    .action(
      withErrorHandler(async (name: string, opts: {
        domain: string;
        category: string;
        proficiency: string;
        notes?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const domain = resolveDomain(profile, opts.domain);
        const categoryId = resolveCategoryId(domain, opts.category);

        const result = await application.addSkill(container, {
          name,
          domainId: domain.id,
          categoryId,
          proficiency: opts.proficiency,
          notes: opts.notes,
        });

        success(`Added skill: ${result.skill.name} (${result.skill.proficiency})`);
      }),
    );
}
