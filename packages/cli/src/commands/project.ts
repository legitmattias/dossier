import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveProjectId } from "../helpers/resolve.js";
import { success, info, table } from "../helpers/output.js";

export function registerProjectCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("project [name]")
    .description("Add, remove, or list projects")
    .option("--list", "List all projects")
    .option("--remove", "Remove project")
    .option("--status <status>", "Filter by status (list) or set status (add)")
    .option("--priority <priority>", "Set priority")
    .option("--featured", "Mark as featured")
    .option("--url <url>", "Project URL")
    .option("--role <role>", "Your role in the project")
    .option("--description <text>", "Project description")
    .action(
      withErrorHandler(async (name: string | undefined, opts: {
        list?: boolean;
        remove?: boolean;
        status?: string;
        priority?: string;
        featured?: boolean;
        url?: string;
        role?: string;
        description?: string;
      }) => {
        const container = getContainer();

        // List mode
        if (opts.list) {
          const result = await application.listProjects(container, {
            status: opts.status,
          });

          if (result.projects.length === 0) {
            info("No projects found.");
            return;
          }

          table(
            ["Name", "Status", "Priority", "Featured"],
            result.projects.map((p) => [
              p.name,
              p.status,
              p.priority,
              p.featured ? "★" : "",
            ]),
          );
          return;
        }

        if (!name) {
          info("Provide a project name, or use --list to view all projects.");
          return;
        }

        // Remove project
        if (opts.remove) {
          const profile = await container.profileRepository.load();
          if (!profile) throw new application.ProfileNotFoundError();

          const projectId = resolveProjectId(profile, name);
          await application.removeProject(container, { projectId });
          success(`Removed project: ${name}`);
          return;
        }

        // Add project (default)
        const result = await application.addProject(container, {
          name,
          description: opts.description,
          url: opts.url,
          role: opts.role,
          status: opts.status,
          priority: opts.priority,
          featured: opts.featured,
        });

        success(`Added project: ${result.project.name} (${result.project.status})`);
      }),
    );
}
