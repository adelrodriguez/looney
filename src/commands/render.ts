import { Args, Command, Options } from "@effect/cli"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { Console, Effect } from "effect"
import { DEFAULT_THEME, DEFAULT_TRANSITION_DURATION_MS } from "../lib/constants"
import { InvalidTransitionDuration, NoCodeBlocksFound } from "../lib/errors"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { renderVideo } from "../lib/render/node"
import { resolveTheme } from "../lib/theme"

const file = Args.file({ exists: "yes", name: "file" })
const theme = Options.text("theme").pipe(
  Options.withAlias("t"),
  Options.withDefault(DEFAULT_THEME),
  Options.withDescription("Shiki theme for syntax highlighting.")
)
const transition = Options.integer("transition").pipe(
  Options.withAlias("tr"),
  Options.withDefault(DEFAULT_TRANSITION_DURATION_MS),
  Options.withDescription("Transition duration between slides in milliseconds.")
)

export default Command.make("render", { file, theme, transition }).pipe(
  Command.withDescription("Render a code block to a video."),
  Command.withHandler(({ file, theme, transition }) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const markdown = yield* fileSystem.readFileString(file)
      const blocks = yield* parseMarkdownCodeBlocks(markdown)

      if (blocks.length === 0) {
        return yield* new NoCodeBlocksFound({ reason: "No fenced code blocks found." })
      }

      if (transition <= 0) {
        return yield* new InvalidTransitionDuration({
          duration: transition,
          reason: "Transition duration must be greater than 0.",
        })
      }

      const resolvedTheme = yield* resolveTheme(theme)
      const parsed = path.parse(file)
      const outputPath = path.join(parsed.dir, `${parsed.name}.mp4`)

      yield* Console.log(`Rendering ${blocks.length} code blocks...`)

      yield* renderVideo(outputPath, resolvedTheme, blocks, {
        transitionDurationMs: transition,
      })
      yield* Console.log(`Video created at ${outputPath}`)
    })
  )
)
