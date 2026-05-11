import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveProjectId } from "../helpers/resolve.js";
import { success, info, table } from "../helpers/output.js";

const collect = (value: string, prev: string[]): string[] => [...prev, value];

function resolveSkillNamesToIds(
  profile: NonNullable<Awaited<ReturnType<Container["profileRepository"]["load"]>>>,
  names: readonly string[],
): string[] {
  const byName = new Map<string, string[]>();
  for (const s of profile.skills) {
    const key = s.name.toLowerCase();
    const list = byName.get(key) ?? [];
    list.push(s.id);
    byName.set(key, list);
  }
  const unresolved: string[] = [];
  const ambiguous: string[] = [];
  const ids: string[] = [];
  for (const name of names) {
    const matches = byName.get(name.toLowerCase()) ?? [];
    if (matches.length === 0) unresolved.push(name);
    else if (matches.length > 1) ambiguous.push(name);
    else ids.push(matches[0]!);
  }
  if (unresolved.length > 0 || ambiguous.length > 0) {
    const parts: string[] = [];
    if (unresolved.length > 0) parts.push(`not found: ${unresolved.join(", ")}`);
    if (ambiguous.length > 0) parts.push(`ambiguous: ${ambiguous.join(", ")}`);
    throw new Error(`Could not resolve skill names — ${parts.join("; ")}`);
  }
  return ids;
}

export function registerProjectCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("project [name]")
    .description("Add, remove, update, or list projects")
    .option("--list", "List all projects")
    .option("--remove", "Remove project")
    .option("--update", "Update an existing project (rather than add)")
    .option("--status <status>", "Filter by status (list) or set status")
    .option("--priority <priority>", "Set priority")
    .option("--featured", "Mark as featured")
    .option("--url <url>", "Project URL")
    .option("--role <role>", "Your role in the project")
    .option("--description <text>", "Project description")
    .option("--notes <text>", "Internal notes (not exported)")
    .option("--visibility <vis>", "Visibility: public or private", "public")
    .option("-k, --skill <name>", "Skill to link by name (repeatable)", collect, [] as string[])
    .option(
      "--private-field <field>",
      "Mark a field as hidden from public output. Repeatable. Allowed: url, role, startDate, endDate, highlights, status",
      collect,
      [] as string[],
    )
    .option("-s, --sort <by>", "Sort by: name (default), added, updated (list only)")
    .action(
      withErrorHandler(async (name: string | undefined, opts: {
        list?: boolean;
        remove?: boolean;
        update?: boolean;
        status?: string;
        priority?: string;
        featured?: boolean;
        url?: string;
        role?: string;
        description?: string;
        notes?: string;
        visibility?: string;
        skill?: string[];
        privateField: string[];
        sort?: string;
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

          const sortedProjects = [...result.projects].sort((a, b) => {
            if (opts.sort === "added") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (opts.sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            return a.name.localeCompare(b.name);
          });

          table(
            ["Name", "Status", "Priority", "Skills", "Featured"],
            sortedProjects.map((p) => [
              p.name,
              p.status,
              p.priority,
              String(p.skillIds?.length ?? 0),
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

        // Update existing project
        if (opts.update) {
          const profile = await container.profileRepository.load();
          if (!profile) throw new application.ProfileNotFoundError();

          const projectId = resolveProjectId(profile, name);
          const skillNames = opts.skill ?? [];
          const skillIds = skillNames.length > 0 ? resolveSkillNamesToIds(profile, skillNames) : undefined;

          const result = await application.updateProject(container, {
            projectId,
            ...(opts.description !== undefined && { description: opts.description }),
            ...(opts.url !== undefined && { url: opts.url }),
            ...(opts.role !== undefined && { role: opts.role }),
            ...(opts.notes !== undefined && { notes: opts.notes }),
            ...(opts.status !== undefined && { status: opts.status }),
            ...(opts.priority !== undefined && { priority: opts.priority }),
            ...(opts.featured !== undefined && { featured: opts.featured }),
            ...(opts.visibility !== undefined && { visibility: opts.visibility }),
            ...(skillIds !== undefined && { skillIds }),
            ...(opts.privateField.length > 0 && { privateFields: opts.privateField }),
          });

          success(`Updated project: ${result.project.name} (${result.project.status})`);
          return;
        }

        // Add project (default)
        const skillNames = opts.skill ?? [];
        let skillIds: string[] | undefined;
        if (skillNames.length > 0) {
          const profile = await container.profileRepository.load();
          if (!profile) throw new application.ProfileNotFoundError();
          skillIds = resolveSkillNamesToIds(profile, skillNames);
        }

        const result = await application.addProject(container, {
          name,
          description: opts.description,
          url: opts.url,
          role: opts.role,
          notes: opts.notes,
          status: opts.status,
          priority: opts.priority,
          featured: opts.featured,
          visibility: opts.visibility,
          ...(skillIds && { skillIds }),
          ...(opts.privateField.length > 0 && { privateFields: opts.privateField }),
        });

        success(`Added project: ${result.project.name} (${result.project.status})`);
      }),
    );
}
