import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain } from "../helpers/resolve.js";
import { success } from "../helpers/output.js";

export function registerLearnCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("learn <name>")
    .description("Add a learning goal")
    .requiredOption("-d, --domain <domain>", "Domain (name or slug)")
    .option("--priority <priority>", "Priority level (low, medium, high)", "medium")
    .option("--target-date <date>", "Target completion date (YYYY-MM-DD)")
    .option("--description <text>", "Goal description")
    .action(
      withErrorHandler(async (name: string, opts: {
        domain: string;
        priority: string;
        targetDate?: string;
        description?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const domain = resolveDomain(profile, opts.domain);

        const result = await application.addLearningGoal(container, {
          name,
          domainId: domain.id,
          priority: opts.priority,
          targetDate: opts.targetDate,
          description: opts.description,
        });

        success(`Added learning goal: ${result.goal.name} (${result.goal.priority} priority)`);
      }),
    );
}
