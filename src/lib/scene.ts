import { Effect } from "effect"
import { codeToTokens, type BundledTheme, type ThemedToken } from "shiki"
import type { CanvasContext } from "./context"
import type {
  CodeBlock,
  LayoutToken,
  RenderConfig,
  Scene,
  SceneLayout,
  TokenCategory,
} from "./types"
import {
  FONT_STYLE_BOLD,
  FONT_STYLE_ITALIC,
  FONT_STYLE_NONE,
  FONT_STYLE_UNDERLINE,
} from "./constants"
import { SceneMeasureFailed } from "./errors"
import { buildFont, drawUnderline } from "./text"
import { categorizeToken } from "./token"

const normalizeTokenContent = (config: RenderConfig, content: string) =>
  content.split("\t").join(config.tabReplacement)

const measureTokenWidth = (
  config: RenderConfig,
  context: CanvasContext,
  content: string,
  isItalic: boolean,
  isBold: boolean
) => {
  const measureContext = context
  const previousFont = measureContext.font
  measureContext.font = buildFont(config, isItalic, isBold)
  const width = measureContext.measureText(content).width
  measureContext.font = previousFont
  return width
}

const resolveTokenCategory = (token: ThemedToken) => {
  const scopes =
    token.explanation?.flatMap((explanation) =>
      explanation.scopes.map((scope) => scope.scopeName)
    ) ?? []
  return categorizeToken(scopes)
}

type MeasuredToken = {
  category: TokenCategory
  color: string
  content: string
  fontStyle: number
  width: number
}

type MeasuredLine = {
  tokens: MeasuredToken[]
  width: number
}

export type MeasuredScene = {
  background: string
  blockHeight: number
  blockWidth: number
  contentHeight: number
  contentWidth: number
  foreground: string
  lines: MeasuredLine[]
  tokens: ThemedToken[][]
}

export const measureScene = Effect.fn(function* measureScene(
  config: RenderConfig,
  context: CanvasContext,
  codeBlock: CodeBlock,
  theme: BundledTheme
) {
  return yield* Effect.tryPromise({
    catch: (cause: unknown) => new SceneMeasureFailed({ cause }),
    try: async () => {
      const tokenResult = await codeToTokens(codeBlock.code, {
        includeExplanation: "scopeName",
        lang: codeBlock.language,
        theme,
      })

      const tokens = tokenResult.tokens
      const foreground = tokenResult.fg ?? config.foreground
      const background = tokenResult.bg ?? config.background

      const lineMetrics = tokens.map((lineTokens) => {
        const metrics: MeasuredToken[] = []
        let lineWidth = 0

        for (const token of lineTokens) {
          const content = normalizeTokenContent(config, token.content)
          if (!content) {
            continue
          }

          const styleFlags = token.fontStyle ?? FONT_STYLE_NONE
          const isItalic = (styleFlags & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC
          const isBold = (styleFlags & FONT_STYLE_BOLD) === FONT_STYLE_BOLD
          const width = measureTokenWidth(config, context, content, isItalic, isBold)
          const color = token.color ?? foreground

          metrics.push({
            category: resolveTokenCategory(token),
            color,
            content,
            fontStyle: styleFlags,
            width,
          })
          lineWidth += width
        }

        return {
          tokens: metrics,
          width: lineWidth,
        }
      })

      const maxLineWidth =
        lineMetrics.length > 0 ? Math.max(...lineMetrics.map((line) => line.width)) : 0
      const contentWidth = Math.max(0, maxLineWidth)
      const contentHeight = tokens.length * config.lineHeight
      const blockWidth = contentWidth + config.padding * 2
      const blockHeight = contentHeight + config.padding * 2

      return {
        background,
        blockHeight,
        blockWidth,
        contentHeight,
        contentWidth,
        foreground,
        lines: lineMetrics,
        tokens,
      } satisfies MeasuredScene
    },
  })
})

export const resolveFrameSize = (config: RenderConfig, measuredScenes: MeasuredScene[]) => {
  const maxBlockWidth =
    measuredScenes.length > 0 ? Math.max(...measuredScenes.map((scene) => scene.blockWidth)) : 0
  const maxBlockHeight =
    measuredScenes.length > 0 ? Math.max(...measuredScenes.map((scene) => scene.blockHeight)) : 0

  return {
    height: Math.max(config.height, Math.ceil(maxBlockHeight)),
    width: Math.max(config.width, Math.ceil(maxBlockWidth)),
  }
}

export const layoutScene = (
  config: RenderConfig,
  measured: MeasuredScene,
  frameWidth: number,
  frameHeight: number
): Scene => {
  const blockX = Math.max(0, Math.round((frameWidth - measured.blockWidth) / 2))
  const blockY = Math.max(0, Math.round((frameHeight - measured.blockHeight) / 2))

  const layout: SceneLayout = {
    lines: measured.lines.map((line, lineIndex) => {
      let cursorX = blockX + config.padding
      const cursorY = blockY + config.padding + lineIndex * config.lineHeight
      const layoutTokens: LayoutToken[] = line.tokens.map((token) => {
        const layoutToken = {
          ...token,
          x: Math.round(cursorX),
          y: Math.round(cursorY),
        }
        cursorX += token.width
        return layoutToken
      })

      return {
        tokens: layoutTokens,
      }
    }),
  }

  return {
    background: measured.background,
    blockX,
    blockY,
    contentHeight: measured.contentHeight,
    contentWidth: measured.contentWidth,
    foreground: measured.foreground,
    layout,
    tokens: measured.tokens,
  }
}

export const renderSceneText = (
  config: RenderConfig,
  context: CanvasContext,
  scene: Scene,
  opacity: number,
  blockX: number,
  blockY: number
) => {
  if (opacity <= 0) {
    return
  }

  const textContext = context
  const startX = blockX + config.padding
  const startY = blockY + config.padding
  const previousAlpha = textContext.globalAlpha
  const previousBaseline = textContext.textBaseline
  const previousAlign = textContext.textAlign
  const previousFont = textContext.font
  const previousFillStyle = textContext.fillStyle

  textContext.globalAlpha = opacity
  textContext.textBaseline = "top"
  textContext.textAlign = "left"

  for (let lineIndex = 0; lineIndex < scene.tokens.length; lineIndex += 1) {
    const lineTokens = scene.tokens[lineIndex] ?? []
    let cursorX = startX
    const cursorY = startY + lineIndex * config.lineHeight

    for (const token of lineTokens) {
      const content = normalizeTokenContent(config, token.content)
      if (!content) {
        continue
      }

      const fontStyle = token.fontStyle ?? FONT_STYLE_NONE
      const isItalic = (fontStyle & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC
      const isBold = (fontStyle & FONT_STYLE_BOLD) === FONT_STYLE_BOLD
      const isUnderline = (fontStyle & FONT_STYLE_UNDERLINE) === FONT_STYLE_UNDERLINE

      textContext.font = buildFont(config, isItalic, isBold)
      textContext.fillStyle = token.color ?? scene.foreground
      textContext.fillText(content, Math.round(cursorX), Math.round(cursorY))

      const tokenWidth = textContext.measureText(content).width

      if (isUnderline) {
        drawUnderline(config, textContext, Math.round(cursorX), Math.round(cursorY), tokenWidth)
      }

      cursorX += tokenWidth
    }
  }

  textContext.globalAlpha = previousAlpha
  textContext.textBaseline = previousBaseline
  textContext.textAlign = previousAlign
  textContext.font = previousFont
  textContext.fillStyle = previousFillStyle
}
