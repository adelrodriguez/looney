import { Effect } from "effect"
import {
  renderVideoBrowser,
  type BrowserOutput,
  type RenderVideoBrowserOptions,
} from "../lib/browser"
import { DEFAULT_THEME } from "../lib/constants"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { resolveTheme } from "../lib/theme"
import { WebCodecs } from "../lib/webcodecs"

export type RenderOptions = RenderVideoBrowserOptions & {
  markdown: string
  theme?: string
}

export type RenderResult = BrowserOutput

export const render = (options: RenderOptions) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { markdown, theme: themeOption, ...browserOptions } = options
      const theme = themeOption ?? DEFAULT_THEME
      const resolvedTheme = yield* resolveTheme(theme)
      const blocks = yield* parseMarkdownCodeBlocks(markdown)

      const result = yield* renderVideoBrowser(resolvedTheme, blocks, browserOptions)

      return result
    }).pipe(Effect.provide(WebCodecs.browser))
  )
