import { describe, expect, it } from "bun:test"
import type { CanvasContext } from "../context"
import type { RenderConfig } from "../types"
import { buildFont, drawUnderline } from "../text"

const noop = () => null

const createContext = () => {
  const calls = {
    beginPath: 0,
    lineTo: [] as Array<[number, number]>,
    lineWidthAtStroke: undefined as number | undefined,
    moveTo: [] as Array<[number, number]>,
    stroke: 0,
    strokeStyleAtStroke: undefined as unknown,
  }

  const context: CanvasContext = {
    beginPath: () => {
      calls.beginPath += 1
    },
    fillRect: noop,
    fillStyle: "#f00",
    fillText: noop,
    font: "",
    getImageData: () => ({ data: new Uint8ClampedArray() }),
    getTransform: () => ({}),
    globalAlpha: 1,
    lineTo: (x, y) => {
      calls.lineTo.push([x, y])
    },
    lineWidth: 5,
    measureText: () => ({ width: 0 }),
    moveTo: (x, y) => {
      calls.moveTo.push([x, y])
    },
    setTransform: noop,
    stroke: () => {
      calls.stroke += 1
      calls.strokeStyleAtStroke = context.strokeStyle
      calls.lineWidthAtStroke = context.lineWidth
    },
    strokeStyle: "#00f",
    textAlign: "left",
    textBaseline: "top",
    textRendering: "auto",
  }

  return { calls, context }
}

const renderConfig: RenderConfig = {
  background: "#0b0b0b",
  blockDuration: 2,
  fontFamily:
    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 24,
  foreground: "#e6e6e6",
  fps: 60,
  height: 720,
  lineHeight: 34,
  padding: 64,
  tabReplacement: "  ",
  transitionDrift: 8,
  transitionDurationMs: 800,
  width: 1280,
}

describe("buildFont", () => {
  it("builds the default font string", () => {
    expect(buildFont(renderConfig, false, false)).toBe(
      `${renderConfig.fontSize}px ${renderConfig.fontFamily}`
    )
  })

  it("adds italic and bold styles", () => {
    expect(buildFont(renderConfig, true, true)).toBe(
      `italic bold ${renderConfig.fontSize}px ${renderConfig.fontFamily}`
    )
  })

  it("handles italic-only styles", () => {
    expect(buildFont(renderConfig, true, false)).toBe(
      `italic ${renderConfig.fontSize}px ${renderConfig.fontFamily}`
    )
  })
})

describe("drawUnderline", () => {
  it("draws underline with computed style and restores context", () => {
    const { calls, context } = createContext()
    const x = 10
    const y = 20
    const width = 80

    drawUnderline(renderConfig, context, x, y, width)

    const underlineY = y + renderConfig.fontSize + 2

    expect(calls.beginPath).toBe(1)
    expect(calls.moveTo).toEqual([[x, underlineY]])
    expect(calls.lineTo).toEqual([[x + width, underlineY]])
    expect(calls.stroke).toBe(1)
    expect(calls.strokeStyleAtStroke).toBe(context.fillStyle)
    expect(calls.lineWidthAtStroke).toBe(Math.max(1, Math.floor(renderConfig.fontSize / 12)))
    expect(context.strokeStyle).toBe("#00f")
    expect(context.lineWidth).toBe(5)
  })
})
