import { Effect } from "effect"
import {
  BufferTarget,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSample,
  VideoSampleSource,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
} from "mediabunny"
import type { CanvasContext } from "../context"
import type { CodeBlock, RenderFrame } from "../types"
import {
  BrowserRenderFailed,
  CanvasContextUnavailable,
  MissingCanvasFactory,
  NoEncodableVideoCodec,
  OutputBufferMissing,
} from "../errors"
import { measureScene } from "../scene"
import { WebCodecs } from "../webcodecs"
import { renderPipeline, type RenderPipelineOptions } from "./core"

export type BrowserFormat = "mp4" | "webm" | "auto"

export type CanvasLike = {
  getContext: (type: "2d") => CanvasContext | null
  height: number
  width: number
}

export type CanvasFactory = (height: number, width: number) => CanvasLike

export type BrowserOutput = {
  data: Uint8Array
  extension: "mp4" | "webm"
  mimeType: string
}

export type RenderVideoBrowserOptions = RenderPipelineOptions & {
  canvas?: CanvasLike
  createCanvas?: CanvasFactory
  format?: BrowserFormat
}

const getCanvasContext = (canvas: CanvasLike) =>
  Effect.gen(function* () {
    const context = yield* Effect.try({
      catch: (cause: unknown) =>
        new BrowserRenderFailed({
          cause,
          reason: "Unable to acquire 2D canvas context.",
        }),
      try: () => canvas.getContext("2d"),
    })
    if (!context) {
      return yield* new CanvasContextUnavailable({
        reason: "Unable to acquire 2D canvas context.",
      })
    }

    return context
  })

const ensureWebCodecs = () => WebCodecs

type ResolvedCodec = "avc" | "vp9" | "vp8" | "hevc" | "av1"

type ResolvedFormat = {
  codec: ResolvedCodec
  container: "mp4" | "webm"
}

const resolveFormat = (format: BrowserFormat, height: number, width: number) =>
  Effect.gen(function* () {
    const codecOptions = { bitrate: QUALITY_HIGH, height, width }

    if (format === "mp4") {
      const codec = yield* Effect.tryPromise({
        catch: () =>
          new NoEncodableVideoCodec({
            reason: "No encodable video codec available for MP4 in this browser.",
          }),
        try: () => getFirstEncodableVideoCodec(["avc", "hevc", "av1"], codecOptions),
      })

      if (!codec) {
        return yield* new NoEncodableVideoCodec({
          reason: "No encodable video codec available for MP4 in this browser.",
        })
      }

      return { codec, container: "mp4" } satisfies ResolvedFormat
    }

    if (format === "webm") {
      const codec = yield* Effect.tryPromise({
        catch: () =>
          new NoEncodableVideoCodec({
            reason: "No encodable video codec available for WebM in this browser.",
          }),
        try: () => getFirstEncodableVideoCodec(["vp9", "vp8", "av1"], codecOptions),
      })

      if (!codec) {
        return yield* new NoEncodableVideoCodec({
          reason: "No encodable video codec available for WebM in this browser.",
        })
      }

      return { codec, container: "webm" } satisfies ResolvedFormat
    }

    const codec = yield* Effect.tryPromise({
      catch: () =>
        new NoEncodableVideoCodec({
          reason: "No encodable video codec available in this browser.",
        }),
      try: () => getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], codecOptions),
    })

    if (!codec) {
      return yield* new NoEncodableVideoCodec({
        reason: "No encodable video codec available in this browser.",
      })
    }

    return {
      codec,
      container: codec === "avc" ? "mp4" : "webm",
    } satisfies ResolvedFormat
  })

const makeOutput = (format: "mp4" | "webm") =>
  Effect.try({
    catch: (cause: unknown) =>
      new BrowserRenderFailed({
        cause,
        reason: "Unable to create output.",
      }),
    try: () => {
      const resolvedFormat = format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat()
      const target = new BufferTarget()

      const outputInstance = new Output({
        format: resolvedFormat,
        target,
      })

      return {
        mimeType: resolvedFormat.mimeType,
        output: outputInstance,
        target,
      }
    },
  })

const makeVideoSource = (codec: ResolvedCodec) =>
  Effect.try({
    catch: (cause: unknown) =>
      new BrowserRenderFailed({
        cause,
        reason: "Unable to create video source.",
      }),
    try: () =>
      new VideoSampleSource({
        bitrate: QUALITY_HIGH,
        codec,
      }),
  })

const resolveCanvas = (
  canvas: CanvasLike | undefined,
  height: number,
  width: number,
  createCanvas?: CanvasFactory
) =>
  Effect.gen(function* () {
    if (canvas) {
      const context = yield* getCanvasContext(canvas)

      return {
        canvas,
        context,
      }
    }

    if (!createCanvas) {
      return yield* new MissingCanvasFactory({
        reason: "Browser canvas factory is required when no canvas is provided.",
      })
    }

    const created = yield* Effect.try({
      catch: (cause: unknown) =>
        new BrowserRenderFailed({
          cause,
          reason: "Unable to create canvas.",
        }),
      try: () => createCanvas(height, width),
    })
    const context = yield* getCanvasContext(created)

    return {
      canvas: created,
      context,
    }
  })

