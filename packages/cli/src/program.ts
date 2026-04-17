import { Command } from "commander";
import { CLI_VERSION } from "./index.js";
import { createContainer } from "./container.js";
import type { Container } from "./container.js";
import { registerInitCommand } from "./commands/init.js";
import { registerAddCommand } from "./commands/add.js";
import { registerListCommand } from "./commands/list.js";
import { registerEditCommand } from "./commands/edit.js";
import { registerRemoveCommand } from "./commands/remove.js";
import { registerLearnCommand } from "./commands/learn.js";
import { registerGoalsCommand } from "./commands/goals.js";
import { registerProgressCommand } from "./commands/progress.js";
import { registerInterestCommand } from "./commands/interest.js";
import { registerExportCommand } from "./commands/export.js";
import { registerProjectCommand } from "./commands/project.js";

function getContainer(program: Command): Container {
  const opts = program.opts<{ profile?: string }>();
  return createContainer(opts.profile);
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("dossier")
    .description("Personal knowledge profile tool for LLM personalization")
    .version(CLI_VERSION)
    .option("--profile <path>", "Path to profile file");

  // Use a lazy getter so --profile is resolved after parsing
  const lazyContainer = () => getContainer(program);

  registerInitCommand(program, lazyContainer);
  registerAddCommand(program, lazyContainer);
  registerListCommand(program, lazyContainer);
  registerEditCommand(program, lazyContainer);
  registerRemoveCommand(program, lazyContainer);
  registerLearnCommand(program, lazyContainer);
  registerGoalsCommand(program, lazyContainer);
  registerProgressCommand(program, lazyContainer);
  registerInterestCommand(program, lazyContainer);
  registerExportCommand(program, lazyContainer);
  registerProjectCommand(program, lazyContainer);

  return program;
}
