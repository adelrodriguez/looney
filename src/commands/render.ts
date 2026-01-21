import { Args, Command, Options } from "@effect/cli"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { Console, Effect, Option } from "effect"
import { DEFAULT_THEME, DEFAULT_TRANSITION_DURATION_MS } from "../lib/constants"
import { InvalidTransitionDuration, NoCodeBlocksFound } from "../lib/errors"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { resolveTheme } from "../lib/theme"
import { renderVideo } from "../lib/video"

const file = Args.file({ exists: "yes", name: "input" }).pipe(
  Args.withDescription("Markdown file to render")
)
const output = Options.file("output").pipe(
  Options.withAlias("o"),
  Options.withDescription("Destination video path"),
  Options.optional
)

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

const format = Options.choice("format", ["mp4", "webm"] as const).pipe(
  Options.withAlias("f"),
  Options.withDefault("mp4"),
  Options.withDescription("Output container format.")
)

export default Command.make("render", { file, format, output, theme, transition }).pipe(
  Command.withDescription("Render a code block to a video."),
  Command.withHandler(({ file, output, theme, transition, format }) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const markdown = yield* fileSystem.readFileString(file)
      const blocks = yield* parseMarkdownCodeBlocks(markdown)

      if (blocks.length === 0) {
        return yield* new NoCodeBlocksFound({ path: file })
      }

      if (transition <= 0) {
        return yield* new InvalidTransitionDuration({
          duration: transition,
          minimum: 1,
        })
      }

      const resolvedTheme = yield* resolveTheme(theme)
      const outputPath = Option.match(output, {
        onNone: () => {
          const parsed = path.parse(file)
          return path.join(parsed.dir, `${parsed.name}.${format}`)
        },
        onSome: (value) => value,
      })

      yield* Console.log(`Rendering ${blocks.length} code blocks to ${outputPath}...`)
      yield* renderVideo(outputPath, resolvedTheme, blocks, {
        format,
        transitionDurationMs: transition,
      })
      yield* Console.log(`Video created at ${outputPath}`)
    })
  )
)
