import type { CanvasContext } from "./context"
import type { DrawToken, LayoutToken, Scene, TransitionDiff } from "./types"
import { blendColors, lerp } from "./color"
import {
  DEFAULT_TRANSITION_DRIFT,
  FONT_STYLE_BOLD,
  FONT_STYLE_ITALIC,
  FONT_STYLE_UNDERLINE,
} from "./constants"
import { buildFont, drawUnderline } from "./text"

const buildExactKey = (token: LayoutToken) => `exact::${token.content}::${token.fontStyle}`
const buildCategoryKey = (token: LayoutToken) => `category::${token.category}`

const buildTokenSequence = (tokens: LayoutToken[], buildKey: (token: LayoutToken) => string) =>
  tokens.map((token) => ({
    key: buildKey(token),
    token,
  }))

type TokenWithIndex = {
  index: number
  token: LayoutToken
}

const groupByKey = (tokens: LayoutToken[], buildKey: (token: LayoutToken) => string) => {
  const grouped = new Map<string, TokenWithIndex[]>()
  tokens.forEach((token, index) => {
    const key = buildKey(token)
    const group = grouped.get(key) ?? []
    group.push({ index, token })
    grouped.set(key, group)
  })
  return grouped
}

const diffByKey = (
  fromTokens: LayoutToken[],
  toTokens: LayoutToken[],
  buildKey: (token: LayoutToken) => string
) => {
  const fromItems = buildTokenSequence(fromTokens, buildKey)
  const toItems = buildTokenSequence(toTokens, buildKey)
  const fromKeys = fromItems.map((item) => item.key)
  const toKeys = toItems.map((item) => item.key)
  const matrix = Array.from({ length: fromKeys.length + 1 }, () =>
    Array.from({ length: toKeys.length + 1 }, () => 0)
  )

  for (let i = fromKeys.length - 1; i >= 0; i -= 1) {
    const row = matrix[i]
    if (!row) {
      continue
    }

    for (let j = toKeys.length - 1; j >= 0; j -= 1) {
      const fromKey = fromKeys[i] ?? ""
      const toKey = toKeys[j] ?? ""

      if (fromKey === toKey) {
        row[j] = (matrix[i + 1]?.[j + 1] ?? 0) + 1
      } else {
        const nextRow = matrix[i + 1]
        const currentRow = matrix[i]
        row[j] = Math.max(nextRow?.[j] ?? 0, currentRow?.[j + 1] ?? 0)
      }
    }
  }

  const matches: Array<[number, number]> = []
  let i = 0
  let j = 0

  while (i < fromKeys.length && j < toKeys.length) {
    const fromKey = fromKeys[i] ?? ""
    const toKey = toKeys[j] ?? ""

    if (fromKey === toKey) {
      matches.push([i, j])
      i += 1
      j += 1
      continue
    }

    const skipFrom = matrix[i + 1]?.[j] ?? 0
    const skipTo = matrix[i]?.[j + 1] ?? 0

    if (skipFrom >= skipTo) {
      i += 1
    } else {
      j += 1
    }
  }

  const matchedFrom = new Set(matches.map(([index]) => index))
  const matchedTo = new Set(matches.map(([, index]) => index))

  const matched = matches.flatMap(([fromIndex, toIndex]) => {
    const fromItem = fromItems[fromIndex]
    const toItem = toItems[toIndex]

    if (!fromItem || !toItem) {
      return []
    }

    return [{ from: fromItem.token, to: toItem.token }]
  })

  return {
    added: toItems.filter((_, index) => !matchedTo.has(index)).map((item) => item.token),
    matched,
    removed: fromItems.filter((_, index) => !matchedFrom.has(index)).map((item) => item.token),
  }
}

const matchByCategory = (removed: LayoutToken[], added: LayoutToken[]) => {
  const matched: Array<{ from: LayoutToken; to: LayoutToken }> = []
  const usedFrom = new Set<number>()
  const usedTo = new Set<number>()
  const removedByCategory = groupByKey(removed, buildCategoryKey)
  const addedByCategory = groupByKey(added, buildCategoryKey)

  for (const [categoryKey, fromGroup] of removedByCategory) {
    const toGroup = addedByCategory.get(categoryKey) ?? []

    for (const fromEntry of fromGroup) {
      if (usedFrom.has(fromEntry.index)) {
        continue
      }

      let bestMatch: TokenWithIndex | null = null
      let bestDistance = Infinity

      for (const toEntry of toGroup) {
        if (usedTo.has(toEntry.index)) {
          continue
        }

        const distance =
          Math.abs(fromEntry.token.y - toEntry.token.y) * 1000 +
          Math.abs(fromEntry.token.x - toEntry.token.x)

        if (distance < bestDistance) {
          bestDistance = distance
          bestMatch = toEntry
        }
      }

      if (bestMatch) {
        matched.push({ from: fromEntry.token, to: bestMatch.token })
        usedFrom.add(fromEntry.index)
        usedTo.add(bestMatch.index)
      }
    }
  }

  return {
    matched,
    stillAdded: added.filter((_, index) => !usedTo.has(index)),
    stillRemoved: removed.filter((_, index) => !usedFrom.has(index)),
  }
}

