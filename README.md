<div align="center">
  <h1 align="center">🍂 sakuga</h1>

  <p align="center">
    <strong>Create code animations from Markdown files</strong>
  </p>
</div>

![Sakuga demo](examples/demo.gif)

## Requirements

- [Node.js](https://nodejs.org/) (v18 or higher)
- [ffmpeg](https://ffmpeg.org/) installed and available in your PATH

## How To Use

Create a Markdown file with fenced code blocks:

```bash
bunx sakuga render examples/demo.md
```

To specify an output path, pass `--output` or `-o`:

```bash
bunx sakuga render examples/demo.md --output examples/demo.mp4
```

### Options

- `--format`, `-f`: Output container (`mp4` or `webm`, default: `mp4`).
- `--output`, `-o`: Output path (defaults to the input name + format extension).
- `--theme`, `-t`: Shiki theme for syntax highlighting (default: `github-dark`).
- `--background`: Fallback background color (default: `#0b0b0b`).
- `--foreground`: Fallback foreground color (default: `#e6e6e6`).
- `--font-family`: Font family for rendering (default: `SFMono-Regular` stack).
- `--font-size`: Font size in pixels (default: `24`).
- `--line-height`: Line height in pixels (default: `34`).
- `--padding`: Padding around the code block in pixels (default: `64`).
- `--width`: Minimum width of the rendered video in pixels (default: `0` for auto).
- `--height`: Minimum height of the rendered video in pixels (default: `0` for auto).
- `--fps`: Frames per second (default: `60`).
- `--block-duration`: Duration of each code block in seconds (default: `2`).
- `--transition`, `-tr`: Transition duration between slides in milliseconds (default: `800`).
- `--transition-drift`: Pixel drift applied during transitions (default: `8`).
- `--tab-replacement`: String used to replace tabs (default: `"  "`).

## Performance

Sakuga builds scenes concurrently when possible to maximize performance.

Made with [🥐 `pastry`](https://github.com/adelrodriguez/pastry)

## License

[MIT](LICENSE)
