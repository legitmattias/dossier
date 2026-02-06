import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomainId } from "../helpers/resolve.js";
import { info, table } from "../helpers/output.js";

export function registerGoalsCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("goals")
    .description("List learning goals")
    .option("--active", "Show only active goals")
    .option("--completed", "Show only completed goals")
    .option("-d, --domain <domain>", "Filter by domain")
    .action(
      withErrorHandler(async (opts: {
        active?: boolean;
        completed?: boolean;
        domain?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        let goals = [...profile.goals];

        if (opts.domain) {
          const domainId = resolveDomainId(profile, opts.domain);
          goals = goals.filter((g) => g.domainId === domainId);
        }

        if (opts.active) {
          goals = goals.filter((g) => g.status === "active");
        } else if (opts.completed) {
          goals = goals.filter((g) => g.status === "completed");
        }

        if (goals.length === 0) {
          info("No goals found.");
          return;
        }

        table(
          ["Name", "Priority", "Status", "Progress"],
          goals.map((g) => {
            const latest = g.progress.length > 0
              ? g.progress[g.progress.length - 1]!
              : null;
            const pct = latest ? `${latest.percentage}%` : "0%";
            return [g.name, g.priority, g.status, pct];
          }),
        );
      }),
    );
}
