import { availableParallelism } from "node:os"
import type { BundledTheme } from "shiki"
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import { Effect, Stream } from "effect"
import type { CanvasContext } from "./context"
import type { CodeBlock, RenderFrame } from "./types"
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_TRANSITION_DURATION_MS,
  DEFAULT_WIDTH,
} from "./constants"
import { FfmpegRenderFailed, type FfmpegFormat } from "./errors"
import { ensureEvenDimensions, ensureFfmpegAvailable, startFfmpegProcess } from "./ffmpeg"
import { buildFramesStream, computeFrameCounts, renderFrame } from "./render"
import { layoutScene, measureScene, resolveFrameSize } from "./scene"

export type RenderVideoOptions = {
  concurrency?: number
  transitionDurationMs?: number
  format?: FfmpegFormat
  fps?: number
}

const frameToBytes = (context: CanvasContext, width: number, height: number) =>
  Effect.fn("renderVideo.frameToBytes")((frame: RenderFrame) =>
    Effect.sync(() => {
      renderFrame(context, width, height, frame)
      const bytes = (context as SKRSContext2D).canvas.data()
      return Buffer.from(bytes)
    })
  )

export const renderVideo = Effect.fn(function* renderVideo(
  outputPath: string,
  theme: BundledTheme,
  codeBlocks: CodeBlock[],
  options: RenderVideoOptions = {}
) {
  yield* ensureFfmpegAvailable()

  const concurrency = options.concurrency ?? Math.min(4, availableParallelism())
  const transitionDurationMs = options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS
  const fps = options.fps ?? DEFAULT_FPS
  const format = options.format ?? "mp4"

  const measuredScenes = yield* Effect.forEach(
    codeBlocks,
    (codeBlock) =>
      Effect.gen(function* () {
        const measurementContext = createCanvas(1, 1).getContext("2d")
        return yield* measureScene(measurementContext, codeBlock, theme as never)
      }),
    { concurrency }
  )

  const { width, height } = resolveFrameSize(measuredScenes, DEFAULT_WIDTH, DEFAULT_HEIGHT)
  const { height: evenHeight, width: evenWidth } = ensureEvenDimensions(format, width, height)

  const canvas = createCanvas(evenWidth, evenHeight)
  const context = canvas.getContext("2d")

  const scenes = measuredScenes.map((measured) => layoutScene(measured, evenWidth, evenHeight))

  const frameCounts = computeFrameCounts(transitionDurationMs, fps)
  const frameStream = buildFramesStream(
    scenes,
    frameCounts.blockFrames,
    frameCounts.transitionFrames
  )
  const frameBytesStream = frameStream.pipe(
    Stream.mapEffect(frameToBytes(context, evenWidth, evenHeight))
  )

  return yield* Effect.scoped(
    Effect.gen(function* () {
      const process = yield* Effect.acquireRelease(
        startFfmpegProcess(format, evenWidth, evenHeight, fps, outputPath).pipe(
          Effect.mapError(
            (cause) =>
              new FfmpegRenderFailed({
                cause,
                format,
                outputPath,
                stage: "init",
              })
          )
        ),
        (process) => process.kill("SIGTERM").pipe(Effect.orDie)
      )

      yield* Stream.run(frameBytesStream, process.stdin).pipe(
        Effect.mapError(
          (cause) =>
            new FfmpegRenderFailed({
              cause,
              format,
              outputPath,
              stage: "stream",
            })
        )
      )

      const exitCode = yield* process.exitCode
      if (exitCode === null || Number(exitCode) !== 0) {
        return yield* new FfmpegRenderFailed({
          ...(exitCode !== null && { exitCode: Number(exitCode) }),
          format,
          outputPath,
          stage: "finish",
        })
      }

      return outputPath
    })
  )
})
