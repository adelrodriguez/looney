import { Data } from "effect"

export class CanvasContextUnavailable extends Data.TaggedError("CanvasContextUnavailable")<{
  reason: string
}> {}

export class WebCodecsUnavailable extends Data.TaggedError("WebCodecsUnavailable")<{
  reason: string
}> {}

export class NoEncodableVideoCodec extends Data.TaggedError("NoEncodableVideoCodec")<{
  reason: string
}> {}

export class MissingCanvasFactory extends Data.TaggedError("MissingCanvasFactory")<{
  reason: string
}> {}

export class OutputBufferMissing extends Data.TaggedError("OutputBufferMissing")<{
  reason: string
}> {}

export class BrowserRenderFailed extends Data.TaggedError("BrowserRenderFailed")<{
  cause: unknown
  reason: string
}> {}

export class NodeRenderFailed extends Data.TaggedError("NodeRenderFailed")<{
  cause: unknown
  reason: string
}> {}

export class SceneMeasureFailed extends Data.TaggedError("SceneMeasureFailed")<{
  cause: unknown
  reason: string
}> {}

export class UnknownTheme extends Data.TaggedError("UnknownTheme")<{
  theme: string
}> {}

export class MissingCodeBlockLanguage extends Data.TaggedError("MissingCodeBlockLanguage")<{
  reason: string
}> {}

export class UnsupportedLanguage extends Data.TaggedError("UnsupportedLanguage")<{
  language: string
}> {}

export class VideoFrameEncodeFailed extends Data.TaggedError("VideoFrameEncodeFailed")<{
  cause: unknown
  reason: string
}> {}

export class NoCodeBlocksFound extends Data.TaggedError("NoCodeBlocksFound")<{
  reason: string
}> {}

export class InvalidTransitionDuration extends Data.TaggedError("InvalidTransitionDuration")<{
  duration: number
  reason: string
}> {}
