import type { BundledLanguage, ThemedToken } from "shiki"

export type CodeBlock = {
  code: string
  language: BundledLanguage
}

export type LayoutToken = {
  color: string
  content: string
  fontStyle: number
  width: number
  x: number
  y: number
}

export type LayoutLine = {
  tokens: LayoutToken[]
}

export type SceneLayout = {
  lines: LayoutLine[]
}

export type Scene = {
  background: string
  blockX: number
  blockY: number
  contentHeight: number
  contentWidth: number
  foreground: string
  layout: SceneLayout
  tokens: ThemedToken[][]
}

export type DrawToken = {
  color: string
  content: string
  fontStyle: number
  opacity: number
  width: number
  x: number
  y: number
}

export type TransitionDiff = {
  added: LayoutToken[]
  matched: Array<{ from: LayoutToken; to: LayoutToken }>
  removed: LayoutToken[]
}

export type RenderFrame =
  | {
      background: string
      kind: "scene"
      opacity: number
      positionX: number
      positionY: number
      scene: Scene
    }
  | {
      background: string
      kind: "transition"
      tokens: DrawToken[]
    }
