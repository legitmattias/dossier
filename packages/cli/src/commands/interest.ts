import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomain, resolveDomainId, resolveInterestId } from "../helpers/resolve.js";
import { success, info, table } from "../helpers/output.js";

export function registerInterestCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("interest [name]")
    .description("Add, remove, promote, or list interests")
    .option("-d, --domain <domain>", "Domain (name or slug)")
    .option("--learn", "Promote interest to a learning goal")
    .option("--remove", "Remove interest")
    .option("--list", "List all interests")
    .option("--description <text>", "Interest description")
    .option("--notes <text>", "Internal notes (not exported)")
    .option("--featured", "Mark as featured")
    .option("--visibility <vis>", "Visibility: public or private", "public")
    .option("-s, --sort <by>", "Sort by: name (default), added, updated (list only)")
    .action(
      withErrorHandler(async (name: string | undefined, opts: {
        domain?: string;
        learn?: boolean;
        remove?: boolean;
        list?: boolean;
        description?: string;
        notes?: string;
        featured?: boolean;
        visibility?: string;
        sort?: string;
      }) => {
        const container = getContainer();

        // List mode
        if (opts.list) {
          const profile = await container.profileRepository.load();
          if (!profile) {
            throw new application.ProfileNotFoundError();
          }

          let interests = [...profile.interests];
          if (opts.domain) {
            const domainId = resolveDomainId(profile, opts.domain);
            interests = interests.filter((i) => i.domainId === domainId);
          }

          if (interests.length === 0) {
            info("No interests found.");
            return;
          }

          interests.sort((a, b) => {
            if (opts.sort === "added") return b.createdAt.getTime() - a.createdAt.getTime();
            if (opts.sort === "updated") return b.updatedAt.getTime() - a.updatedAt.getTime();
            return a.name.localeCompare(b.name);
          });

          table(
            ["Name", "Domain", "Created"],
            interests.map((i) => {
              const domain = profile.domains.find((d) => d.id === i.domainId);
              return [i.name, domain?.name ?? i.domainId, i.createdAt.toISOString().slice(0, 10)];
            }),
          );
          return;
        }

        if (!name) {
          info("Provide an interest name, or use --list to view all interests.");
          return;
        }

        // Promote to goal
        if (opts.learn) {
          const profile = await container.profileRepository.load();
          if (!profile) {
            throw new application.ProfileNotFoundError();
          }

          const interestId = resolveInterestId(profile, name);
          const result = await application.promoteInterest(container, {
            interestId,
          });

          success(`Promoted interest '${name}' to learning goal: ${result.goal.name}`);
          return;
        }

        // Remove interest
        if (opts.remove) {
          const profile = await container.profileRepository.load();
          if (!profile) {
            throw new application.ProfileNotFoundError();
          }

          const interestId = resolveInterestId(profile, name);
          await application.removeInterest(container, { interestId });

          success(`Removed interest: ${name}`);
          return;
        }

        // Add interest (default)
        if (!opts.domain) {
          info("Domain is required when adding an interest. Use -d <domain>");
          process.exit(1);
        }

        const profile = await container.profileRepository.load();
        if (!profile) {
          throw new application.ProfileNotFoundError();
        }

        const domain = resolveDomain(profile, opts.domain);
        const result = await application.addInterest(container, {
          name,
          domainId: domain.id,
          description: opts.description,
          notes: opts.notes,
          featured: opts.featured,
          visibility: opts.visibility,
        });

        success(`Added interest: ${result.interest.name}`);
      }),
    );
}
