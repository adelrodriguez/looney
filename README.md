<div align="center">
  <h1 align="center">🍂 sakuga</h1>

  <p align="center">
    <strong>Create code animations</strong>
  </p>
</div>

## Demo

<video src="examples/demo.mp4" controls></video>

## How To Use

Install `ffmpeg`, then create a Markdown file with fenced code blocks:

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
- `--transition`, `-tr`: Transition duration between slides in milliseconds (default: `800`).

## Performance

Sakuga builds scenes concurrently when possible to maximize performance.

Made with [🥐 `pastry`](https://github.com/adelrodriguez/pastry)
