import { Stream } from "effect"
import type { CanvasContext } from "./context"
import type { RenderConfig, RenderFrame, Scene } from "./types"
import { blendColors } from "./color"
import { renderSceneText } from "./scene"
import {
  buildTransitionDiff,
  buildTransitionTokens,
  easeInOutCubic,
  renderTransitionTokens,
} from "./transition"

export function renderFrame(
  config: RenderConfig,
  context: CanvasContext,
  frameWidth: number,
  frameHeight: number,
  frame: RenderFrame
) {
  const frameContext = context
  const startTransform = frameContext.getTransform()
  if (typeof frameContext.setTransformMatrix !== "function") {
    frameContext.setTransformMatrix = (transform) => {
      if (
        typeof transform === "object" &&
        transform !== null &&
        "a" in transform &&
        "b" in transform &&
        "c" in transform &&
        "d" in transform &&
        "e" in transform &&
        "f" in transform
      ) {
        const matrix = transform as {
          a: number
          b: number
          c: number
          d: number
          e: number
          f: number
        }
        frameContext.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
      } else {
        frameContext.setTransform(1, 0, 0, 1, 0, 0)
      }
    }
  }
  const startAlpha = frameContext.globalAlpha
  const startFillStyle = frameContext.fillStyle

  frameContext.setTransform(1, 0, 0, 1, 0, 0)
  frameContext.globalAlpha = 1
  frameContext.fillStyle = frame.background
  frameContext.fillRect(0, 0, frameWidth, frameHeight)

  if (frame.kind === "scene") {
    renderSceneText(
      config,
      frameContext,
      frame.scene,
      frame.opacity,
      frame.positionX,
      frame.positionY
    )
  } else {
    renderTransitionTokens(config, frameContext, frame.tokens)
  }

  if (typeof frameContext.setTransformMatrix === "function") {
    frameContext.setTransformMatrix(startTransform)
  }
  frameContext.globalAlpha = startAlpha
  frameContext.fillStyle = startFillStyle
}

export function computeFrameCounts(
  transitionDurationMs: number,
  fps: number,
  blockDuration: number
) {
  const frameDuration = 1 / fps
  const blockFrames = Math.max(1, Math.round(blockDuration * fps))
  const transitionFrames = Math.max(1, Math.round((transitionDurationMs / 1000) * fps))

  return {
    blockFrames,
    frameDuration,
    transitionFrames,
  }
}

export function buildSceneFrames(scene: Scene, blockFrames: number) {
  return Stream.range(1, blockFrames).pipe(
    Stream.map(
      () =>
        ({
          background: scene.background,
          kind: "scene",
          opacity: 1,
          positionX: scene.blockX,
          positionY: scene.blockY,
          scene,
        }) satisfies RenderFrame
    )
  )
}

export function buildTransitionFrames(
  config: RenderConfig,
  scene: Scene,
  nextScene: Scene,
  transitionFrames: number
) {
  const diff = buildTransitionDiff(scene, nextScene)

  return Stream.range(1, transitionFrames).pipe(
    Stream.map((index) => {
      const rawProgress = index / transitionFrames
      const progress = easeInOutCubic(rawProgress)
      const blendedBackground = blendColors(scene.background, nextScene.background, progress)
      const tokens = buildTransitionTokens(config, diff, progress)

      return {
        background: blendedBackground,
        kind: "transition",
        tokens,
      } satisfies RenderFrame
    })
  )
}

export function buildFramesStream(
  config: RenderConfig,
  scenes: Scene[],
  blockFrames: number,
  transitionFrames: number
) {
  return Stream.fromIterable(scenes).pipe(
    Stream.zipWithIndex,
    Stream.flatMap(([scene, index]) => {
      const nextScene = scenes[index + 1]
      const base = buildSceneFrames(scene, blockFrames)
      return nextScene
        ? Stream.concat(base, buildTransitionFrames(config, scene, nextScene, transitionFrames))
        : base
    })
  )
}