const measureScenes = (
  codeBlocks: CodeBlock[],
  theme: string,
  options: RenderVideoBrowserOptions
) =>
  Effect.gen(function* () {
    const createCanvas = options.createCanvas
    const concurrency = options.concurrency

    if (createCanvas) {
      return yield* Effect.forEach(
        codeBlocks,
        (codeBlock) =>
          Effect.gen(function* () {
            const measurementContext = yield* getCanvasContext(createCanvas(1, 1))
            return yield* measureScene(measurementContext, codeBlock, theme as never)
          }),
        { concurrency }
      )
    }

    const { context: sharedMeasurementContext } = yield* resolveCanvas(
      options.canvas,
      1,
      1,
      createCanvas
    )
    return yield* Effect.forEach(
      codeBlocks,
      (codeBlock) => measureScene(sharedMeasurementContext, codeBlock, theme as never),
      { concurrency: 1 }
    )
  }).pipe(
    Effect.mapError(
      (cause) =>
        new BrowserRenderFailed({
          cause,
          reason: "Unable to measure scenes in browser renderer.",
        })
    )
  )

const makeRenderContext = (options: RenderVideoBrowserOptions, height: number, width: number) =>
  Effect.gen(function* () {
    const { canvas } = yield* resolveCanvas(options.canvas, height, width, options.createCanvas)

    if (canvas.width !== width) {
      canvas.width = width
    }
    if (canvas.height !== height) {
      canvas.height = height
    }

    return yield* getCanvasContext(canvas)
  }).pipe(
    Effect.mapError(
      (cause) =>
        new BrowserRenderFailed({
          cause,
          reason: "Unable to create browser render context.",
        })
    )
  )

const createFrameWriter =
  (
    resolvedFormat: ResolvedFormat,
    outputInfo: { output: Output; target: BufferTarget; mimeType: string }
  ) =>
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
      const videoSource = yield* Effect.acquireRelease(
        makeVideoSource(resolvedFormat.codec),
        (vs) =>
          Effect.sync(() => {
            vs.close()
          })
      )

      yield* Effect.try({
        catch: (cause: unknown) =>
          new BrowserRenderFailed({
            cause,
            reason: "Unable to add output video track.",
          }),
        try: () => {
          outputInfo.output.addVideoTrack(videoSource, { frameRate })
        },
      })

      yield* Effect.tryPromise({
        catch: (cause: unknown) =>
          new BrowserRenderFailed({
            cause,
            reason: "Unable to start output stream.",
          }),
        try: () => outputInfo.output.start(),
      })

      const writeFrame = (context: CanvasContext, _frame: RenderFrame, frameIndex: number) =>
        Effect.gen(function* () {
          const imageData = yield* Effect.try({
            catch: (cause: unknown) =>
              new BrowserRenderFailed({
                cause,
                reason: "Unable to read frame image data.",
              }),
            try: () => context.getImageData(0, 0, width, height),
          })
          const sample = new VideoSample(imageData.data, {
            codedHeight: height,
            codedWidth: width,
            duration: frameDuration,
            format: "RGBA",
            timestamp: frameIndex * frameDuration,
          })

          yield* Effect.tryPromise({
            catch: (cause: unknown) =>
              new BrowserRenderFailed({
                cause,
                reason: "Unable to encode video frame.",
              }),
            try: () => videoSource.add(sample),
          }).pipe(
            Effect.ensuring(
              Effect.try({
                catch: (cause: unknown) =>
                  new BrowserRenderFailed({
                    cause,
                    reason: "Unable to close video sample.",
                  }),
                try: () => {
                  sample.close()
                },
              }).pipe(Effect.orDie)
            )
          )
        })

      const finalize = () =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            catch: (cause: unknown) =>
              new BrowserRenderFailed({
                cause,
                reason: "Unable to finalize output stream.",
              }),
            try: () => outputInfo.output.finalize(),
          })

          const buffer = outputInfo.target.buffer
          if (!buffer) {
            return yield* new OutputBufferMissing({
              reason: "Output buffer missing after finalize.",
            })
          }

          return {
            data: new Uint8Array(buffer),
            extension: resolvedFormat.container,
            mimeType: outputInfo.mimeType,
          } satisfies BrowserOutput
        })

      return {
        finalize,
        writeFrame,
      }
    }).pipe(
      Effect.mapError(
        (cause) =>
          new BrowserRenderFailed({
            cause,
            reason: "Unable to create browser frame writer.",
          })
      )
    )

export const renderVideo = (
  theme: string,
  codeBlocks: CodeBlock[],
  options: RenderVideoBrowserOptions = {}
) =>
  Effect.gen(function* () {
    yield* ensureWebCodecs()

    const outputInfo = yield* makeOutput(options.format === "webm" ? "webm" : "mp4")

    return yield* renderPipeline(
      theme,
      codeBlocks,
      {
        createFrameWriter: ({ frameDuration, frameRate, height, width }) =>
          Effect.gen(function* () {
            const resolved = yield* resolveFormat(options.format ?? "auto", height, width)
            return yield* createFrameWriter(
              resolved,
              outputInfo
            )({
              frameDuration,
              frameRate,
              height,
              width,
            })
          }),
        makeRenderContext: (nextHeight, nextWidth) =>
          makeRenderContext(options, nextHeight, nextWidth),
        measureScenes,
      },
      options
    )
  })
