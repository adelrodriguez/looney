---
"sakuga": patch
---

Improve render defaults and output quality for exports.

- Default width/height to 0 for auto-sized renders
- Increase ffmpeg quality (mp4 yuv444p, higher CRF, unsharp, per-format args)
- Encode via raw temp file pipeline before ffmpeg
- Improve text rendering with optimizeLegibility and rounded coordinates
