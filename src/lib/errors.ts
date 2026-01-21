import { Data } from "effect"

export type FfmpegFormat = "mp4" | "webm"

export class SceneMeasureFailed extends Data.TaggedError("SceneMeasureFailed")<{
  cause: unknown
}> {}

export class UnknownTheme extends Data.TaggedError("UnknownTheme")<{ theme: string }> {}

export class MissingCodeBlockLanguage extends Data.TaggedError("MissingCodeBlockLanguage")<{
  context: "parse" | "codeBlock"
  detail?: string
}> {}

export class UnsupportedLanguage extends Data.TaggedError("UnsupportedLanguage")<{
  language: string
}> {}

export class UnsupportedFileExtension extends Data.TaggedError("UnsupportedFileExtension")<{
  path: string
}> {}

export class GitRepositoryNotFound extends Data.TaggedError("GitRepositoryNotFound")<{
  path: string
}> {}

export class GitCommandFailed extends Data.TaggedError("GitCommandFailed")<{
  args: string[]
  cause?: unknown
  exitCode?: number
}> {}

export class NoGitCommitsFound extends Data.TaggedError("NoGitCommitsFound")<{
  path: string
}> {}

export class NoCodeBlocksFound extends Data.TaggedError("NoCodeBlocksFound")<{ path?: string }> {}

export class InvalidTransitionDuration extends Data.TaggedError("InvalidTransitionDuration")<{
  duration: number
  minimum: number
}> {}

export class MissingFfmpeg extends Data.TaggedError("MissingFfmpeg")<{
  command: string
  cause?: unknown
}> {}

export class FfmpegRenderFailed extends Data.TaggedError("FfmpegRenderFailed")<{
  format: FfmpegFormat
  outputPath: string
  stage: "init" | "stream" | "finish"
  cause?: unknown
  exitCode?: number
  signal?: string
}> {}
