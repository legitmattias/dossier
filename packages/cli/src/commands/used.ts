import type { Command } from "commander";
import { application, getSkillFreshness } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveSkillId } from "../helpers/resolve.js";
import { success, info } from "../helpers/output.js";

export function registerUsedCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("used <name>")
    .description("Mark a skill as recently used")
    .option("--context <text>", "How the skill was used")
    .action(
      withErrorHandler(async (name: string, opts: { context?: string }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const skillId = resolveSkillId(profile, name);

        await application.updateSkill(container, {
          skillId,
          addUsage: [{
            context: opts.context ?? "used",
            lastUsed: new Date(),
          }],
        });

        // Reload to get freshness
        const updated = await container.profileRepository.load();
        const skill = updated!.skills.find((s) => s.id === skillId)!;
        const freshness = getSkillFreshness(skill);

        success(`Marked '${name}' as recently used.`);
        info(`Freshness: ${Math.round(freshness * 100)}%`);
      }),
    );
}
