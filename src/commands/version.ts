import { NodeContext } from "@effect/platform-node"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { Effect, Schema } from "effect"

const PackageJson = Schema.Struct({ version: Schema.String })

export const readVersion = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const contents = yield* fs.readFileString(
        path.join(import.meta.dirname, "../..", "package.json")
      )
      const parsed = yield* Schema.decodeUnknown(Schema.parseJson(PackageJson))(contents)

      return parsed.version
    }).pipe(
      Effect.provide(NodeContext.layer),
      Effect.catchTags({
        BadArgument: () => Effect.die("Failed to read version from package.json"),
        ParseError: () => Effect.die("Unable to parse version from package.json"),
        SystemError: () => Effect.die("System error reading package.json"),
      })
    )
  )
