# Repository foundation

This repository uses [Threadlabs Foundation](https://github.com/threadlabs-studio/foundation) for its TypeScript library baseline: maintained Node lines, pinned pnpm, strict ESM TypeScript, Vitest, Oxlint, GitHub Actions, dependency updates and installed-package verification. The project uses the MIT license. Package publication remains disabled independently of GitHub visibility.

[threadlabs.config.json](../threadlabs.config.json) records adopted modules, scoped exceptions and intentional project ownership. Preserve native COD implementation, examples and verification when reviewing framework updates. Generated plans and journals stay ignored; managed locks are maintained by the framework.

Run a read-only `threadlabs audit . --json` before adopting framework changes. Review any proposed migration before applying it. [The code documentation standard](code-documentation-standard.md) defines when non-obvious implementation constraints need maintained explanations.
