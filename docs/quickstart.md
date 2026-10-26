# Run a contract, then watch a mistake fail

Read [the short explanation](start-here.md), then build the toolkit:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm build
```

Use Node 22.13+ on the 22 line or Node 24. The C# example also needs .NET 10.

## Inspect before executing

```sh
node dist/cli.js inspect examples/native-stack capability.json
```

The output names the owner, both consumers, the native checker modes and the review/map states. Open the returned files. Add `--json` for the full input and counterexample list.

## Verify

```sh
node dist/cli.js verify examples/native-stack capability.json --allow-execution
```

Expected result: `ready-for-review`. Wrappers should report ownership exit `0`; copies and overrides should report ownership exit `1` while behavior remains `0`. Each line marked `PASS` means the expected outcome occurred, including the intended rejections.

The explicit flag permits trusted project execution and temporary source substitutions. It is not a sandbox. Run one verification process at a time.

## Follow a failure step by step

```sh
node examples/native-stack/checks/walkthrough.mjs
```

This teaching command uses temporary apps and the same native assertions. It explains a contract-only radius change failing, the matching owner change passing, and a correct-looking copy failing ownership. It does not replace the full toolkit gate above.

[Read the full button walkthrough](../examples/native-stack/README.md).

## Try the same flow in C# or Vue

```sh
node dist/cli.js verify examples/csharp-library capability.json --allow-execution
node dist/cli.js verify examples/vue-design-system capability.json --allow-execution
```

See the [profiles](contract-profiles.md) for their actual native execution. Each uses the same schema and toolkit.

## After a real edit

Reconcile changed requirements, source and counterexamples. Record what you reviewed, then run verification:

```sh
node dist/cli.js review examples/native-stack capability.json --reason "Explain the reviewed change and affected consumers"
node dist/cli.js verify examples/native-stack capability.json --allow-execution
```

A refreshed review cannot excuse incompatible behavior. A stale review cannot be silently ignored. See [the contract reference](contracts.md) for inputs, exits and optional source maps.

## Next steps

[Adopt a contract in your project](workflows.md), [set up agent guidance](agent-setup.md), or look up a field in the [contract reference](contracts.md).
