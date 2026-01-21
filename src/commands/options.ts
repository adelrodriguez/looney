import type { BundledTheme } from "shiki"
import { Options } from "@effect/cli"

const DEFAULT_THEME: BundledTheme = "github-dark"
const DEFAULT_WIDTH = 0
const DEFAULT_HEIGHT = 0
const DEFAULT_FPS = 60
const DEFAULT_BLOCK_DURATION = 2
const DEFAULT_TRANSITION_DURATION_MS = 800
const DEFAULT_TRANSITION_DRIFT = 8
const DEFAULT_BACKGROUND = "#0b0b0b"
const DEFAULT_FONT_FAMILY =
  "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
const DEFAULT_FONT_SIZE = 24
const DEFAULT_FOREGROUND = "#e6e6e6"
const DEFAULT_LINE_HEIGHT = 34
const DEFAULT_PADDING = 64
const TAB_REPLACEMENT = "  "

export const background = Options.text("background").pipe(
  Options.withAlias("bg"),
  Options.withDefault(DEFAULT_BACKGROUND),
  Options.withDescription("Background color behind the code")
)

export const blockDuration = Options.float("block-duration").pipe(
  Options.withAlias("bd"),
  Options.withDefault(DEFAULT_BLOCK_DURATION),
  Options.withDescription("Seconds each code block stays on screen")
)

export const fontFamily = Options.text("font-family").pipe(
  Options.withAlias("ff"),
  Options.withDefault(DEFAULT_FONT_FAMILY),
  Options.withDescription("Font family for the text")
)

export const fontSize = Options.integer("font-size").pipe(
  Options.withAlias("fs"),
  Options.withDefault(DEFAULT_FONT_SIZE),
  Options.withDescription("Font size in pixels")
)

export const foreground = Options.text("foreground").pipe(
  Options.withAlias("fg"),
  Options.withDefault(DEFAULT_FOREGROUND),
  Options.withDescription("Default text color")
)

export const format = Options.choice("format", ["mp4", "webm"] as const).pipe(
  Options.withAlias("f"),
  Options.withDefault("mp4"),
  Options.withDescription("Output container format.")
)

export const fps = Options.integer("fps").pipe(
  Options.withAlias("r"),
  Options.withDefault(DEFAULT_FPS),
  Options.withDescription("Frames per second for the video")
)

export const height = Options.integer("height").pipe(
  Options.withAlias("h"),
  Options.withDefault(DEFAULT_HEIGHT),
  Options.withDescription("Minimum output height in pixels (0 = auto)")
)

export const lineHeight = Options.integer("line-height").pipe(
  Options.withAlias("lh"),
  Options.withDefault(DEFAULT_LINE_HEIGHT),
  Options.withDescription("Line height in pixels")
)

export const output = Options.file("output").pipe(
  Options.withAlias("o"),
  Options.withDescription("Destination video path"),
  Options.optional
)

export const padding = Options.integer("padding").pipe(
  Options.withAlias("p"),
  Options.withDefault(DEFAULT_PADDING),
  Options.withDescription("Padding around the code block in pixels")
)

export const tabReplacement = Options.text("tab-replacement").pipe(
  Options.withAlias("tb"),
  Options.withDefault(TAB_REPLACEMENT),
  Options.withDescription("Text used instead of tabs")
)

export const theme = Options.text("theme").pipe(
  Options.withAlias("t"),
  Options.withDefault(DEFAULT_THEME),
  Options.withDescription("Shiki theme for syntax highlighting")
)

export const transitionDrift = Options.float("transition-drift").pipe(
  Options.withAlias("td"),
  Options.withDefault(DEFAULT_TRANSITION_DRIFT),
  Options.withDescription("Pixel drift during transitions")
)

export const transitionDurationMs = Options.integer("transition").pipe(
  Options.withAlias("tr"),
  Options.withDefault(DEFAULT_TRANSITION_DURATION_MS),
  Options.withDescription("Transition time between slides in ms")
)

export const width = Options.integer("width").pipe(
  Options.withAlias("w"),
  Options.withDefault(DEFAULT_WIDTH),
  Options.withDescription("Minimum output width in pixels (0 = auto)")
)
