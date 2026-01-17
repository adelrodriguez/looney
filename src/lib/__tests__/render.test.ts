import { describe, expect, it } from "bun:test"
import { computeFrameCounts } from "../render"

describe("computeFrameCounts", () => {
  it("returns expected frame counts", () => {
    const result = computeFrameCounts(1000, 25)

    expect(result.frameDuration).toBeCloseTo(0.04)
    expect(result.blockFrames).toBeGreaterThan(0)
    expect(result.transitionFrames).toBe(25)
  })
})
