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

To render git history for a file:

```bash
bunx sakuga git README.md
```

To specify an output path, pass `--output` or `-o`:

```bash
bunx sakuga render --output examples/demo.mp4 examples/demo.md
```

To limit commits for git history:

```bash
bunx sakuga git --commits 5 README.md
```

To render newest → oldest instead:

```bash
bunx sakuga git --reverse README.md
```

### Options

Note: With `@effect/cli@0.73.0`, options must appear before positional args.

- `--format`, `-f`: Output container (`mp4` or `webm`, default: `mp4`).
- `--output`, `-o`: Output path (defaults to the input name + format extension).
- `--commits`, `-c`: Number of commits to render for `sakuga git` (default: `10`).
- `--reverse`: Render newest to oldest for `sakuga git`.
- `--language`, `-l`: Override the syntax highlighting language for `sakuga git`.
- `--theme`, `-t`: Shiki theme for syntax highlighting (default: `github-dark`).
- `--background`, `-bg`: Fallback background color (default: `#0b0b0b`).
- `--foreground`, `-fg`: Fallback foreground color (default: `#e6e6e6`).
- `--font-family`, `-ff`: Font family for rendering (default: `SFMono-Regular` stack).
- `--font-size`, `-fs`: Font size in pixels (default: `24`).
- `--line-height`, `-lh`: Line height in pixels (default: `34`).
- `--padding`, `-p`: Padding around the code block in pixels (default: `64`).
- `--width`, `-w`: Minimum width of the rendered video in pixels (default: `0` for auto).
- `--height`, `-h`: Minimum height of the rendered video in pixels (default: `0` for auto).
- `--fps`, `-r`: Frames per second (default: `60`).
- `--block-duration`, `-bd`: Duration of each code block in seconds (default: `2`).
- `--transition`, `-tr`: Transition duration between slides in milliseconds (default: `800`).
- `--transition-drift`, `-td`: Pixel drift applied during transitions (default: `8`).
- `--tab-replacement`, `-tb`: String used to replace tabs (default: `"  "`).

## Performance

Sakuga builds scenes concurrently when possible to maximize performance.

Made with [🥐 `pastry`](https://github.com/adelrodriguez/pastry)

## License

[MIT](LICENSE)
