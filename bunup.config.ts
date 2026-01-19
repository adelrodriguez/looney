import { defineConfig } from "bunup"

export default defineConfig([
  {
    entry: ["src/cli.ts"],
    format: "esm",
    name: "cli",
    outDir: "dist",
    sourcemap: true,
    target: "node",
  },
  {
    clean: false,
    dts: true,
    entry: ["src/index.ts"],
    format: "esm",
    name: "library",
    outDir: "dist",
    sourcemap: true,
    target: "browser",
  },
])
