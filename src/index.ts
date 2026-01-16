import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const main = Command.make("looney").pipe(
  Command.withDescription("Create a new project using the `init` template."),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("Not implemented")
    })
  )
)

const cli = Command.run(main, {
  name: "init-now",
  version: "2.0.0",
})

cli(process.argv).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
