# sakuga

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
