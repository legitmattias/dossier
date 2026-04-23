import { writeFile } from "node:fs/promises";
import type { Command } from "commander";
import { application, infrastructure } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveDomainId } from "../helpers/resolve.js";
import { success, error } from "../helpers/output.js";

export function registerExportCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("export")
    .description("Export your profile")
    .option("-f, --format <format>", "Export format (json, markdown, text, llm-md)", "markdown")
    .option("-d, --domain <domain>", "Filter by domain")
    .option("--exclude-goals", "Exclude learning goals")
    .option("--exclude-completed", "Exclude completed goals")
    .option("--exclude-interests", "Exclude interests")
    .option("-o, --output <file>", "Write to file instead of stdout")
    .action(
      withErrorHandler(async (opts: {
        format: string;
        domain?: string;
        excludeGoals?: boolean;
        excludeCompleted?: boolean;
        excludeInterests?: boolean;
        output?: string;
      }) => {
        const container = getContainer();

        let exporter: application.IExporter;
        try {
          exporter = infrastructure.createExporter(opts.format);
        } catch {
          const formats = infrastructure.getSupportedFormats().join(", ");
          error(`Unknown format '${opts.format}'. Supported: ${formats}`);
          process.exit(1);
        }

        let domainIds: string[] | undefined;
        if (opts.domain) {
          const profile = await container.profileRepository.load();
          if (!profile) {
            throw new application.ProfileNotFoundError();
          }
          domainIds = [resolveDomainId(profile, opts.domain)];
        }

        const result = await application.exportProfile(
          { ...container, exporter },
          {
            domainIds,
            includeGoals: opts.excludeGoals ? false : undefined,
            excludeCompleted: opts.excludeCompleted ?? undefined,
            includeInterests: opts.excludeInterests ? false : undefined,
          },
        );

        if (opts.output) {
          await writeFile(opts.output, result.content, "utf-8");
          success(`Exported to ${opts.output}`);
        } else {
          console.log(result.content);
        }
      }),
    );
}
