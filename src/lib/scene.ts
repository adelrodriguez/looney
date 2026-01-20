import { Effect } from "effect"
import { codeToTokens, type BundledTheme, type ThemedToken } from "shiki"
import type { CanvasContext } from "./context"
import type { CodeBlock, LayoutToken, Scene, SceneLayout, TokenCategory } from "./types"
import {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_PADDING,
  FONT_STYLE_BOLD,
  FONT_STYLE_ITALIC,
  FONT_STYLE_NONE,
  FONT_STYLE_UNDERLINE,
  TAB_REPLACEMENT,
} from "./constants"
import { SceneMeasureFailed } from "./errors"
import { buildFont, drawUnderline } from "./text"
import { categorizeToken } from "./token"

const normalizeTokenContent = (content: string) => content.split("\t").join(TAB_REPLACEMENT)

const measureTokenWidth = (
  context: CanvasContext,
  content: string,
  isItalic: boolean,
  isBold: boolean
) => {
  const measureContext = context
  const previousFont = measureContext.font
  measureContext.font = buildFont(isItalic, isBold)
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

export const measureScene = (context: CanvasContext, codeBlock: CodeBlock, theme: BundledTheme) =>
  Effect.tryPromise({
    catch: (cause) =>
      new SceneMeasureFailed({
        cause,
        reason: "Unable to tokenize scene code block.",
      }),
    try: async () => {
      const tokenResult = await codeToTokens(codeBlock.code, {
        includeExplanation: "scopeName",
        lang: codeBlock.language,
        theme,
      })

      const tokens = tokenResult.tokens
      const foreground = tokenResult.fg ?? DEFAULT_FOREGROUND
      const background = tokenResult.bg ?? DEFAULT_BACKGROUND

      const lineMetrics = tokens.map((lineTokens) => {
        const metrics: MeasuredToken[] = []
        let lineWidth = 0

        for (const token of lineTokens) {
          const content = normalizeTokenContent(token.content)
          if (!content) {
            continue
          }

          const styleFlags = token.fontStyle ?? FONT_STYLE_NONE
          const isItalic = (styleFlags & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC
          const isBold = (styleFlags & FONT_STYLE_BOLD) === FONT_STYLE_BOLD
          const width = measureTokenWidth(context, content, isItalic, isBold)
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
      const contentHeight = tokens.length * DEFAULT_LINE_HEIGHT
      const blockWidth = contentWidth + DEFAULT_PADDING * 2
      const blockHeight = contentHeight + DEFAULT_PADDING * 2

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

export const resolveFrameSize = (
  measuredScenes: MeasuredScene[],
  minWidth: number,
  minHeight: number
) => {
  const maxBlockWidth =
    measuredScenes.length > 0 ? Math.max(...measuredScenes.map((scene) => scene.blockWidth)) : 0
  const maxBlockHeight =
    measuredScenes.length > 0 ? Math.max(...measuredScenes.map((scene) => scene.blockHeight)) : 0

  return {
    height: Math.max(minHeight, Math.ceil(maxBlockHeight)),
    width: Math.max(minWidth, Math.ceil(maxBlockWidth)),
  }
}

export const layoutScene = (
  measured: MeasuredScene,
  frameWidth: number,
  frameHeight: number
): Scene => {
  const blockX = Math.max(0, Math.round((frameWidth - measured.blockWidth) / 2))
  const blockY = Math.max(0, Math.round((frameHeight - measured.blockHeight) / 2))

  const layout: SceneLayout = {
    lines: measured.lines.map((line, lineIndex) => {
      let cursorX = blockX + DEFAULT_PADDING
      const cursorY = blockY + DEFAULT_PADDING + lineIndex * DEFAULT_LINE_HEIGHT
      const layoutTokens: LayoutToken[] = line.tokens.map((token) => {
        const layoutToken = {
          ...token,
          x: cursorX,
          y: cursorY,
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
  const startX = blockX + DEFAULT_PADDING
  const startY = blockY + DEFAULT_PADDING
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
    const cursorY = startY + lineIndex * DEFAULT_LINE_HEIGHT

    for (const token of lineTokens) {
      const content = normalizeTokenContent(token.content)
      if (!content) {
        continue
      }

      const fontStyle = token.fontStyle ?? FONT_STYLE_NONE
      const isItalic = (fontStyle & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC
      const isBold = (fontStyle & FONT_STYLE_BOLD) === FONT_STYLE_BOLD
      const isUnderline = (fontStyle & FONT_STYLE_UNDERLINE) === FONT_STYLE_UNDERLINE

      textContext.font = buildFont(isItalic, isBold)
      textContext.fillStyle = token.color ?? scene.foreground
      textContext.fillText(content, cursorX, cursorY)

      const tokenWidth = textContext.measureText(content).width

      if (isUnderline) {
        drawUnderline(textContext, cursorX, cursorY, tokenWidth)
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
