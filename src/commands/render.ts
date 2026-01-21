import { Args, Command } from "@effect/cli"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { Console, Effect, Option } from "effect"
import type { RenderConfig } from "../lib/types"
import { InvalidTransitionDuration, NoCodeBlocksFound } from "../lib/errors"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { resolveTheme } from "../lib/theme"
import { renderVideo } from "../lib/video"
import {
  background,
  blockDuration,
  fontFamily,
  fontSize,
  foreground,
  format,
  fps,
  height,
  lineHeight,
  output,
  padding,
  tabReplacement,
  theme,
  transitionDrift,
  transitionDurationMs,
  width,
} from "./options"

const file = Args.file({ exists: "yes", name: "input" }).pipe(
  Args.withDescription("Markdown file to render")
)

export default Command.make("render", {
  background,
  blockDuration,
  file,
  fontFamily,
  fontSize,
  foreground,
  format,
  fps,
  height,
  lineHeight,
  output,
  padding,
  tabReplacement,
  theme,
  transitionDrift,
  transitionDurationMs,
  width,
}).pipe(
  Command.withDescription("Render a video from code blocks in a Markdown file"),
  Command.withHandler(
    ({
      background,
      blockDuration,
      file,
      fontFamily,
      fontSize,
      foreground,
      fps,
      height,
      lineHeight,
      output,
      padding,
      tabReplacement,
      theme,
      transitionDrift,
      transitionDurationMs,
      width,
      format,
    }) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem
        const path = yield* Path.Path

        const markdown = yield* fileSystem.readFileString(file)
        const blocks = yield* parseMarkdownCodeBlocks(markdown)

        if (blocks.length === 0) {
          return yield* new NoCodeBlocksFound({ path: file })
        }

        if (transitionDurationMs <= 0) {
          return yield* new InvalidTransitionDuration({
            duration: transitionDurationMs,
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

        const renderConfig: RenderConfig = {
          background,
          blockDuration,
          fontFamily,
          fontSize,
          foreground,
          fps,
          height,
          lineHeight,
          padding,
          tabReplacement,
          transitionDrift,
          transitionDurationMs,
          width,
        }

        yield* Console.log(`Rendering ${blocks.length} code blocks to ${outputPath}...`)
        yield* renderVideo(outputPath, resolvedTheme, blocks, renderConfig, { format })
        yield* Console.log(`Video created at ${outputPath}`)
      })
  )
)
