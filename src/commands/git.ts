import { Args, Command } from "@effect/cli"
import * as Path from "@effect/platform/Path"
import { Console, Effect, Option } from "effect"
import type { RenderConfig } from "../lib/types"
import { InvalidTransitionDuration, NoCodeBlocksFound } from "../lib/errors"
import { loadGitHistoryBlocks } from "../lib/git"
import { resolveTheme } from "../lib/theme"
import { renderVideo } from "../lib/video"
import {
  background,
  blockDuration,
  commits,
  fontFamily,
  fontSize,
  foreground,
  format,
  fps,
  height,
  language,
  lineHeight,
  output,
  padding,
  reverse,
  tabReplacement,
  theme,
  transitionDrift,
  transitionDurationMs,
  width,
} from "./options"

const file = Args.file({ exists: "yes", name: "input" }).pipe(
  Args.withDescription("File to render git history from")
)

const gitOptions = {
  background,
  blockDuration,
  commits,
  file,
  fontFamily,
  fontSize,
  foreground,
  format,
  fps,
  height,
  language,
  lineHeight,
  output,
  padding,
  reverse,
  tabReplacement,
  theme,
  transitionDrift,
  transitionDurationMs,
  width,
}

export default Command.make("git", gitOptions).pipe(
  Command.withDescription("Render a video from git history for a file"),
  Command.withHandler(
    ({
      background,
      blockDuration,
      commits,
      file,
      fontFamily,
      fontSize,
      foreground,
      fps,
      format,
      height,
      language,
      lineHeight,
      output,
      padding,
      reverse,
      tabReplacement,
      theme,
      transitionDrift,
      transitionDurationMs,
      width,
    }) =>
      Effect.gen(function* () {
        const path = yield* Path.Path

        if (transitionDurationMs <= 0) {
          return yield* new InvalidTransitionDuration({
            duration: transitionDurationMs,
            minimum: 1,
          })
        }

        const resolvedTheme = yield* resolveTheme(theme)
        const cwd = process.cwd()

        const blocks = yield* loadGitHistoryBlocks(
          cwd,
          file,
          commits,
          reverse,
          Option.getOrUndefined(language)
        )

        if (blocks.length === 0) {
          return yield* new NoCodeBlocksFound({ path: file })
        }

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

        yield* Console.log(`Rendering ${blocks.length} commits to ${outputPath}...`)

        yield* renderVideo(outputPath, resolvedTheme, blocks, renderConfig, { format })

        yield* Console.log(`Video created at ${outputPath}`)
      }).pipe(
        Effect.catchTags({
          FfmpegRenderFailed: (error) => {
            const stageMessage = {
              finish: "finalizing the video file",
              init: "starting the FFmpeg process",
              stream: "writing video frames",
            }[error.stage]

            let message = `FFmpeg failed while ${stageMessage}.\n`
            message += `  Output: ${error.outputPath}\n`
            message += `  Format: ${error.format}`

            if (error.exitCode !== undefined) {
              message += `\n  Exit code: ${error.exitCode}`
            }
            if (error.signal) {
              message += `\n  Signal: ${error.signal}`
            }

            return Console.error(message)
          },
          GitCommandFailed: (error) => {
            let message = `Git command failed: git ${error.args.join(" ")}`
            if (error.exitCode !== undefined) {
              message += `\n  Exit code: ${error.exitCode}`
            }
            return Console.error(message)
          },
          GitRepositoryNotFound: (error) =>
            Console.error(
              `Not a git repository: ${error.path}\n` +
                `  Run this command from within a git repository.`
            ),
          InvalidTransitionDuration: (error) =>
            Console.error(
              `Invalid transition duration: ${error.duration}ms.\n` +
                `  Minimum allowed: ${error.minimum}ms`
            ),
          MissingFfmpeg: () =>
            Console.error(
              `FFmpeg is not installed or not in PATH.\n` +
                `  Install FFmpeg to render videos: https://ffmpeg.org/download.html`
            ),
          NoCodeBlocksFound: (error) =>
            Console.error(
              `No code blocks found${error.path ? ` in ${error.path}` : ""}.\n` +
                `  The file may have no git history or commits.`
            ),
          NoGitCommitsFound: (error) =>
            Console.error(
              `No git commits found for: ${error.path}\n` +
                `  The file must have at least one commit in git history.`
            ),
          SceneMeasureFailed: (error) => {
            const details =
              error.cause instanceof Error ? `\n  Details: ${error.cause.message}` : ""
            return Console.error(
              `Failed to process code block.\n  The syntax highlighter could not tokenize the code.${details}`
            )
          },
          UnknownTheme: (error) =>
            Console.error(
              `Unknown theme: "${error.theme}".\n` +
                `  See available themes: https://shiki.style/themes`
            ),
          UnsupportedFileExtension: (error) =>
            Console.error(
              `Cannot determine language for: ${error.path}\n` +
                `  Use --language to specify the language manually.`
            ),
          UnsupportedLanguage: (error) =>
            Console.error(
              `Unsupported language: "${error.language}".\n` +
                `  See supported languages: https://shiki.style/languages`
            ),
        })
      )
  )
)
