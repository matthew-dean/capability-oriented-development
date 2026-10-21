# A shared button that stays shared

Settings and Team use one button component. Change its design tokens once and both screens should update, including loading and disabled states. A page-local copy can look identical today while ignoring the next shared change. This example makes that copy fail verification.

## Run the application

From the repository root, after installing its dependencies:

```sh
corepack pnpm exec playwright install chromium
node examples/native-stack/serve.mjs
```

Open `http://127.0.0.1:4178/`. Use the Settings/Team navigation. Add `&state=busy` or `&state=disabled` to either screen URL to inspect those states.

For a standalone copy, use Node 22.13+ or Node 24, run `npm ci --ignore-scripts --no-audit --no-fund`, then `npx playwright install chromium` and `npm start`. Its pinned dependencies are Playwright and dependency-cruiser; the native gate has no COD CLI dependency.

## Run the checks

```sh
corepack pnpm test:native-stack
```

The native checks launch one browser at a time. They render both screens and inspect computed color, corner radius, padding, keyboard access, actual activation, loading and disabled behavior. A theme-only probe changes blue/10px corners to purple/24px corners and observes the screens again. A separate component-only probe adds 3px to the radius mapping while preserving its theme reference. This detects copies that import the real theme but independently reproduce the Button rule. Both probes restore exact source bytes afterward.

Every screen is also tested with six actual implementations:

| Implementation | Looks and works correctly today | Follows the shared design change |
|---|---|---|
| Shared component | Yes | Yes |
| Wrapper around the shared component | Yes | Yes |
| Correct local button copy | Yes | **No — rejected** |
| Local copy with an unused shared-component reference | Yes | **No — rejected** |
| Shared component with a page-owned surface override | Yes | **No — rejected** |
| Local component copy that imports the real theme and retains an unused Button import | Yes | **No — rejected** |

Dependency-cruiser catches missing dependencies but admits the unused-reference decoy. The rendered change check catches that bypass and the local surface override. The override still uses the real component and follows its radius; its copied surface policy is enough to violate the declared responsibility. A source import or a matching screenshot is insufficient by itself.

[The contract](CAPABILITY.md), [browser observer](checks/observe.mjs), [propagation check](checks/support.mjs) and [qualification tests](checks/contract.test.mjs) are small enough to inspect. The binding tests separately demonstrate that contract edits expire consumer evidence, source edits require contract review, and fresh review identities cannot excuse incompatible behavior. A compatible change can reaffirm the existing contract explicitly.

## Reproduce both change directions

Run the native binding tests from the repository root:

```sh
node --test --test-concurrency=1 examples/native-stack/checks/bindings.test.mjs
```

The tests create disposable fixtures and restore/remove them afterward. They demonstrate three different obligations:

- Editing the contract or a covered implementation expires its review, including a behavior-preserving edit. Explicit reaffirmation can close that freshness obligation.
- Changing the executable appearance examples without changing the theme fails behavior, even after the review identities are refreshed. Updating the matching theme makes behavior pass and requires a current implementation review.
- Changing the button to ignore disabled state fails behavior against the unchanged contract, even with fresh review identities.

The [test source](checks/bindings.test.mjs) shows the mutations and assertions. Fresh review records establish that someone reconciled the current inputs; they cannot excuse incompatible behavior. No source changes are required to reproduce these tests.

## Use the toolkit workflow too

After building this COD checkout, run from its root:

```sh
node dist/cli.js workflow examples/native-stack checks/workflow.json --allow-execution
```

The toolkit applies twelve reviewed production variants and runs the same native behavior/conformance commands used for live verification. Strict change bindings cover the component, theme and both screens. The correct app becomes `ready-for-review`; copy/decoy cases must retain behavior and fail conformance. A checker error is unresolved coverage, not a successful rejection.

Verification temporarily changes source. Use a disposable copy or exclusive access and run one verification process at a time. Do not overlap browser tests or edits in this tree.

## What this demonstrates

This is a hand-authored executable example, not a full-application LLM comparison. It shows how to make a specific design-system bypass fail delivery using existing tools. The [verification guide](../../docs/evidence.md) explains the declared scope. These checks do not establish universal design quality, complete consumer discovery or every accessibility property.

Native checks and the optional toolkit workflow share `checks/review.json`. Its compact format stores the contract identity once, implementation identities by ID and one scoped explanation. A code edit does not produce a second ledger, per-change proof archive or reset patches.
