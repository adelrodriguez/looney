import { Effect, Ref, Stream } from "effect"
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
import type { CanvasContext } from "./context"
import type { CodeBlock, RenderFrame } from "./types"
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_TRANSITION_DURATION_MS,
  DEFAULT_WIDTH,
} from "./constants"
import {
  BrowserRenderFailed,
  CanvasContextUnavailable,
  MissingCanvasFactory,
  NoEncodableVideoCodec,
  OutputBufferMissing,
} from "./errors"
import { buildFramesStream, computeFrameCounts, renderFrame } from "./render"
import { layoutScene, measureScene, resolveFrameSize } from "./scene"
import { WebCodecs } from "./webcodecs"

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

export type RenderVideoBrowserOptions = {
  canvas?: CanvasLike
  concurrency?: number
  createCanvas?: CanvasFactory
  format?: BrowserFormat
  height?: number
  transitionDurationMs?: number
  width?: number
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

const renderAndWriteFrame =
  (
    context: CanvasContext,
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
      yield* Ref.set(frameIndexRef, frameIndex + 1)
    })

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

    // Format === "auto"
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

export const renderVideoBrowser = (
  theme: string,
  codeBlocks: CodeBlock[],
  options: RenderVideoBrowserOptions = {}
) =>
  Effect.gen(function* () {
    yield* ensureWebCodecs()

    const minWidth = options.width ?? DEFAULT_WIDTH
    const minHeight = options.height ?? DEFAULT_HEIGHT
    const transitionDurationMs = options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS
    const format = options.format ?? "auto"
    const createCanvas = options.createCanvas

    const measuredScenes = yield* Effect.gen(function* () {
      if (createCanvas) {
        return yield* Effect.forEach(
          codeBlocks,
          (codeBlock) =>
            Effect.gen(function* () {
              const measurementContext = yield* getCanvasContext(createCanvas(1, 1))
              return yield* measureScene(measurementContext, codeBlock, theme as never)
            }),
          { concurrency: options.concurrency }
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
    })

    const { width, height } = resolveFrameSize(measuredScenes, minWidth, minHeight)

    const { canvas } = yield* resolveCanvas(options.canvas, height, width, createCanvas)
    if (canvas.width !== width) {
      canvas.width = width
    }
    if (canvas.height !== height) {
      canvas.height = height
    }
    const context = yield* getCanvasContext(canvas)

    const resolved = yield* resolveFormat(format, height, width)
    const outputInfo = yield* makeOutput(resolved.container)
    const frameCounts = computeFrameCounts(transitionDurationMs, DEFAULT_FPS)
    const frameIndexRef = yield* Ref.make(0)

    const scenes = measuredScenes.map((measured) => layoutScene(measured, width, height))

    return yield* Effect.scoped(
      Effect.gen(function* () {
        const videoSource = yield* Effect.acquireRelease(makeVideoSource(resolved.codec), (vs) =>
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
            outputInfo.output.addVideoTrack(videoSource, { frameRate: DEFAULT_FPS })
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

        const frameStream = buildFramesStream(
          scenes,
          frameCounts.blockFrames,
          frameCounts.transitionFrames
        )

        yield* Stream.runForEach(
          frameStream,
          renderAndWriteFrame(
            context,
            videoSource,
            frameCounts.frameDuration,
            frameIndexRef,
            width,
            height
          )
        )

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

        const output: BrowserOutput = {
          data: new Uint8Array(buffer),
          extension: resolved.container,
          mimeType: outputInfo.mimeType,
        }

        return output
      })
    )
  })
