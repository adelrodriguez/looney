import type { VideoSample } from "mediabunny"
import { Context, Effect, Layer } from "effect"
import { CustomVideoEncoder, EncodedPacket, registerEncoder } from "mediabunny"
import { VideoFrameEncodeFailed, WebCodecsUnavailable } from "./errors"

type VideoFrameConstructor = new (data: AllowSharedBufferSource, init: unknown) => VideoFrame

type WebCodecsConstructors = {
  readonly VideoEncoder: typeof VideoEncoder
  readonly VideoFrame: typeof VideoFrame
  readonly EncodedVideoChunk: typeof EncodedVideoChunk
  readonly AudioEncoder?: typeof AudioEncoder
  readonly EncodedAudioChunk?: typeof EncodedAudioChunk
  readonly AudioData?: typeof AudioData
}

export type WebCodecsService = WebCodecsConstructors & {
  readonly toVideoFrame: (sample: VideoSample) => Effect.Effect<VideoFrame, VideoFrameEncodeFailed>
  readonly registerNodeVideoEncoder: () => Effect.Effect<void>
}

export class WebCodecs extends Context.Tag("@services/WebCodecs")<WebCodecs, WebCodecsService>() {
  static browser: Layer.Layer<WebCodecs, WebCodecsUnavailable>
  static node: Layer.Layer<WebCodecs, WebCodecsUnavailable>
  static layer: Layer.Layer<WebCodecs, WebCodecsUnavailable>
}

type WebCodecsGlobals = Partial<WebCodecsConstructors>

type WebCodecsKey = "VideoEncoder" | "VideoFrame" | "EncodedVideoChunk"

const requiredKeys: WebCodecsKey[] = ["VideoEncoder", "VideoFrame", "EncodedVideoChunk"]

const isBrowserRuntime = () => "document" in globalThis && "window" in globalThis

const resolveWebCodecs = (globals: WebCodecsGlobals) => {
  const missing = requiredKeys.filter((key) => !globals[key])
  if (missing.length > 0) {
    return null
  }

  return globals as WebCodecsConstructors
}

const requireWebCodecs = (globals: WebCodecsGlobals, reason: string) => {
  const missing = requiredKeys.filter((key) => !globals[key])
  if (missing.length > 0) {
    throw new WebCodecsUnavailable({
      reason: `${reason} Missing: ${missing.join(", ")}.`,
    })
  }

  return globals as WebCodecsConstructors
}

const browserWebCodecs = Effect.try({
  catch: (error: unknown) => {
    if (error instanceof WebCodecsUnavailable) {
      return error
    }

    const message = error instanceof Error ? error.message : String(error)
    const isMissingLibrary = message.includes("Library not loaded")
    const baseMessage = "WebCodecs not available."
    const detailMessage = isMissingLibrary
      ? "Install FFmpeg (brew install ffmpeg) and ensure libavcodec is available."
      : "Install node-webcodecs plus FFmpeg (brew install ffmpeg pkg-config)."

    return new WebCodecsUnavailable({
      reason: `${baseMessage} ${detailMessage}`,
    })
  },
  try: () =>
    requireWebCodecs(
      globalThis as WebCodecsGlobals,
      "WebCodecs VideoEncoder is not available in this browser."
    ),
})

let nodeEncoderRegistered = false

const toVideoFramePromise = async (sample: VideoSample, codecs: WebCodecsConstructors) => {
  const format = sample.format
  if (!format) {
    throw new Error("Video sample format is required for encoding.")
  }

  if (format !== "RGBA" && format !== "RGBX" && format !== "BGRA" && format !== "BGRX") {
    throw new Error(`Unsupported pixel format for node encoder: ${format}.`)
  }

  const data = new Uint8Array(sample.allocationSize({ format }))
  await sample.copyTo(data, { format })

  const VideoFrameCtor = codecs.VideoFrame as unknown as VideoFrameConstructor

  return new VideoFrameCtor(data, {
    codedHeight: sample.codedHeight,
    codedWidth: sample.codedWidth,
    colorSpace: sample.colorSpace.toJSON(),
    duration: sample.microsecondDuration || undefined,
    format,
    timestamp: sample.microsecondTimestamp,
  })
}

const toVideoFrameEffect = (sample: VideoSample, codecs: WebCodecsConstructors) =>
  Effect.tryPromise({
    catch: (cause: unknown) =>
      new VideoFrameEncodeFailed({
        cause,
        reason: "Unable to create video frame for encoding.",
      }),
    try: () => toVideoFramePromise(sample, codecs),
  })

