import type { CanvasContext } from "./context"
import type { RenderConfig } from "./types"

export function buildFont(config: RenderConfig, isItalic: boolean, isBold: boolean) {
  const style = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}`
  return `${style}${config.fontSize}px ${config.fontFamily}`
}

export function drawUnderline(
  config: RenderConfig,
  context: CanvasContext,
  x: number,
  y: number,
  width: number
) {
  const drawContext = context
  const previousStrokeStyle = drawContext.strokeStyle
  const previousLineWidth = drawContext.lineWidth
  const underlineY = y + config.fontSize + 2

  drawContext.strokeStyle = drawContext.fillStyle
  drawContext.lineWidth = Math.max(1, Math.floor(config.fontSize / 12))
  drawContext.beginPath()
  drawContext.moveTo(x, underlineY)
  drawContext.lineTo(x + width, underlineY)
  drawContext.stroke()

  drawContext.strokeStyle = previousStrokeStyle
  drawContext.lineWidth = previousLineWidth
}
