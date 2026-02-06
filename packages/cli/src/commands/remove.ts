import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveSkillId } from "../helpers/resolve.js";
import { success } from "../helpers/output.js";

export function registerRemoveCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("remove <name>")
    .description("Remove a skill from your profile")
    .action(
      withErrorHandler(async (name: string) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const skillId = resolveSkillId(profile, name);
        await application.removeSkill(container, { skillId });

        success(`Removed skill: ${name}`);
      }),
    );
}
