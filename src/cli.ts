import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import render from "./commands/render"
import { readVersion } from "./commands/version" with { type: "macro" }
import { WebCodecs } from "./lib/webcodecs"

const version = await readVersion()

const main = Command.make("sakuga").pipe(
  Command.withDescription("Create code animation videos from Markdown."),
  Command.withSubcommands([render])
)

const program = Command.run(main, { name: "sakuga", version })

program(process.argv).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(Layer.mergeAll(NodeContext.layer, WebCodecs.node)),
  NodeRuntime.runMain
)
