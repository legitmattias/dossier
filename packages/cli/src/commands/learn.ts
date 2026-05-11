import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain } from "../helpers/resolve.js";
import { success } from "../helpers/output.js";

const collect = (value: string, prev: string[]): string[] => [...prev, value];

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
    .option("--motivation <text>", "Why you want to learn this")
    .option("--notes <text>", "Internal notes (not exported)")
    .option("--featured", "Mark as featured")
    .option("--visibility <vis>", "Visibility: public or private", "public")
    .option(
      "--private-field <field>",
      "Mark a field as hidden from public output. Repeatable. Allowed: motivation, priority, status, targetDate, progress, resources. (progress is private by default — pass any --private-field to replace the list.)",
      collect,
      [] as string[],
    )
    .action(
      withErrorHandler(async (name: string, opts: {
        domain: string;
        priority: string;
        targetDate?: string;
        description?: string;
        motivation?: string;
        notes?: string;
        featured?: boolean;
        visibility?: string;
        privateField: string[];
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
          motivation: opts.motivation,
          notes: opts.notes,
          featured: opts.featured,
          visibility: opts.visibility,
          privateFields: opts.privateField.length > 0 ? opts.privateField : undefined,
        });

        success(`Added learning goal: ${result.goal.name} (${result.goal.priority} priority)`);
      }),
    );
}
