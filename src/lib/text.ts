import type { CanvasContext } from "./context"
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from "./constants"

export const buildFont = (isItalic: boolean, isBold: boolean) => {
  const style = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}`
  return `${style}${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`
}

export const drawUnderline = (context: CanvasContext, x: number, y: number, width: number) => {
  const drawContext = context
  const previousStrokeStyle = drawContext.strokeStyle
  const previousLineWidth = drawContext.lineWidth
  const underlineY = y + DEFAULT_FONT_SIZE + 2

  drawContext.strokeStyle = drawContext.fillStyle
  drawContext.lineWidth = Math.max(1, Math.floor(DEFAULT_FONT_SIZE / 12))
  drawContext.beginPath()
  drawContext.moveTo(x, underlineY)
  drawContext.lineTo(x + width, underlineY)
  drawContext.stroke()

  drawContext.strokeStyle = previousStrokeStyle
  drawContext.lineWidth = previousLineWidth
}
