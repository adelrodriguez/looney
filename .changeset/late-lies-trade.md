---
"sakuga": patch
---

Fix CLI entry point importing from incorrect file

Updates bin/sakuga to import from dist/index.js instead of dist/cli.js, ensuring the CLI command works correctly after build.
