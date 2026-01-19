import type { TokenCategory } from "./types"

const SCOPE_TO_CATEGORY: Array<[RegExp, TokenCategory]> = [
  [/^keyword\.operator/, "operator"],
  [/^keyword\./, "keyword"],
  [/^storage\.type/, "keyword"],
  [/^storage\.modifier/, "keyword"],
  [/^entity\.name\.function/, "function"],
  [/^entity\.name\.type/, "type"],
  [/^entity\.name\.class/, "type"],
  [/^string\./, "string"],
  [/^constant\.numeric/, "number"],
  [/^comment\./, "comment"],
  [/^punctuation\./, "punctuation"],
  [/^meta\.brace/, "punctuation"],
  [/^variable\./, "identifier"],
  [/^entity\.name\./, "identifier"],
]

export const categorizeToken = (scopes: string[]): TokenCategory => {
  for (const scope of scopes) {
    if (!scope) {
      continue
    }
    if (scope.startsWith("string.")) {
      return "string"
    }
    if (scope.startsWith("punctuation.definition.string")) {
      return "string"
    }
  }

  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    const scope = scopes[index]
    if (!scope) {
      continue
    }
    for (const [pattern, category] of SCOPE_TO_CATEGORY) {
      if (pattern.test(scope)) {
        return category
      }
    }
  }
  return "other"
}
