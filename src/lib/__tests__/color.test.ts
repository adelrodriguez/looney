import { describe, expect, it } from "bun:test"
import { blendColors, expandShortHex, lerp, parseHexColor } from "../color"

describe("expandShortHex", () => {
  it("should expand 3-digit hex", () => {
    expect(expandShortHex("abc")).toBe("aabbcc")
  })

  it("should expand 4-digit hex with alpha", () => {
    expect(expandShortHex("abcd")).toBe("aabbccdd")
  })

  it("should return hex unchanged when already expanded", () => {
    expect(expandShortHex("aabbcc")).toBe("aabbcc")
    expect(expandShortHex("aabbccdd")).toBe("aabbccdd")
  })
})

describe("parseHexColor", () => {
  it("should parse 6-digit hex colors", () => {
    const color = parseHexColor("#ff8800")

    expect(color.red).toBe(255)
    expect(color.green).toBe(136)
    expect(color.blue).toBe(0)
    expect(color.alpha).toBe(1)
  })

  it("should parse 8-digit hex colors with alpha", () => {
    const color = parseHexColor("#ff880080")

    expect(color.red).toBe(255)
    expect(color.green).toBe(136)
    expect(color.blue).toBe(0)
    expect(color.alpha).toBeCloseTo(128 / 255)
  })

  it("should accept short hex and normalize", () => {
    const color = parseHexColor("#0f08")

    expect(color.red).toBe(0)
    expect(color.green).toBe(255)
    expect(color.blue).toBe(0)
    expect(color.alpha).toBeCloseTo(136 / 255)
  })

  it("should return fallback values for invalid hex", () => {
    const color = parseHexColor("nope")

    expect(color.red).toBe(11)
    expect(color.green).toBe(11)
    expect(color.blue).toBe(11)
    expect(color.alpha).toBe(1)
  })
})

describe("lerp", () => {
  it("should interpolate between two numbers", () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
  })

  it("should return the start at progress 0", () => {
    expect(lerp(3, 9, 0)).toBe(3)
  })

  it("should return the end at progress 1", () => {
    expect(lerp(3, 9, 1)).toBe(9)
  })
})

describe("blendColors", () => {
  it("should blend colors and return rgba string", () => {
    const blended = blendColors("#000000", "#ffffff", 0.5)

    expect(blended).toBe("rgba(128, 128, 128, 1.000)")
  })

  it("should blend alpha values", () => {
    const blended = blendColors("#00000000", "#000000ff", 0.25)

    expect(blended).toBe("rgba(0, 0, 0, 0.250)")
  })
})
