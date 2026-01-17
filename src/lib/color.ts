export const expandShortHex = (hex: string) => {
  if (hex.length === 3) {
    const r = hex.charAt(0)
    const g = hex.charAt(1)
    const b = hex.charAt(2)
    return r + r + g + g + b + b
  }
  if (hex.length === 4) {
    const r = hex.charAt(0)
    const g = hex.charAt(1)
    const b = hex.charAt(2)
    const a = hex.charAt(3)
    return r + r + g + g + b + b + a + a
  }
  return hex
}

export const parseHexColor = (color: string) => {
  const normalized = expandShortHex(color.replace("#", "").trim())
  if (normalized.length !== 6 && normalized.length !== 8) {
    return {
      alpha: 1,
      blue: 11,
      green: 11,
      red: 11,
    }
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const alpha = normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1

  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue) || Number.isNaN(alpha)) {
    return { alpha: 1, blue: 11, green: 11, red: 11 }
  }

  return {
    alpha,
    blue,
    green,
    red,
  }
}

export const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress

export const blendColors = (from: string, to: string, progress: number) => {
  const fromColor = parseHexColor(from)
  const toColor = parseHexColor(to)

  const blended = {
    alpha: lerp(fromColor.alpha, toColor.alpha, progress),
    blue: lerp(fromColor.blue, toColor.blue, progress),
    green: lerp(fromColor.green, toColor.green, progress),
    red: lerp(fromColor.red, toColor.red, progress),
  }

  return `rgba(${Math.round(blended.red)}, ${Math.round(blended.green)}, ${Math.round(
    blended.blue
  )}, ${blended.alpha.toFixed(3)})`
}
