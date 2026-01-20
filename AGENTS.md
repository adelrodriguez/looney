# AGENTS.md

This project was built with [`pastry`](https://github.com/adelrodriguez/pastry) template.

<!-- effect-solutions:start -->

## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `.reference/effect/` for real implementations (run `effect-solutions setup` first)

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns - check the guide first.

<!-- effect-solutions:end -->

## Quality Control

- We use `adamantite` for linting, formatting and type checking.
- Tests use Bun (`bun test`). Do not use Vitest.
- Always run `bun run format` after editing files.
- After making changes, run `bun run check`, `bun run typecheck` and `bun run test` to ensure the code is still valid.
- After installing or removing dependencies, run `bun run analyze` to ensure we are not using any dependencies that are not needed.

## Coding Style

- Prefer inline error creation over helper functions. Do not create `toSomeError()` helper functions to convert errors - inline the error construction at each usage site instead.
- Do not use the global `Error` class - use Effect's `Data.TaggedError` instead.

## Changesets

- We use `changesets` for versioning and changelog management.
- Run `bun changeset --empty` to create a new empty changeset file.
- Never make a major version bump unless the user requests it.
- If a breaking change is being made, and we are on v1.0.0 or higher, alert the user.
