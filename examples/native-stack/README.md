# Follow one button rule from promise to test

Settings and Team use one shared button. The button owns its appearance and interaction rules. Each screen chooses its own words and action.

Start with [the short explanation](../../docs/start-here.md). This is a JavaScript library example, checked by the same toolkit as [C#](../csharp-library/README.md) and [Vue](../vue-design-system/README.md).

## Run it

From the repository root, with Node 22.13+ on the 22 line or Node 24:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm build
node dist/cli.js inspect examples/native-stack capability.json
node dist/cli.js verify examples/native-stack capability.json --allow-execution
```

The supplied review is current for the supplied source. `ready-for-review` means the declared tests passed. It is not automatic approval of the design.

For a guided, step-by-step demonstration:

```sh
node examples/native-stack/checks/walkthrough.mjs
```

It changes temporary apps and reports each expected failure. It uses the same behavior/ownership assertions as the toolkit gate. It does not replace that gate.

## Open these files in order

| File | What to look for |
|---|---|
| [capability.json](capability.json) | Shared job, owner, consumers, allowed changes, expected values, alternatives and checker |
| [src/button.mjs](src/button.mjs) | The actual owner applies the rules |
| [src/settings.mjs](src/settings.mjs) and [src/team.mjs](src/team.mjs) | Each actual caller uses the owner |
| [checks/contract.mjs](checks/contract.mjs) | The standard `behavior`, `ownership`, `changes` entrypoint |
| [checks/support.mjs](checks/support.mjs) | Where promised values are compared with observations and owner changes are tested |

The adjacent [capability.review.json](capability.review.json) is generated bookkeeping. You do not need to read hashes to understand the contract. The toolkit implementation lives in [src/contracts.ts](../../src/contracts.ts); there is no example-only contract runner.

## Walk through one change

The request is: **“Make the buttons more rounded.”** The intended new radius is `24px`.

### 1. Check the need and find the owner

`decision` explains the need, the existing piece inspected and why we reuse it. Here both pages need the same rules and already have a shared button. A second button implementation would duplicate that responsibility. Review that choice before adding code.

`owner` points to `src/button.mjs`, export `createButton`. The theme and CSS support that owner. `consumers` names the two real screens.

Settings delegates like this:

```js
import { createButton } from './button.mjs';

export function createAction(options) {
  return createButton('Save changes', options);
}
```

The screen chooses its words; the button owns its appearance. The contract's `rules` explain allowed options and extension. The tests enforce their declared assertions; another prose sentence does not create a new assertion by itself.

### 2. Read the promised result

In the same file, `requirements.appearance.radius` is `"10px"`. One shared expectation covers both screens and all three states. The `states` section covers idle, disabled and busy behavior. Each consumer's `examples` hold its own label and action result.

`behavior()` reads these expectations. [observe()](checks/observe.mjs) separately opens the real app and reads computed styles, activation effects and keyboard reachability. The observer never reads the contract.

```text
Contract → expected values ─┐
                           ├─ comparison
Real screens → observations┘
```

### 3. Change only the promise

The guided command changes the expected radius to `24px` and leaves source alone. The same behavior assertion used for delivery rejects it:

```text
settings/idle: violates capability.json
```

The screen still renders `10px`. Saying that the change is done cannot make this assertion pass.

### 4. Change the owner too

The command changes `radius` in [src/theme.mjs](src/theme.mjs) to `24px`. Both screens now match the promise without editing either screen.

[The change tests](checks/changes.test.mjs) also break only the implementation by making it ignore disabled state. The unchanged promise catches that. The toolkit separately requires a current review after source or contract changes; recording review never excuses either mismatch.

### 5. Try a copy that looks right

The command starts a fresh app at `10px` and replaces Settings with [a copy that keeps an unused import](variants/settings-dead-owner-decoy.mjs).

It passes behavior today. Then the ownership test changes only the theme. The real shared button follows; the copy does not. Ownership fails.

A second probe changes the component's radius rule by adding `3px`. This catches a copy that imports the real theme but reimplements the component rule. The probe restores exact source bytes afterward.

## What the toolkit does with alternatives

Each consumer declares its alternative source files in `capability.json`. The toolkit puts each file in the real consumer's place, runs the same checker, and restores the consumer. The checker never receives the alternative's label.

| Alternative | Behavior today | Ownership |
|---|---|---|
| Original or wrapper | Pass | Pass |
| Independent copy | Pass | Reject |
| Copy with unused import | Pass | Reject |
| Real component with local surface override | Pass | Reject |
| Copy sharing the theme | Pass | Reject |

A `PASS` beside a copy means it was rejected as expected. A browser crash is unresolved evidence, not a caught copy. [Readable native test cases](checks/contract.test.mjs) illustrate the same assertions for readers; the normal gate gets its case table from the contract.

The native checker also checks this app's independent source inventory and delivery entrypoint. The observer visits both screens independently of the contract, so deleting Team from the contract cannot quietly erase its observations.

## Reproduce both change directions

```sh
node --test --test-concurrency=1 examples/native-stack/checks/changes.test.mjs
```

These focused assertions are also run by the toolkit's required `changes` mode. Shared toolkit regressions test missing/stale review, fresh review with broken behavior, unavailable checks, altered inputs and source restoration.

## Make an intentional change

Update the owner and changed requirement. Update deliberate copies/overrides to the new baseline too: they must still pass today's behavior and fail specifically on ownership. Review the changed agreement, then:

```sh
node dist/cli.js review examples/native-stack capability.json --reason "Explain the reviewed design change and affected screens"
node dist/cli.js verify examples/native-stack capability.json --allow-execution
```

The repository's normal `verify:pr` runs this exact toolkit gate. In an installed package consumer, `npm run verify` in the example invokes `cod verify`; install the COD tarball in that workspace first. There is no independently maintained native review implementation.

## Where is the index?

`owner` and `consumers` are the authored file map. `cod inspect` displays them. This small example has no generated SCIP map, and the tool says so.

Larger projects may configure `mapping` in the same contract. `cod refresh-map` writes `.cod/cache/<id>.json`; inspection and verification report its freshness. Source references help find consumers but do not prove use of the owner's result. See [the contract reference](../../docs/contracts.md#optional-scip-mapping-uses-this-same-file).

## View the app

```sh
node examples/native-stack/serve.mjs
```

Open `http://127.0.0.1:4178/`. Use the screen navigation and `&state=busy` or `&state=disabled` to inspect the states. Run one verification process at a time. These checks cover the declared sample behavior, not every accessibility property.
