import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveSkillId, resolveDomain, resolveCategoryId } from "../helpers/resolve.js";
import { success } from "../helpers/output.js";

const collect = (value: string, prev: string[]): string[] => [...prev, value];

export function registerEditCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("edit <name>")
    .description("Update a skill in your profile")
    .option("-p, --proficiency <level>", "New proficiency level")
    .option("--name <new-name>", "Rename the skill")
    .option("--description <text>", "Update description")
    .option("--notes <text>", "Update notes")
    .option("-d, --domain <domain>", "Move to domain (name or slug)")
    .option("-c, --category <category>", "Move to category (name or slug, requires --domain)")
    .option("--featured", "Mark as featured")
    .option("--no-featured", "Unmark as featured")
    .option("--visibility <vis>", "Set visibility: public or private")
    .option(
      "--private-field <field>",
      "Mark a field as hidden from public output. Repeatable. Replaces current list (pass none to clear). Allowed: proficiency, proficiencyLabel",
      collect,
      [] as string[],
    )
    .action(
      withErrorHandler(async (name: string, opts: {
        proficiency?: string;
        name?: string;
        description?: string;
        notes?: string;
        domain?: string;
        category?: string;
        featured?: boolean;
        visibility?: string;
        privateField: string[];
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const skillId = resolveSkillId(profile, name);

        let domainId: string | undefined;
        let categoryId: string | undefined;
        if (opts.domain) {
          const domain = resolveDomain(profile, opts.domain);
          domainId = domain.id;
          if (opts.category) {
            categoryId = resolveCategoryId(domain, opts.category);
          }
        }

        // Only send privateFields if the user passed at least one flag — otherwise
        // updating the skill would inadvertently clear the existing list.
        const privateFields = opts.privateField.length > 0 ? opts.privateField : undefined;

        const result = await application.updateSkill(container, {
          skillId,
          proficiency: opts.proficiency,
          name: opts.name,
          description: opts.description,
          notes: opts.notes,
          domainId,
          categoryId,
          featured: opts.featured,
          visibility: opts.visibility,
          privateFields,
        });

        success(`Updated skill: ${result.skill.name} (${result.skill.proficiency})`);
      }),
    );
}
