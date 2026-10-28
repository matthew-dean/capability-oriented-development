# COD-Kit - the home of Capability Oriented Development

**One rule. One place to change it.**

Two pages can look correct while quietly keeping separate copies of a shared rule. COD makes the intended relationship explicit and tests it: when the shared owner changes, do its real consumers follow?

Start with [the plain-language explanation](docs/start-here.md). Then [run the button walkthrough](examples/native-stack/README.md).

## One contract, three commands

`capability.json` names the need, existing pieces considered, reuse decision, responsibility, owner, consumers, allowed changes, expected results and native checks. The toolkit reads this file directly. You do not maintain separate runtime, qualification, workflow or binding definitions.

```sh
cod inspect . capability.json
cod review . capability.json --reason "Explain the change and what you reviewed"
cod verify . capability.json --allow-execution
```

`inspect` shows the file map and exact checks. `review` records current input identities and your explanation; it does not approve a design or run tests. `verify` requires current review, challenges the same native checker with wrappers and bypasses, then checks actual behavior, owner-change propagation and disagreement in both change directions.

A passing result covers the declared assertions. Review still decides whether the rules make sense and whether the consumer inventory is complete.

## The same flow in three stacks

| Profile | Working example | Native execution |
|---|---|---|
| JavaScript library | [Shared button](examples/native-stack/README.md) | Node and real Chromium observations |
| C# library | [Pricing and Checkout](examples/csharp-library/README.md) | .NET projects rebuilt and executed for each check |
| Vue design system | [Button and Settings SFCs](examples/vue-design-system/README.md) | Vue compilation and real Chromium observations |

All three use the same schema, commands, review gate and production-source substitution engine. See [profiles](docs/contract-profiles.md) and the [contract reference](docs/contracts.md).

## Build and run

Use Node 22.13+ on the 22 line or Node 24, pnpm through Corepack, Python 3.10+, and the .NET 10 SDK for the C# example:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm build
node dist/cli.js inspect examples/native-stack capability.json
node dist/cli.js verify examples/native-stack capability.json --allow-execution
corepack pnpm verify:pr
```

Checked-in example reviews are current for their supplied sources. After editing, review and record the changed agreement before verifying. Commands run trusted local code and source probes; run one verification process at a time in a checkout.

Package publication is disabled. Use the built CLI or a local tarball. Source and documentation are MIT-licensed.

## Find the next page

- [Quickstart](docs/quickstart.md): commands and a failure you can reproduce.
- [Contract reference](docs/contracts.md): fields, native check protocol, exits and migration.
- [Agent setup](docs/agent-setup.md): use the same contract through agent guidance and read-only MCP inspection.
- [SCIP mapping](docs/scip-mapping.md): optional generated source maps configured in the same contract.
- [Specification](docs/specification.md): the obligations and their limits.
- [Distributed adoption](docs/distributed-adoption.md): responsibilities across repositories and services.

The older low-level APIs remain available for existing integrations. New adoption starts with the unified contract. [The documentation map](docs/README.md) separates that path from the integration references.
