import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveGoalId, resolveDomain, resolveCategoryId } from "../helpers/resolve.js";
import { success, info, error } from "../helpers/output.js";

export function registerProgressCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("progress <name> <percentage>")
    .description("Update goal progress or complete a goal")
    .option("--note <text>", "Progress note")
    .option("-c, --category <category>", "Category for skill (required when completing)")
    .option("-p, --proficiency <level>", "Proficiency level (for completion)")
    .action(
      withErrorHandler(async (name: string, percentage: string, opts: {
        note?: string;
        category?: string;
        proficiency?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const goalId = resolveGoalId(profile, name);
        const isComplete = percentage === "completed" || percentage === "100";

        if (isComplete) {
          if (!opts.category) {
            error("Category is required when completing a goal. Use -c <category>");
            process.exit(1);
          }

          // Find the goal's domain to resolve category
          const goal = profile.goals.find((g) => g.id === goalId)!;
          const domain = profile.domains.find((d) => d.id === goal.domainId)!;
          const categoryId = resolveCategoryId(domain, opts.category);

          const result = await application.completeGoal(container, {
            goalId,
            categoryId,
            proficiency: opts.proficiency,
          });

          success(`Completed goal: ${result.goal.name}`);
          info(`Created skill: ${result.skill.name} (${result.skill.proficiency})`);
        } else {
          const pct = Number(percentage);
          if (Number.isNaN(pct) || pct < 0 || pct > 100) {
            error("Percentage must be a number between 0 and 100, or 'completed'.");
            process.exit(1);
          }

          const result = await application.updateGoalProgress(container, {
            goalId,
            percentage: pct,
            note: opts.note,
          });

          const latest = result.goal.progress[result.goal.progress.length - 1];
          success(`Updated progress: ${result.goal.name} → ${latest?.percentage ?? pct}%`);
        }
      }),
    );
}
