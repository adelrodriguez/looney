import type * as Scope from "effect/Scope"
import { Effect, Ref, Stream } from "effect"
import type { CanvasContext } from "../context"
import type { MeasuredScene } from "../scene"
import type { CodeBlock, RenderFrame } from "../types"
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_TRANSITION_DURATION_MS,
  DEFAULT_WIDTH,
} from "../constants"
import { buildFramesStream, computeFrameCounts, renderFrame } from "../render"
import { layoutScene, resolveFrameSize } from "../scene"

export type RenderPipelineOptions = {
  concurrency?: number
  height?: number
  width?: number
  transitionDurationMs?: number
}

type RenderPipelineWriter<Output> = {
  readonly writeFrame: (
    context: CanvasContext,
    frame: RenderFrame,
    frameIndex: number
  ) => Effect.Effect<void, unknown>
  readonly finalize: () => Effect.Effect<Output, unknown>
}

export type RenderPipelineEnv<Output, Options extends RenderPipelineOptions> = {
  readonly measureScenes: (
    codeBlocks: CodeBlock[],
    theme: string,
    options: Options
  ) => Effect.Effect<MeasuredScene[], unknown, Scope.Scope>
  readonly makeRenderContext: (
    height: number,
    width: number
  ) => Effect.Effect<CanvasContext, unknown, Scope.Scope>
  readonly createFrameWriter: (args: {
    frameDuration: number
    frameRate: number
    height: number
    width: number
  }) => Effect.Effect<RenderPipelineWriter<Output>, unknown, Scope.Scope>
}

export const renderPipeline = <
  Output,
  Options extends RenderPipelineOptions = RenderPipelineOptions,
>(
  theme: string,
  codeBlocks: CodeBlock[],
  env: RenderPipelineEnv<Output, Options>,
  options: Options = {} as Options
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const measuredScenes = yield* env.measureScenes(codeBlocks, theme, options)
      const minWidth = options.width ?? DEFAULT_WIDTH
      const minHeight = options.height ?? DEFAULT_HEIGHT
      const transitionDurationMs = options.transitionDurationMs ?? DEFAULT_TRANSITION_DURATION_MS
      const { width, height } = resolveFrameSize(measuredScenes, minWidth, minHeight)
      const context = yield* env.makeRenderContext(height, width)
      const scenes = measuredScenes.map((measured) => layoutScene(measured, width, height))
      const frameCounts = computeFrameCounts(transitionDurationMs, DEFAULT_FPS)
      const writer = yield* env.createFrameWriter({
        frameDuration: frameCounts.frameDuration,
        frameRate: DEFAULT_FPS,
        height,
        width,
      })
      const frameIndexRef = yield* Ref.make(0)
      const frameStream = buildFramesStream(
        scenes,
        frameCounts.blockFrames,
        frameCounts.transitionFrames
      )

      yield* Stream.runForEach(frameStream, (frame) =>
        Effect.gen(function* () {
          const frameIndex = yield* Ref.get(frameIndexRef)
          renderFrame(context, width, height, frame)
          yield* writer.writeFrame(context, frame, frameIndex)
          yield* Ref.set(frameIndexRef, frameIndex + 1)
        })
      )

      return yield* writer.finalize()
    })
  )
