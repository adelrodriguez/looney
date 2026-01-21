import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"
import git from "./commands/git"
import render from "./commands/render"
import { readVersion } from "./commands/version" with { type: "macro" }

const version = await readVersion()

const main = Command.make("sakuga").pipe(
  Command.withDescription("Create code animation videos from Markdown."),
  Command.withSubcommands([git, render])
)

const program = Command.run(main, { name: "sakuga", version })

program(process.argv).pipe(
  Effect.catchTags({
    CommandMismatch: (_error) =>
      Console.error(`Invalid command.\n  Run "sakuga --help" for usage.`),
    MultipleValuesDetected: (error) =>
      Console.error(`Multiple values detected: ${error.values.join(", ")}`),
    UnclusteredFlag: (error) =>
      Console.error(
        `Invalid flag format: "${error.unclustered.join("")}".\n  Flags cannot be clustered. Use separate flags instead.`
      ),
  }),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
