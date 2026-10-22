# Capability-Oriented Development

**Give shared behavior an owner. Make bypasses detectable. Keep the contract current.**

Capability-Oriented Development (COD) gives people and coding agents a way to find, use and evolve existing capabilities. A capability is a responsibility—such as a permission rule, a button’s appearance or relative-time wording—with an authoritative implementation, supported variations and identifiable consumers.

Its contract connects that responsibility to executable checks. A feature must work today; its consumers must also follow the shared rules that future changes depend on.

## Start here

| I want to… | Read or run |
|---|---|
| Understand COD and what qualifies | [The specification](docs/specification.md) |
| See a working example | [Shared-button app and native checks](examples/native-stack/README.md) |
| Try the supplied toolkit | [CLI quickstart](docs/quickstart.md) |
| Adopt it in an existing codebase | [Adoption workflow](docs/workflows.md#adopt-in-an-existing-repository) |
| Use it with a coding agent | [Codex and Claude Code setup](docs/agent-setup.md) |
| Keep my existing tools | [Qualifying tool stacks](docs/existing-tools.md) and [recipes](docs/tool-recipes.md) |
| Work across repos or services | [Distributed adoption](docs/distributed-adoption.md) |

## Contents

- [How it works](#how-it-works)
- [Run the example](#run-the-example)
- [Adopt COD](#adopt-cod)
- [Tools and agent guidance](#tools-and-agent-guidance)
- [Relationship to spec-driven development](#relationship-to-spec-driven-development)
- [What the checks establish](#what-the-checks-establish)
- [Build and verify](#build-and-verify)
- [Contribute](#contribute)

## How it works

Consider a request: “Can these controls look like this design?” The request need not mention a design system. The agent inspects the existing component and its documented options, then uses or extends the fitting owner. Page layout and actions remain with the page.

A local copy might look correct while quietly duplicating the shared appearance. COD checks both current behavior and the ownership relationship: does changing the shared policy reach the real consumer? A local skin can fail that check even when it imports the right component.

A typical change follows four steps:

1. **Find the responsibility.** Inspect candidate owners, current source, supported variation and examples.
2. **Make the smallest adequate change.** Configure, reuse, compose or extend a fitting owner. Keep legitimate one-off behavior local; justify a new owner with an actual unmet need.
3. **Verify behavior and relationships.** Run native tests and qualified checks that accept valid alternatives and reject copies or partial bypasses.
4. **Reconcile the contract.** Contract changes require current owner/consumer evidence. Covered implementation changes require contract review, even when requirements remain unchanged.

A contract need not be another JSON file. Existing types, tests, interface definitions and responsibility notes can provide it. [What qualifies as COD](docs/specification.md#2-what-qualifies-as-cod) describes the supported approaches.

## Run the example

The [shared-button app](examples/native-stack/README.md) has Settings and Team screens using one component. Native browser tests cover appearance, loading, disabled behavior and keyboard access. Ownership checks accept composition and reject behavior-correct copies, dead imports and local skins. Two-way checks detect stale contract reviews and incompatible behavior.

After [installing the development dependencies](#build-and-verify):

```sh
node examples/native-stack/serve.mjs
```

Open `http://127.0.0.1:4178/`. Stop the server before running source-mutating checks:

```sh
corepack pnpm test:native-stack
```

This example uses Node tests, Playwright and dependency-cruiser without the COD toolkit. The [CLI quickstart](docs/quickstart.md) demonstrates the toolkit’s workflow, qualification and propagation commands separately.

## Adopt COD

Start with one recurring responsibility or a reproduced reuse problem. Preserve existing safeguards. Identify its owner, actual consumers, supported variation and required behavior, then connect the missing checks to the repository’s normal verification command.

Use the [adoption procedure](docs/workflows.md#adopt-in-an-existing-repository). For an owner in another repository, follow [distributed adoption](docs/distributed-adoption.md): reference the authoritative contract, test the real hand-off and keep source inventory separate from deployment evidence.

Apply the [contract authoring contract](docs/specification.md#contract-authoring-contract) to COD itself. Reuse native verification; add only missing observations. A passing check does not justify an unnecessary framework, abstraction or generated report.

## Tools and agent guidance

You can use existing tools or the supplied toolkit. The [setup guide](docs/agent-setup.md) explains the repository skills and local plugin installation. Package and plugin marketplace publication are separate from source availability; do not assume an npm package or marketplace listing exists.

| Tools | Purpose |
|---|---|
| `check`, `index`, `discover`, `plan` | Resolve TypeScript capabilities and retrieve candidate owners, constraints and evidence |
| `snapshot`, `reconcile` | Compare capability graphs and route changes to affected responsibilities |
| `enforce` | Check explicitly declared Vue presentation boundaries |
| `verify-contract`, `verify-propagation` | Execute registered obligations and observe consumer results under a provider change |
| `qualify-witness`, `qualify-variants` | Challenge conformance checks with valid alternatives and behavior-correct bypasses |
| `binding-state`, `verify-bindings`, `workflow` | Detect stale two-way reviews and combine current evidence for review |
| `inspect-system` | Inspect supplied cross-repository ownership and contract pins; does not evaluate conformance |
| `serve` | Expose six read-only inspection tools through stdio MCP |
| [Workflow skill](skills/cod-workflow/SKILL.md) | Guide discovery, proportionate reuse, verification and reconciliation |

Commands execute trusted project checks; they are not a sandbox. Automatic source resolution supports TypeScript, and the presentation adapter covers a bounded Vue pattern. Native runners can verify other languages and platforms. See the [documentation map](docs/README.md) for command and format references.

## Relationship to spec-driven development

Feature specifications explain what a change should do. COD carries that intent into persistent responsibility contracts: where shared rules belong, how consumers may vary, and what later changes must preserve.

COD can extend a good SDD workflow. Its particular focus is making selected ownership and evolution obligations executable, alongside behavioral acceptance. SDD can also use persistent contracts and deterministic checks. The [architectural rationale](docs/architecture.md) explains the relationship and research foundations.

## What the checks establish

The examples demonstrate that current behavior can pass while shared ownership fails, and that selected contract/implementation disagreements can block delivery in both change directions. The [verification guide](docs/evidence.md) explains how to reproduce and challenge those mechanisms.

A passing gate establishes its declared assertions. It does not prove complete consumer coverage, optimal abstractions, lower maintenance cost or universal reuse advantage. Discovery remains lexical; architectural fit, contract necessity and qualification meaning require evidence-based review. The [specification’s implementation limits](docs/specification.md#implementation-limits-and-evolution) describe remaining gaps.

## Build and verify

Use Node 22.13+ on the 22 line or Node 24, pnpm through Corepack, and Python 3.10+ for distribution checks:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm verify:pr
```

Run these commands from the repository root. Verification includes lint, types, product tests, native browser checks, distribution checks and an installed-tarball consumer test. The toolkit can be used from its built source or a local tarball; package publication remains disabled.

The code and documentation use the [MIT license](LICENSE). [package.json](package.json) owns the single release identity; format numbers identify serialized compatibility formats.

## Contribute

[Report a bug, propose a change or ask an adoption question](https://github.com/matthew-dean/capability-oriented-development/issues/new/choose). Include a small reproduction or a concrete unmet requirement. Prefer existing tools and owners; explain the missing observation before proposing a new checker.

Keep private source, credentials and research transcripts out of issues and pull requests. Ordinary regression tests and reusable counterexamples belong with the product; transient execution output belongs in ignored paths or CI artifacts.

For existing applications, [SCIP mapping](docs/scip-mapping.md) connects compiler-derived source relationships to reviewed capability bindings and reports stale maps and affected consumers.
