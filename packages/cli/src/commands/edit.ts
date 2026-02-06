import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveSkillId } from "../helpers/resolve.js";
import { success } from "../helpers/output.js";

export function registerEditCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("edit <name>")
    .description("Update a skill in your profile")
    .option("-p, --proficiency <level>", "New proficiency level")
    .option("--notes <text>", "New notes")
    .option("--name <new-name>", "Rename the skill")
    .action(
      withErrorHandler(async (name: string, opts: {
        proficiency?: string;
        notes?: string;
        name?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const skillId = resolveSkillId(profile, name);

        const result = await application.updateSkill(container, {
          skillId,
          proficiency: opts.proficiency,
          notes: opts.notes,
          name: opts.name,
        });

        success(`Updated skill: ${result.skill.name} (${result.skill.proficiency})`);
      }),
    );
}
