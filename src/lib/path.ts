import type * as Path from "@effect/platform/Path"

export const resolveOutputPath = (pathService: Path.Path, inputPath: string) => {
  const parsed = pathService.parse(inputPath)
  return pathService.join(parsed.dir, `${parsed.name}.mp4`)
}
