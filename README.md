# COD-Kit - the home of Capability Oriented Development

**Capability-Oriented Development · One rule. One place to change it.**

[![CI](https://github.com/matthew-dean/cod-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/matthew-dean/cod-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Two pages can look correct while keeping separate copies of a shared rule. COD makes ownership explicit and checks the relationship: **when the owner changes, do its real consumers follow?**

cod-kit provides **agent skills, a Claude Code plugin, a verification CLI and runnable examples**. COD is the ongoing approach; the kit helps you apply it with your existing tools.

[Understand COD](docs/start-here.md) · [Install agent guidance](#install-agent-guidance) · [Run an example](docs/quickstart.md) · [Browse the docs](docs/README.md)

## Start here

| I want to… | Go to… |
|---|---|
| Understand what qualifies as COD | [Plain-language introduction](docs/start-here.md) · [Specification](docs/specification.md) |
| Give my agent the workflow | [Install the skills or plugin](#install-agent-guidance) |
| See a realistic bypass fail | [Shared-button walkthrough](examples/native-stack/README.md) |
| Adopt COD in an existing repository | [Adoption workflow](docs/workflows.md) · [Existing-tool recipes](docs/tool-recipes.md) |
| Map source or connect repositories | [SCIP mapping](docs/scip-mapping.md) · [Distributed adoption](docs/distributed-adoption.md) |

## Install agent guidance

Clone the repository once:

```sh
git clone https://github.com/matthew-dean/cod-kit.git
```

| Included skill | Use it to… |
|---|---|
| `cod-adopt` | Establish a capability contract using existing project tools |
| `cod-workflow` | Discover owners, reuse or extend them, and verify a change |

### Codex

From your **application repository**, copy both skills, including their references:

```sh
cod_source=/absolute/path/to/cod-kit
mkdir -p .agents/skills
cp -R "$cod_source/skills/cod-adopt" .agents/skills/
cp -R "$cod_source/skills/cod-workflow" .agents/skills/
```

Start a new session and request `$cod-adopt` or `$cod-workflow`, followed by your actual task. Review existing skill copies before replacing them.

### Claude Code

From your **application repository**, load the supplied plugin:

```sh
claude --plugin-dir /absolute/path/to/cod-kit
```

Request `/cod:cod-adopt` or `/cod:cod-workflow`. This is a local plugin installation; no marketplace listing is required.

**Skills guide the agent; required project checks enforce the contract.** Installing guidance does not install the CLI or your application's test dependencies. [Complete the setup](docs/agent-setup.md) to route covered tasks through the workflow and enable optional read-only MCP inspection.

## One contract, three commands

`capability.json` names the need, reuse decision, owner, consumers, growth rules, expected results and native checks. No separate runtime, qualification or binding definitions are needed for this workflow.

| Command | What it does |
|---|---|
| `cod inspect . capability.json` | Shows the file map and exact checks |
| `cod review . capability.json --reason "What changed and what I reviewed"` | Records current inputs and your explanation; does not approve a design or run tests |
| `cod verify . capability.json --allow-execution` | Requires current review, challenges the native checker with wrappers and bypasses, and tests behavior, propagation and both change directions |

[Contract reference](docs/contracts.md) · [Step-by-step quickstart](docs/quickstart.md)

## Try it in your stack

| Example | Native execution |
|---|---|
| [JavaScript: shared button and two screens](examples/native-stack/README.md) | Node and real Chromium observations |
| [C#: pricing and checkout](examples/csharp-library/README.md) | .NET projects rebuilt and executed for each check |
| [Vue: Button and Settings components](examples/vue-design-system/README.md) | Vue compilation and real Chromium observations |

All three use the same schema and verification engine. [Compare profiles](docs/contract-profiles.md).

## Find capabilities across repositories

`cod catalog <root>` derives a file and ownership map from standard contracts. `cod sync <root>` retrieves connected provider catalogs through Git; `cod connections <root>` shows the selected versions, newer candidates, missing evidence and affected consumers. Retrieval never executes provider code or upgrades packages. See [setup and workflow](docs/connected-catalogs.md).

## Build and run

<details>
<summary><strong>Build the CLI and run the complete verification suite</strong></summary>

Use Node 22.13+ on the 22 line or Node 24, pnpm through Corepack, Python 3.10+, and the .NET 10 SDK for the C# example. From the cod-kit checkout:

```sh
node tools/setup.mjs
corepack pnpm exec playwright install chromium
corepack pnpm build
node dist/cli.js inspect examples/native-stack capability.json
node dist/cli.js verify examples/native-stack capability.json --allow-execution
corepack pnpm verify:pr
```

Source setup installs and builds with the pnpm release declared in `package.json`, using npm’s native executable lookup. It does not change global tools or rely on an existing Corepack cache. The remaining Corepack commands require a compatible Corepack installation/cache; CI uses Corepack 0.34.7. Source setup itself is independent of that cache.

Checked-in example reviews are current for their supplied sources. After editing, review and record the changed agreement before verifying. Commands run trusted local code and source probes; run one verification process at a time in a checkout.

Package publication is disabled. Use the built CLI or a local tarball. [Source and guidance archives](docs/preview.md) are another distribution option.

</details>

## What a passing check means

A pass covers the **declared assertions and consumers**, not every possible architectural mistake. Types and dependency rules can be deterministic within their scope; browser observations need a controlled environment, and design decisions still need judgment.

COD is not a one-time setup. Keep contracts, maps and checks aligned as the system changes, and verify that realistic bypasses still fail. [Verification scope and limits](docs/evidence.md).

Code and documentation are [MIT-licensed](LICENSE). [All documentation →](docs/README.md)
