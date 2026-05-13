import type { Command } from "commander";
import { application } from "@dossier/core";
import type { Container } from "../container.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import { resolveGoalId } from "../helpers/resolve.js";
import { info, success, table } from "../helpers/output.js";

/**
 * `dossier resource <goal-name> add|list|remove|complete [<resource-id-or-title>]`
 *
 * Resources are articles, videos, courses, books, etc. attached to a learning
 * goal. The CLI mirrors what's in the web edit modal and the MCP tools.
 */
export function registerResourceCommand(
  program: Command,
  getContainer: () => Container,
): void {
  program
    .command("resource <goal-name> <action> [identifier]")
    .description("Manage resources on a learning goal — actions: add, list, remove, complete")
    .option("--title <text>", "Resource title (required for add)")
    .option("--url <url>", "Resource URL")
    .option("--type <type>", "Resource type: article, video, course, book, documentation, other", "article")
    .option("--completed", "Mark as completed when adding")
    .action(
      withErrorHandler(async (goalName: string, action: string, identifier: string | undefined, opts: {
        title?: string;
        url?: string;
        type?: string;
        completed?: boolean;
      }) => {
        const container = getContainer();
        const profile = await container.profileRepository.load();
        if (!profile) throw new application.ProfileNotFoundError();
        const goalId = resolveGoalId(profile, goalName);
        const goal = profile.goals.find((g) => g.id === goalId)!;

        if (action === "list") {
          if (goal.resources.length === 0) {
            info("No resources on this goal yet.");
            return;
          }
          table(
            ["", "Type", "Title", "URL"],
            goal.resources.map((r) => [
              r.completed ? "✓" : " ",
              r.type,
              r.title,
              r.url ?? "—",
            ]),
          );
          return;
        }

        if (action === "add") {
          const title = opts.title ?? identifier;
          if (!title) {
            info("Provide --title or a title as the third argument, e.g. `dossier resource 'Learn Rust' add --title 'Rustlings'`.");
            return;
          }
          const result = await application.addResource(container, {
            goalId,
            title,
            url: opts.url,
            type: opts.type ?? "article",
            completed: opts.completed,
          });
          success(`Added resource '${result.resource.title}' (id: ${result.resource.id})`);
          return;
        }

        if (action === "remove" || action === "complete") {
          if (!identifier) {
            info(`Provide the resource id or title to ${action}.`);
            return;
          }
          const target = goal.resources.find((r) => r.id === identifier || r.title === identifier);
          if (!target) {
            info(`No resource matched '${identifier}'. Use \`dossier resource '${goalName}' list\` to see ids.`);
            return;
          }

          if (action === "remove") {
            await application.removeResource(container, { goalId, resourceId: target.id });
            success(`Removed resource '${target.title}'`);
            return;
          }

          // complete
          const result = await application.updateResource(container, {
            goalId,
            resourceId: target.id,
            completed: true,
          });
          success(`Marked '${result.resource.title}' as completed`);
          return;
        }

        info(`Unknown action '${action}'. Use one of: add, list, remove, complete.`);
      }),
    );
}
