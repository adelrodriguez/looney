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
  CanvasContextUnavailable,
  MissingCanvasFactory,
  NoEncodableVideoCodec,
  OutputBufferMissing,
} from "./errors"
import { buildFramesStream, computeFrameCounts, renderFrame } from "./render"
import { buildScene } from "./scene"
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
    const context = canvas.getContext("2d")
    if (!context) {
      return yield* Effect.fail(
        new CanvasContextUnavailable({ reason: "Unable to acquire 2D canvas context." })
      )
    }

    return context
  })

const ensureWebCodecs = () =>
  Effect.gen(function* () {
    yield* WebCodecs
  })

const makeOutput = (format: "mp4" | "webm") =>
  Effect.sync(() => {
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
  })

const makeVideoSource = (codec: ResolvedCodec) =>
  Effect.sync(
    () =>
      new VideoSampleSource({
        bitrate: QUALITY_HIGH,
        codec,
      })
  )

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

      const imageData = context.getImageData(0, 0, width, height)
      const sample = new VideoSample(imageData.data, {
        codedHeight: height,
        codedWidth: width,
        duration: frameDuration,
        format: "RGBA",
        timestamp: frameIndex * frameDuration,
      })

      yield* Effect.tryPromise({
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        try: () => videoSource.add(sample),
      })

      sample.close()
      yield* Ref.set(frameIndexRef, frameIndex + 1)
    })

type ResolvedCodec = "avc" | "vp9" | "vp8" | "hevc" | "av1"

type ResolvedFormat = {
  codec: ResolvedCodec
  container: "mp4" | "webm"
}

const resolveFormat = (format: BrowserFormat, height: number, width: number) =>
  Effect.gen(function* () {
    if (format !== "auto") {
      return {
        codec: format === "mp4" ? "avc" : "vp9",
        container: format,
      } satisfies ResolvedFormat
    }

    const codec = yield* Effect.tryPromise({
      catch: () =>
        new NoEncodableVideoCodec({
          reason: "No encodable video codec available in this browser.",
        }),
      try: () =>
        getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], {
          bitrate: QUALITY_HIGH,
          height,
          width,
        }),
    })

    if (!codec) {
      return yield* Effect.fail(
        new NoEncodableVideoCodec({
          reason: "No encodable video codec available in this browser.",
        })
      )
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
      return yield* Effect.fail(
        new MissingCanvasFactory({
          reason: "Browser canvas factory is required when no canvas is provided.",
        })
      )
    }

    const created = createCanvas(height, width)
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

    const width = options.width ?? DEFAULT_WIDTH
    const height = options.height ?? DEFAULT_HEIGHT
    const transitionDurationMs = options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS
    const format = options.format ?? "auto"

    const { context } = yield* resolveCanvas(options.canvas, height, width, options.createCanvas)
    const resolved = yield* resolveFormat(format, height, width)
    const outputInfo = yield* makeOutput(resolved.container)
    const frameCounts = computeFrameCounts(transitionDurationMs, DEFAULT_FPS)
    const frameIndexRef = yield* Ref.make(0)

    const scenes = yield* Effect.forEach(
      codeBlocks,
      (codeBlock) => buildScene(context, codeBlock, theme as never, width, height),
      { concurrency: options.concurrency }
    )

    const videoSource = yield* makeVideoSource(resolved.codec)

    return yield* Effect.scoped(
      Effect.gen(function* () {
        yield* Effect.sync(() => {
          outputInfo.output.addVideoTrack(videoSource, { frameRate: DEFAULT_FPS })
        })

        yield* Effect.tryPromise({
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
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
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
          try: () => outputInfo.output.finalize(),
        })

        videoSource.close()

        const buffer = outputInfo.target.buffer
        if (!buffer) {
          return yield* Effect.fail(
            new OutputBufferMissing({
              reason: "Output buffer missing after finalize.",
            })
          )
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