const makeNodeVideoEncoder = (codecs: WebCodecsConstructors) => {
  class NodeVideoEncoder extends CustomVideoEncoder {
    private encoder: InstanceType<typeof codecs.VideoEncoder> | null = null
    private pendingError: Error | null = null

    static override supports() {
      return true
    }

    override async init() {
      if (typeof codecs.VideoEncoder.isConfigSupported === "function") {
        const support = await codecs.VideoEncoder.isConfigSupported(this.config)
        if (!support.supported) {
          throw new Error(
            `This specific encoder configuration (${this.config.codec}, ${this.config.width}x${this.config.height}) is not supported.`
          )
        }
      }

      this.encoder = new codecs.VideoEncoder({
        error: (error) => {
          this.pendingError ??= error
        },
        output: (chunk, meta) => {
          const data = new Uint8Array(chunk.byteLength)
          chunk.copyTo(data)

          const packet = new EncodedPacket(
            data,
            chunk.type,
            chunk.timestamp / 1e6,
            (chunk.duration ?? 0) / 1e6
          )

          this.onPacket(packet, meta)
        },
      })

      this.encoder.configure(this.config)
    }

    override async encode(videoSample: VideoSample, options: VideoEncoderEncodeOptions) {
      this.throwIfErrored()
      this.ensureEncoder()

      await Effect.runPromise(
        Effect.acquireUseRelease(
          toVideoFrameEffect(videoSample, codecs),
          (frame) =>
            Effect.try({
              catch: (cause) =>
                new VideoFrameEncodeFailed({
                  cause,
                  reason: "Failed to encode video frame.",
                }),
              try: () => this.encoder?.encode(frame, options),
            }),
          (frame) =>
            Effect.sync(() => {
              frame.close()
            })
        ).pipe(Effect.orDie)
      )
    }

    override async flush() {
      this.throwIfErrored()
      await this.encoder?.flush()
    }

    override close() {
      this.encoder?.close()
      this.encoder = null
    }

    private ensureEncoder() {
      if (!this.encoder) {
        throw new Error("Video encoder not initialized.")
      }
    }

    private throwIfErrored() {
      if (this.pendingError) {
        throw this.pendingError
      }
    }
  }

  return NodeVideoEncoder
}

const registerNodeVideoEncoder = (codecs: WebCodecsConstructors) =>
  Effect.sync(() => {
    if (nodeEncoderRegistered) {
      return
    }

    registerEncoder(makeNodeVideoEncoder(codecs))
    nodeEncoderRegistered = true
  })

const resolveNodeWebCodecs: Effect.Effect<WebCodecsConstructors, WebCodecsUnavailable> =
  Effect.tryPromise({
    catch: (error: unknown) => {
      if (error instanceof WebCodecsUnavailable) {
        return error
      }

      const message = error instanceof Error ? error.message : String(error)
      const isMissingLibrary = message.includes("Library not loaded")
      const baseMessage = "WebCodecs not available."
      const detailMessage = isMissingLibrary
        ? "Install FFmpeg (brew install ffmpeg) and ensure libavcodec is available."
        : "Install node-webcodecs plus FFmpeg (brew install ffmpeg pkg-config)."

      return new WebCodecsUnavailable({
        reason: `${baseMessage} ${detailMessage}`,
      })
    },
    try: async () => {
      const globals = globalThis as WebCodecsGlobals
      const existing = resolveWebCodecs(globals)
      if (existing) {
        return existing
      }

      const webcodecs = (await import("node-webcodecs")) as unknown as WebCodecsGlobals
      return requireWebCodecs(webcodecs, "WebCodecs not available.")
    },
  })

const makeWebCodecsService = (
  codecs: WebCodecsConstructors,
  registerEffect: Effect.Effect<void>
): WebCodecsService => {
  const toVideoFrame = Effect.fn(function* toVideoFrame(sample: VideoSample) {
    return yield* toVideoFrameEffect(sample, codecs)
  })

  const registerNodeVideoEncoder = Effect.fn(function* registerNodeVideoEncoder() {
    yield* registerEffect
  })

  return WebCodecs.of({
    ...codecs,
    registerNodeVideoEncoder,
    toVideoFrame,
  })
}

const makeBrowserService = Effect.fn(function* makeBrowserService() {
  const codecs = yield* browserWebCodecs
  return makeWebCodecsService(codecs, Effect.void)
})

const makeNodeService = Effect.fn(function* makeNodeService() {
  const codecs = yield* resolveNodeWebCodecs
  const register = registerNodeVideoEncoder(codecs)
  yield* register
  return makeWebCodecsService(codecs, register)
})

const makeAutoService = Effect.fn(function* makeAutoService() {
  if (isBrowserRuntime()) {
    return yield* makeBrowserService()
  }

  return yield* makeNodeService()
})

export const webCodecsBrowserLayer = Layer.effect(WebCodecs, makeBrowserService())
export const webCodecsNodeLayer = Layer.effect(WebCodecs, makeNodeService())
export const webCodecsLayer = Layer.effect(WebCodecs, makeAutoService())

WebCodecs.browser = webCodecsBrowserLayer
WebCodecs.layer = webCodecsLayer
WebCodecs.node = webCodecsNodeLayer
