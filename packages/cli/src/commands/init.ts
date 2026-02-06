import type { Command } from "commander";
import {
  createProfile,
  toProfileId,
  BUILT_IN_DOMAINS,
  infrastructure,
} from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { success, warn, info } from "../helpers/output.js";

export function registerInitCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("init")
    .description("Create a new Dossier profile")
    .option("--force", "Overwrite existing profile")
    .action(
      withErrorHandler(async (opts: { force?: boolean }) => {
        const container = getContainer();
        const exists = await container.profileRepository.exists();

        if (exists && !opts.force) {
          warn("Profile already exists. Use --force to overwrite.");
          return;
        }

        const { input } = await import("@inquirer/prompts");
        const name = await input({ message: "Profile name:" });

        const profileId = toProfileId(container.idGenerator.generate("profile"));
        const profile = createProfile({
          id: profileId,
          name,
          domains: [...BUILT_IN_DOMAINS],
        });

        await container.profileRepository.save(profile);

        const path = infrastructure.getDefaultProfilePath();
        success(`Profile created at ${path}`);
        info(`Added ${BUILT_IN_DOMAINS.length} built-in domains.`);
      }),
    );
}