const matchByExactContent = (removed: LayoutToken[], added: LayoutToken[]) => {
  const matched: Array<{ from: LayoutToken; to: LayoutToken }> = []
  const usedFrom = new Set<number>()
  const usedTo = new Set<number>()
  const removedByContent = groupByKey(removed, buildExactKey)
  const addedByContent = groupByKey(added, buildExactKey)

  for (const [contentKey, fromGroup] of removedByContent) {
    const toGroup = addedByContent.get(contentKey) ?? []

    for (const fromEntry of fromGroup) {
      if (usedFrom.has(fromEntry.index)) {
        continue
      }

      let bestMatch: TokenWithIndex | null = null
      let bestDistance = Infinity

      for (const toEntry of toGroup) {
        if (usedTo.has(toEntry.index)) {
          continue
        }

        const distance =
          Math.abs(fromEntry.token.y - toEntry.token.y) * 1000 +
          Math.abs(fromEntry.token.x - toEntry.token.x)

        if (distance < bestDistance) {
          bestDistance = distance
          bestMatch = toEntry
        }
      }

      if (bestMatch) {
        matched.push({ from: fromEntry.token, to: bestMatch.token })
        usedFrom.add(fromEntry.index)
        usedTo.add(bestMatch.index)
      }
    }
  }

  return {
    matched,
    stillAdded: added.filter((_, index) => !usedTo.has(index)),
    stillRemoved: removed.filter((_, index) => !usedFrom.has(index)),
  }
}

export const flattenSceneTokens = (scene: Scene) =>
  scene.layout.lines.flatMap((line) => line.tokens)

export const diffLayoutTokens = (fromTokens: LayoutToken[], toTokens: LayoutToken[]) => {
  const exactDiff = diffByKey(fromTokens, toTokens, buildExactKey)
  const contentMatches = matchByExactContent(exactDiff.removed, exactDiff.added)
  const categoryMatches = matchByCategory(contentMatches.stillRemoved, contentMatches.stillAdded)

  return {
    added: categoryMatches.stillAdded,
    matched: [...exactDiff.matched, ...contentMatches.matched, ...categoryMatches.matched],
    removed: categoryMatches.stillRemoved,
  }
}

export const buildTransitionDiff = (fromScene: Scene, toScene: Scene) =>
  diffLayoutTokens(flattenSceneTokens(fromScene), flattenSceneTokens(toScene))

export const easeInOutCubic = (progress: number) => {
  const clamped = Math.min(1, Math.max(0, progress))
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - (-2 * clamped + 2) ** 3 / 2
}

export const buildTransitionTokens = (diff: TransitionDiff, progress: number) => {
  const clamped = Math.min(1, Math.max(0, progress))
  const tokens: DrawToken[] = []

  for (const token of diff.removed) {
    const opacity = 1 - clamped
    if (opacity <= 0) {
      continue
    }

    tokens.push({
      color: token.color,
      content: token.content,
      fontStyle: token.fontStyle,
      opacity,
      width: token.width,
      x: token.x,
      y: token.y - DEFAULT_TRANSITION_DRIFT * clamped,
    })
  }

  for (const match of diff.matched) {
    const width = lerp(match.from.width, match.to.width, clamped)
    const x = lerp(match.from.x, match.to.x, clamped)
    const y = lerp(match.from.y, match.to.y, clamped)
    const hasMismatch =
      match.from.content !== match.to.content || match.from.fontStyle !== match.to.fontStyle

    if (hasMismatch) {
      const fromOpacity = 1 - clamped
      if (fromOpacity > 0) {
        tokens.push({
          color: match.from.color,
          content: match.from.content,
          fontStyle: match.from.fontStyle,
          opacity: fromOpacity,
          width,
          x,
          y,
        })
      }

      const toOpacity = clamped
      if (toOpacity > 0) {
        tokens.push({
          color: match.to.color,
          content: match.to.content,
          fontStyle: match.to.fontStyle,
          opacity: toOpacity,
          width,
          x,
          y,
        })
      }
      continue
    }

    tokens.push({
      color: blendColors(match.from.color, match.to.color, clamped),
      content: match.to.content,
      fontStyle: match.to.fontStyle,
      opacity: 1,
      width,
      x,
      y,
    })
  }

  for (const token of diff.added) {
    const opacity = clamped
    if (opacity <= 0) {
      continue
    }

    tokens.push({
      color: token.color,
      content: token.content,
      fontStyle: token.fontStyle,
      opacity,
      width: token.width,
      x: token.x,
      y: token.y + DEFAULT_TRANSITION_DRIFT * (1 - clamped),
    })
  }

  return tokens
}

export const renderTransitionTokens = (context: CanvasContext, tokens: DrawToken[]) => {
  const textContext = context
  const previousAlpha = textContext.globalAlpha
  const previousBaseline = textContext.textBaseline
  const previousAlign = textContext.textAlign
  const previousFont = textContext.font
  const previousFillStyle = textContext.fillStyle

  textContext.textBaseline = "top"
  textContext.textAlign = "left"

  for (const token of tokens) {
    if (token.opacity <= 0) {
      continue
    }

    const fontStyle = token.fontStyle
    const isItalic = (fontStyle & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC
    const isBold = (fontStyle & FONT_STYLE_BOLD) === FONT_STYLE_BOLD
    const isUnderline = (fontStyle & FONT_STYLE_UNDERLINE) === FONT_STYLE_UNDERLINE

    textContext.globalAlpha = token.opacity
    textContext.font = buildFont(isItalic, isBold)
    textContext.fillStyle = token.color
    textContext.fillText(token.content, token.x, token.y)

    if (isUnderline && token.width > 0) {
      drawUnderline(textContext, token.x, token.y, token.width)
    }
  }

  textContext.globalAlpha = previousAlpha
  textContext.textBaseline = previousBaseline
  textContext.textAlign = previousAlign
  textContext.font = previousFont
  textContext.fillStyle = previousFillStyle
}
