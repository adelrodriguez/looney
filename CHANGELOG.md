# sakuga

## 0.1.0

### Minor Changes

- b8406d0: Add git command to render videos from file commit history.
- 949d105: Document FFmpeg 4.3+ requirement. Switch MP4 to yuv420p pixel format for better compatibility (now requires even dimensions). Adjust encoding defaults: MP4 CRF 12 with high profile, WebM CRF 20. Add faststart flag for improved MP4 streaming.

### Patch Changes

- 048bc9b: Hide FFmpeg output by default and add verbose logging.

## 0.0.4

### Patch Changes

- 79d5960: Fix CLI entry point importing from incorrect file

  Updates bin/sakuga to import from dist/index.js instead of dist/cli.js, ensuring the CLI command works correctly after build.

## 0.0.3

### Patch Changes

- 4ebbd91: Improve error handling with informative, well-formatted error messages.
  - Add comprehensive error handlers for all render command errors (file system, markdown parsing, theme, FFmpeg, validation)
  - Include documentation links to Shiki languages/themes and FFmpeg installation
  - Add CLI validation error handlers for unclustered flags and multiple values
  - Use multi-line formatted messages with contextual details

- 6806ee9: Improve render defaults and output quality for exports.
  - Default width/height to 0 for auto-sized renders
  - Increase ffmpeg quality (mp4 yuv444p, higher CRF, unsharp, per-format args)
  - Encode via raw temp file pipeline before ffmpeg
  - Improve text rendering with optimizeLegibility and rounded coordinates

## 0.0.2

### Patch Changes

- 7ed7730: Improve template initialization and documentation structure
  - Restructure CLAUDE.md with clear sections for Agents and Bun usage instructions
  - Enhance template script to remove CHANGELOG.md along with docs directory during initialization
  - Improve user feedback messages during template cleanup process

- f704383: Refactor the renderer to stream frames to ffmpeg, remove mediabunny/webcodecs and browser APIs, and make CLI output selection optional with mp4/webm formats.
- 58521bd: Match transition tokens by semantic scope categories, prioritize string scopes, add exact-content fallback matching, and crossfade mismatched matches.
- a8a58dc: refactor shared render helpers and drawing utilities
- 307cb04: Expose render configuration via CLI options and thread config through the render pipeline.
