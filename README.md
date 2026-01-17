<div align="center">
  <h1 align="center">🍂 sakuga</h1>

  <p align="center">
    <strong>Create code animations</strong>
  </p>
</div>

## Demo

<video src="examples/demo.mp4" controls></video>

## Performance

### Concurrency

Sakuga builds scenes concurrently when possible to maximize performance:

- **Node environment**: Scene building uses isolated measurement canvases (one per code block) to safely run in parallel without font state races.
- **Browser environment**: When a `createCanvas` factory is provided via options, each scene gets its own isolated measurement canvas for parallel execution. If only a shared canvas is provided without a factory, scene building runs sequentially to ensure correctness.

Made with [🥐 `pastry`](https://github.com/adelrodriguez/pastry)
