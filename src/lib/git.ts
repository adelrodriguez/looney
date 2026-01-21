import { Command as ShellCommand } from "@effect/platform"
import * as Path from "@effect/platform/Path"
import { Chunk, Effect, Stream } from "effect"
import { bundledLanguages, type BundledLanguage } from "shiki"
import type { CodeBlock } from "./types"
import {
  GitCommandFailed,
  GitRepositoryNotFound,
  NoGitCommitsFound,
  UnsupportedFileExtension,
  UnsupportedLanguage,
} from "./errors"

const GIT_BINARY = "git"

function checkIsSupportedLanguage(language: string): language is BundledLanguage {
  return Object.hasOwn(bundledLanguages, language)
}

function resolveLanguageOverride(override: string | undefined) {
  if (!override) {
    return
  }
  const normalized = override.trim().toLowerCase()
  if (normalized.length === 0) {
    return
  }
  return normalized
}

function decodeChunks(chunks: Chunk.Chunk<Uint8Array>) {
  return Buffer.concat(Chunk.toArray(chunks).map((chunk) => Buffer.from(chunk))).toString("utf8")
}

const runGitString = Effect.fn(function* runGitString(cwd: string, args: string[]) {
  return yield* Effect.scoped(
    Effect.gen(function* () {
      const command = ShellCommand.make(GIT_BINARY, ...args).pipe(
        ShellCommand.workingDirectory(cwd),
        ShellCommand.stdout("pipe"),
        ShellCommand.stderr("pipe")
      )

      const process = yield* ShellCommand.start(command).pipe(
        Effect.mapError((cause) => new GitCommandFailed({ args, cause }))
      )

      const [stdoutChunks, stderrChunks, exitCode] = yield* Effect.all([
        Stream.runCollect(process.stdout),
        Stream.runCollect(process.stderr),
        process.exitCode,
      ]).pipe(Effect.mapError((cause) => new GitCommandFailed({ args, cause })))

      const stdout = decodeChunks(stdoutChunks)
      const stderr = decodeChunks(stderrChunks)
      const exitCodeNumber = Number(exitCode)

      if (exitCodeNumber !== 0) {
        if (stderr.length > 0) {
          return yield* new GitCommandFailed({
            args,
            cause: new Error(stderr),
            exitCode: exitCodeNumber,
          })
        }
        return yield* new GitCommandFailed({
          args,
          exitCode: exitCodeNumber,
        })
      }

      return stdout
    })
  )
})

export const resolveLanguage = Effect.fn(function* resolveLanguage(
  filePath: string,
  override?: string
) {
  const path = yield* Path.Path
  const languageOverride = resolveLanguageOverride(override)
  const extensionLanguage = path.extname(filePath).replace(/^\./, "").trim().toLowerCase()
  const language = (languageOverride ?? extensionLanguage) || undefined

  if (!language) {
    return yield* new UnsupportedFileExtension({ path: filePath })
  }

  if (!checkIsSupportedLanguage(language)) {
    return yield* new UnsupportedLanguage({ language: override ?? language })
  }

  return language
})

export const resolveGitRepoRoot = Effect.fn(function* resolveGitRepoRoot(cwd: string) {
  const output = yield* runGitString(cwd, ["rev-parse", "--show-toplevel"]).pipe(
    Effect.catchTag("GitCommandFailed", () => new GitRepositoryNotFound({ path: cwd }))
  )

  const repoRoot = output.trim()
  if (!repoRoot) {
    return yield* new GitRepositoryNotFound({ path: cwd })
  }

  return repoRoot
})

export const listGitCommits = Effect.fn(function* listGitCommits(
  cwd: string,
  filePath: string,
  count: number
) {
  // Use --name-only to capture the filename at each commit, which may differ due to renames
  const output = yield* runGitString(cwd, [
    "log",
    "--follow",
    `-n${count}`,
    "--pretty=format:%H",
    "--name-only",
    "--",
    filePath,
  ])

  const pattern = /([a-f0-9]{40})\n+([^\n]+)/gi
  const commits = [...output.matchAll(pattern)]
    .filter((match): match is RegExpExecArray & { 1: string; 2: string } =>
      Boolean(match[1] && match[2])
    )
    .map((match) => ({
      commit: match[1],
      pathAtCommit: match[2],
    }))

  if (commits.length === 0) {
    return yield* new NoGitCommitsFound({ path: filePath })
  }

  return commits
})

export const loadGitHistoryBlocks = Effect.fn(function* loadGitHistoryBlocks(
  cwd: string,
  filePath: string,
  commitCount: number,
  reverse: boolean,
  languageOverride?: string
) {
  const path = yield* Path.Path
  const repoRoot = yield* resolveGitRepoRoot(cwd)
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath)
  const relativeFile = path.relative(repoRoot, absoluteFilePath)

  if (!relativeFile || relativeFile.startsWith("..")) {
    return yield* new GitRepositoryNotFound({ path: filePath })
  }

  const commitInfos = yield* listGitCommits(repoRoot, relativeFile, commitCount)
  const language = yield* resolveLanguage(relativeFile, languageOverride)
  const ordered = reverse ? commitInfos : commitInfos.toReversed()

  return yield* Effect.all(
    ordered.map(({ commit, pathAtCommit }) =>
      runGitString(repoRoot, ["show", `${commit}:${pathAtCommit}`]).pipe(
        Effect.map((code) => ({ code, language }) satisfies CodeBlock)
      )
    )
  )
})
