import type { Command } from "commander";
import { application, getSkillFreshness } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain } from "../helpers/resolve.js";
import { info, table } from "../helpers/output.js";

export function registerStaleCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("stale")
    .description("Show skills with low freshness")
    .option("--threshold <number>", "Freshness threshold (0-1)", "0.3")
    .option("-d, --domain <domain>", "Filter by domain")
    .action(
      withErrorHandler(async (opts: { threshold: string; domain?: string }) => {
        const container = getContainer();
        const threshold = Number(opts.threshold);

        let domainId: string | undefined;
        if (opts.domain) {
          const profile = await container.profileRepository.load();
          if (!profile) {
            throw new application.ProfileNotFoundError();
          }
          domainId = resolveDomain(profile, opts.domain).id;
        }

        const result = await application.listSkills(container, { domainId });
        const now = new Date();

        const staleSkills = result.skills.filter((s) => {
          // Freshness is calculated from usage entries — skills with no usage have 0 freshness
          const lastUsage = s.usage.length > 0
            ? s.usage.reduce((latest, u) =>
                u.lastUsed > latest.lastUsed ? u : latest,
              )
            : null;

          if (!lastUsage) return true; // no usage = stale

          const daysSinceUse = (now.getTime() - lastUsage.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
          const freshness = daysSinceUse <= 0 ? 1 : Math.pow(2, -daysSinceUse / 90);
          return freshness < threshold;
        });

        if (staleSkills.length === 0) {
          info("All skills are fresh!");
          return;
        }

        table(
          ["Name", "Proficiency", "Freshness", "Last Used"],
          staleSkills.map((s) => {
            const lastUsage = s.usage.length > 0
              ? s.usage.reduce((latest, u) =>
                  u.lastUsed > latest.lastUsed ? u : latest,
                )
              : null;

            let freshness = "0%";
            let lastUsed = "never";
            if (lastUsage) {
              const daysSinceUse = (now.getTime() - lastUsage.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
              freshness = `${Math.round((daysSinceUse <= 0 ? 1 : Math.pow(2, -daysSinceUse / 90)) * 100)}%`;
              lastUsed = lastUsage.lastUsed.toISOString().slice(0, 10);
            }

            return [s.name, s.proficiency, freshness, lastUsed];
          }),
        );
      }),
    );
}
