import * as OS from "node:os"
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import { Effect, Ref, Stream } from "effect"
import {
  FilePathTarget,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSample,
  VideoSampleSource,
} from "mediabunny"
import type { CanvasContext } from "./context"
import type { CodeBlock, RenderFrame } from "./types"
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_TRANSITION_DURATION_MS,
  DEFAULT_WIDTH,
} from "./constants"
import { buildFramesStream, computeFrameCounts, renderFrame } from "./render"
import { layoutScene, measureScene, resolveFrameSize } from "./scene"
import { WebCodecs } from "./webcodecs"

export type RenderVideoOptions = {
  concurrency?: number
  transitionDurationMs?: number
}

const resolveConcurrency = () => Effect.sync(() => Math.min(4, OS.availableParallelism()))

const makeOutput = (outputPath: string) =>
  Effect.sync(
    () =>
      new Output({
        format: new Mp4OutputFormat(),
        target: new FilePathTarget(outputPath),
      })
  )

const makeVideoSource = () =>
  Effect.sync(
    () =>
      new VideoSampleSource({
        bitrate: QUALITY_HIGH,
        codec: "avc",
        onEncoderConfig: (config) => {
          const encoderConfig = config as { useWorkerThread?: boolean }
          encoderConfig.useWorkerThread = false
        },
      })
  )

const renderAndWriteFrame =
  (
    context: CanvasContext,
    output: Output,
    videoSource: VideoSampleSource,
    frameDuration: number,
    frameIndexRef: Ref.Ref<number>,
    width: number,
    height: number
  ) =>
  (frame: RenderFrame) =>
    Effect.gen(function* () {
      const frameIndex = yield* Ref.get(frameIndexRef)
      renderFrame(context, width, height, frame)

      const rgba = (context as SKRSContext2D).canvas.data()
      const sample = new VideoSample(rgba, {
        codedHeight: height,
        codedWidth: width,
        duration: frameDuration,
        format: "RGBA",
        timestamp: frameIndex * frameDuration,
      })

      yield* Effect.tryPromise({
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        try: () => videoSource.add(sample),
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            sample.close()
          })
        )
      )
      yield* Ref.set(frameIndexRef, frameIndex + 1)
    })

export const renderVideo = (
  outputPath: string,
  theme: string,
  codeBlocks: CodeBlock[],
  options: RenderVideoOptions = {}
) =>
  Effect.gen(function* () {
    yield* WebCodecs

    const concurrency = options.concurrency ?? (yield* resolveConcurrency())
    const transitionDurationMs = options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS

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

    const canvas = createCanvas(width, height)
    const context = canvas.getContext("2d")

    const scenes = measuredScenes.map((measured) => layoutScene(measured, width, height))

    const frameCounts = computeFrameCounts(transitionDurationMs)
    const frameIndexRef = yield* Ref.make(0)

    return yield* Effect.scoped(
      Effect.gen(function* () {
        const output = yield* Effect.acquireRelease(makeOutput(outputPath), (resource) =>
          Effect.tryPromise({
            catch: (error) => (error instanceof Error ? error : new Error(String(error))),
            try: () => resource.finalize(),
          }).pipe(Effect.orDie)
        )
        const videoSource = yield* Effect.acquireRelease(makeVideoSource(), (resource) =>
          Effect.sync(() => {
            resource.close()
          })
        )

        yield* Effect.sync(() => {
          output.addVideoTrack(videoSource, { frameRate: DEFAULT_FPS })
        })

        yield* Effect.tryPromise({
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
          try: () => output.start(),
        })

        const frameStream = buildFramesStream(
          scenes,
          frameCounts.blockFrames,
          frameCounts.transitionFrames
        )

        yield* Stream.runForEach(
          frameStream,
          renderAndWriteFrame(
            context,
            output,
            videoSource,
            frameCounts.frameDuration,
            frameIndexRef,
            width,
            height
          )
        )

        return outputPath
      })
    )
  })
