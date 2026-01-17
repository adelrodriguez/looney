import { describe, expect, it } from "bun:test"
import { blendColors, expandShortHex, parseHexColor } from "../color"

describe("color helpers", () => {
  it("expands short hex", () => {
    expect(expandShortHex("abc")).toBe("aabbcc")
    expect(expandShortHex("abcd")).toBe("aabbccdd")
  })

  it("parses hex color", () => {
    const color = parseHexColor("#ff8800")

    expect(color.red).toBe(255)
    expect(color.green).toBe(136)
    expect(color.blue).toBe(0)
  })

  it("blends colors", () => {
    const blended = blendColors("#000000", "#ffffff", 0.5)

    expect(blended).toContain("rgba(")
  })
})
