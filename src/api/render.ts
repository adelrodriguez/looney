import { Effect } from "effect"
import { DEFAULT_THEME } from "../lib/constants"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { renderVideo, type RenderVideoBrowserOptions } from "../lib/render/browser"
import { resolveTheme } from "../lib/theme"
import { WebCodecs } from "../lib/webcodecs"

export type RenderOptions = RenderVideoBrowserOptions & {
  markdown: string
  theme?: string
}

export const render = (options: RenderOptions) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { markdown, theme: themeOption, ...browserOptions } = options
      const theme = themeOption ?? DEFAULT_THEME
      const resolvedTheme = yield* resolveTheme(theme)
      const blocks = yield* parseMarkdownCodeBlocks(markdown)

      const result = yield* renderVideo(resolvedTheme, blocks, browserOptions)

      return result
    }).pipe(
      Effect.provide(WebCodecs.browser),
      Effect.catchTags({
        WebCodecsUnavailable: () => Effect.die("WebCodecs is unavailable."),
      })
    )
  )

export type { BrowserOutput as RenderResult } from "../lib/render/browser"
