import { describe, expect, it } from "bun:test"
import type { CanvasContext } from "../context"
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from "../constants"
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
  }

  return { calls, context }
}

describe("buildFont", () => {
  it("should build the default font string", () => {
    expect(buildFont(false, false)).toBe(`${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`)
  })

  it("should add italic and bold styles", () => {
    expect(buildFont(true, true)).toBe(`italic bold ${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`)
  })

  it("should handle italic-only styles", () => {
    expect(buildFont(true, false)).toBe(`italic ${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`)
  })
})

describe("drawUnderline", () => {
  it("should draw underline with computed style and restore context", () => {
    const { calls, context } = createContext()
    const x = 10
    const y = 20
    const width = 80

    drawUnderline(context, x, y, width)

    const underlineY = y + DEFAULT_FONT_SIZE + 2

    expect(calls.beginPath).toBe(1)
    expect(calls.moveTo).toEqual([[x, underlineY]])
    expect(calls.lineTo).toEqual([[x + width, underlineY]])
    expect(calls.stroke).toBe(1)
    expect(calls.strokeStyleAtStroke).toBe(context.fillStyle)
    expect(calls.lineWidthAtStroke).toBe(Math.max(1, Math.floor(DEFAULT_FONT_SIZE / 12)))
    expect(context.strokeStyle).toBe("#00f")
    expect(context.lineWidth).toBe(5)
  })
})
