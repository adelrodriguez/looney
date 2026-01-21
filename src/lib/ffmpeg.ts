import { Command as ShellCommand } from "@effect/platform"
import { Effect } from "effect"
import { MissingFfmpeg, type FfmpegFormat } from "./errors"

const FFMPEG_BINARY = "ffmpeg"

const CODEC_BY_FORMAT: Record<FfmpegFormat, string> = {
  mp4: "libx264",
  webm: "libvpx-vp9",
}

const PIX_FMT_BY_FORMAT: Record<FfmpegFormat, string> = {
  mp4: "yuv420p",
  webm: "yuv420p",
}

const QUALITY_ARGS_BY_FORMAT: Record<FfmpegFormat, readonly string[]> = {
  mp4: ["-crf", "12", "-preset", "slow", "-profile:v", "high", "-level:v", "4.1"],
  webm: ["-crf", "20", "-b:v", "0"],
}

const CONTAINER_ARGS_BY_FORMAT: Record<FfmpegFormat, readonly string[]> = {
  mp4: ["-movflags", "+faststart"],
  webm: [],
}

const ensureEven = (value: number) => (value % 2 === 0 ? value : value + 1)

export const ensureEvenDimensions = (format: FfmpegFormat, width: number, height: number) => {
  if (PIX_FMT_BY_FORMAT[format] !== "yuv420p") {
    return { height, width }
  }

  return {
    height: ensureEven(height),
    width: ensureEven(width),
  }
}

const buildArgs = (
  format: FfmpegFormat,
  width: number,
  height: number,
  fps: number,
  inputPath: string,
  outputPath: string
) => [
  "-f",
  "rawvideo",
  "-pix_fmt",
  "rgba",
  "-s",
  `${width}x${height}`,
  "-r",
  `${fps}`,
  "-i",
  inputPath,
  "-vf",
  "unsharp=5:5:0.5:5:5:0.5",
  "-c:v",
  CODEC_BY_FORMAT[format],
  ...QUALITY_ARGS_BY_FORMAT[format],
  "-pix_fmt",
  PIX_FMT_BY_FORMAT[format],
  ...CONTAINER_ARGS_BY_FORMAT[format],
  "-y",
  outputPath,
]

const ffmpegCheckCommand = process.platform === "win32" ? "where" : "which"

export const ensureFfmpegAvailable = Effect.fn("ensureFfmpegAvailable")(function* () {
  const exitCode = yield* ShellCommand.make(ffmpegCheckCommand, FFMPEG_BINARY).pipe(
    ShellCommand.stderr("pipe"),
    ShellCommand.stdout("pipe"),
    ShellCommand.exitCode,
    Effect.mapError((cause) => new MissingFfmpeg({ cause, command: FFMPEG_BINARY }))
  )

  if (Number(exitCode) !== 0) {
    return yield* new MissingFfmpeg({ command: FFMPEG_BINARY })
  }
})

export const startFfmpegProcess = (
  format: FfmpegFormat,
  width: number,
  height: number,
  fps: number,
  inputPath: string,
  outputPath: string
) =>
  ShellCommand.make(
    FFMPEG_BINARY,
    ...buildArgs(format, width, height, fps, inputPath, outputPath)
  ).pipe(
    ShellCommand.stdin("inherit"),
    ShellCommand.stdout("inherit"),
    ShellCommand.stderr("inherit"),
    ShellCommand.start
  )
