import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomainId, resolveGoalId } from "../helpers/resolve.js";
import { info, table } from "../helpers/output.js";

export function registerGoalsCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("goals [name]")
    .description("List learning goals, or show detail for a specific goal")
    .option("--active", "Show only active goals")
    .option("--completed", "Show only completed goals")
    .option("-d, --domain <domain>", "Filter by domain")
    .action(
      withErrorHandler(async (name: string | undefined, opts: {
        active?: boolean;
        completed?: boolean;
        domain?: string;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        // Detail view for a single goal
        if (name) {
          const goalId = resolveGoalId(profile, name);
          const goal = profile.goals.find((g) => g.id === goalId)!;

          const domainName = profile.domains.find((d) => d.id === goal.domainId)?.name ?? goal.domainId;

          const lines: string[] = [];
          lines.push(`Name:         ${goal.name}`);
          lines.push(`Priority:     ${goal.priority}`);
          lines.push(`Status:       ${goal.status}`);
          lines.push(`Domain:       ${domainName}`);
          if (goal.targetDate) {
            lines.push(`Target date:  ${goal.targetDate.toISOString().slice(0, 10)}`);
          }
          if (goal.description) {
            lines.push(`Description:  ${goal.description}`);
          }

          if (goal.progress.length > 0) {
            lines.push("");
            lines.push("Progress:");
            for (const p of goal.progress) {
              const note = p.note ? ` ${p.note}` : "";
              lines.push(`  - ${p.percentage}% (${p.updatedAt.toISOString().slice(0, 10)})${note}`);
            }
          }

          console.log(lines.join("\n"));
          return;
        }

        // Table view
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
