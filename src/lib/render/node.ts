import * as OS from "node:os"
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import { Effect } from "effect"
import {
  FilePathTarget,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSample,
  VideoSampleSource,
} from "mediabunny"
import type { CanvasContext } from "../context"
import type { CodeBlock, RenderFrame } from "../types"
import { NodeRenderFailed } from "../errors"
import { measureScene } from "../scene"
import { renderPipeline, type RenderPipelineOptions } from "./core"

export type RenderVideoOptions = RenderPipelineOptions

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

const measureScenes = (codeBlocks: CodeBlock[], theme: string, options: RenderPipelineOptions) =>
  Effect.gen(function* () {
    const concurrency = options.concurrency ?? Math.min(4, OS.availableParallelism())
    return yield* Effect.forEach(
      codeBlocks,
      (codeBlock) =>
        Effect.gen(function* () {
          const measurementContext = createCanvas(1, 1).getContext("2d")
          return yield* measureScene(measurementContext, codeBlock, theme as never)
        }),
      { concurrency }
    )
  }).pipe(
    Effect.mapError(
      (cause) =>
        new NodeRenderFailed({
          cause,
          reason: "Unable to measure scenes in node renderer.",
        })
    )
  )

const makeRenderContext = (height: number, width: number) =>
  Effect.sync(() => createCanvas(width, height).getContext("2d"))

const createFrameWriter =
  (outputPath: string) =>
  ({
    frameDuration,
    frameRate,
    height,
    width,
  }: {
    frameDuration: number
    frameRate: number
    height: number
    width: number
  }) =>
    Effect.gen(function* () {
      const output = yield* Effect.acquireRelease(makeOutput(outputPath), (resource) =>
        Effect.tryPromise({
          catch: (cause) =>
            new NodeRenderFailed({
              cause,
              reason: "Unable to finalize node output stream.",
            }),
          try: () => resource.finalize(),
        }).pipe(Effect.orDie)
      )
      const videoSource = yield* Effect.acquireRelease(makeVideoSource(), (resource) =>
        Effect.sync(() => {
          resource.close()
        })
      )

      yield* Effect.sync(() => {
        output.addVideoTrack(videoSource, { frameRate })
      })

      yield* Effect.tryPromise({
        catch: (cause) =>
          new NodeRenderFailed({
            cause,
            reason: "Unable to start node output stream.",
          }),
        try: () => output.start(),
      })

      const writeFrame = (context: CanvasContext, _frame: RenderFrame, frameIndex: number) =>
        Effect.gen(function* () {
          const rgba = (context as SKRSContext2D).canvas.data()
          const sample = new VideoSample(rgba, {
            codedHeight: height,
            codedWidth: width,
            duration: frameDuration,
            format: "RGBA",
            timestamp: frameIndex * frameDuration,
          })

          yield* Effect.tryPromise({
            catch: (cause) =>
              new NodeRenderFailed({
                cause,
                reason: "Unable to encode node video frame.",
              }),
            try: () => videoSource.add(sample),
          }).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                sample.close()
              })
            )
          )
        })

      const finalize = () => Effect.succeed(outputPath)

      return {
        finalize,
        writeFrame,
      }
    }).pipe(
      Effect.mapError(
        (cause) =>
          new NodeRenderFailed({
            cause,
            reason: "Unable to create node frame writer.",
          })
      )
    )

export const renderVideo = (
  outputPath: string,
  theme: string,
  codeBlocks: CodeBlock[],
  options: RenderVideoOptions = {}
) =>
  renderPipeline(
    theme,
    codeBlocks,
    {
      createFrameWriter: createFrameWriter(outputPath),
      makeRenderContext,
      measureScenes,
    },
    options
  ).pipe(
    Effect.mapError(
      (cause) =>
        new NodeRenderFailed({
          cause,
          reason: "Unable to render video in node.",
        })
    )
  )
