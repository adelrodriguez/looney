export type CanvasMeasure = {
  font: string
  measureText: (text: string) => { width: number }
}

export type CanvasText = {
  fillStyle: unknown
  font: string
  globalAlpha: number
  lineWidth: number
  strokeStyle: unknown
  textAlign: string
  textBaseline: string
  beginPath: () => void
  fillRect: (x: number, y: number, width: number, height: number) => void
  fillText: (text: string, x: number, y: number) => void
  getImageData: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    data: Uint8ClampedArray
  }
  getTransform: () => unknown
  lineTo: (x: number, y: number) => void
  moveTo: (x: number, y: number) => void
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  setTransformMatrix?: (transform: unknown) => void
  stroke: () => void
}

export type CanvasContext = CanvasMeasure &
  CanvasText & {
    canvas?: unknown
  }
