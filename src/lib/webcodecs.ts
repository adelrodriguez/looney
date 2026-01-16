import type { VideoSample } from "mediabunny"
import { Context, Effect, Layer } from "effect"
import { CustomVideoEncoder, EncodedPacket, registerEncoder } from "mediabunny"
import { WebCodecsUnavailable } from "./errors"

type VideoFrameConstructor = new (data: AllowSharedBufferSource, init: unknown) => VideoFrame

export type WebCodecsService = {
  VideoEncoder: typeof VideoEncoder
  VideoFrame: typeof VideoFrame
  EncodedVideoChunk: typeof EncodedVideoChunk
  AudioEncoder?: typeof AudioEncoder
  EncodedAudioChunk?: typeof EncodedAudioChunk
  AudioData?: typeof AudioData
}

type WebCodecsGlobals = Partial<WebCodecsService>

type WebCodecsKey = "VideoEncoder" | "VideoFrame" | "EncodedVideoChunk"

const requiredKeys: WebCodecsKey[] = ["VideoEncoder", "VideoFrame", "EncodedVideoChunk"]

const resolveWebCodecs = (globals: WebCodecsGlobals) => {
  const missing = requiredKeys.filter((key) => !globals[key])
  if (missing.length > 0) {
    return null
  }

  return globals as WebCodecsService
}

const requireWebCodecs = (globals: WebCodecsGlobals, reason: string) => {
  const missing = requiredKeys.filter((key) => !globals[key])
  if (missing.length > 0) {
    throw new WebCodecsUnavailable({
      reason: `${reason} Missing: ${missing.join(", ")}.`,
    })
  }

  return globals as WebCodecsService
}

const browserWebCodecs = Effect.sync(() =>
  requireWebCodecs(
    globalThis as WebCodecsGlobals,
    "WebCodecs VideoEncoder is not available in this browser."
  )
)

let nodeEncoderRegistered = false

const toVideoFrame = async (sample: VideoSample, codecs: WebCodecsService) => {
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

const makeNodeVideoEncoder = (codecs: WebCodecsService) => {
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

      const frame = await toVideoFrame(videoSample, codecs)
      this.encoder?.encode(frame, options)
      frame.close()
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

const registerNodeVideoEncoder = (codecs: WebCodecsService) =>
  Effect.sync(() => {
    if (nodeEncoderRegistered) {
      return
    }

    registerEncoder(makeNodeVideoEncoder(codecs))
    nodeEncoderRegistered = true
  })

const resolveNodeWebCodecs: Effect.Effect<WebCodecsService, Error> = Effect.tryPromise({
  catch: (error) => {
    const message = error instanceof Error ? error.message : String(error)
    const isMissingLibrary = message.includes("Library not loaded")
    const baseMessage = "WebCodecs not available."
    const detailMessage = isMissingLibrary
      ? "Install FFmpeg (brew install ffmpeg) and ensure libavcodec is available."
      : "Install node-webcodecs plus FFmpeg (brew install ffmpeg pkg-config)."

    return new Error(`${baseMessage} ${detailMessage}`, { cause: error })
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

const nodeWebCodecs = Effect.gen(function* () {
  const codecs = yield* resolveNodeWebCodecs
  yield* registerNodeVideoEncoder(codecs)

  return codecs
})

export class WebCodecs extends Context.Tag("@services/WebCodecs")<WebCodecs, WebCodecsService>() {
  static readonly browser = Layer.effect(WebCodecs, browserWebCodecs)
  static readonly node = Layer.effect(WebCodecs, nodeWebCodecs)
}
