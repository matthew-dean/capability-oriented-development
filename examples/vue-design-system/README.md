# A Vue button that stays shared

Settings uses `Button.vue`. The button owns its corner radius and busy behavior. Settings chooses its words and action.

Open [capability.json](capability.json), [Button.vue](src/Button.vue), [Settings.vue](src/Settings.vue), then [the native checks](checks/contract.mjs).

After installing repository dependencies and Chromium and building the toolkit, run from the repository root:

```sh
node dist/cli.js inspect examples/vue-design-system capability.json
node dist/cli.js verify examples/vue-design-system capability.json --allow-execution
```

This runs the same toolkit flow as JavaScript and C#. The Vue profile invokes a Node checker, which compiles the real SFCs and visits their output in Chromium. A production project would reuse its existing Vue build server; this small sample compiles its SFCs on request.

The checks inspect normal and busy buttons, their radius, and the effect of activation. They change the theme, then a component-owned radius rule. A valid wrapper follows both changes. A copy, unused component import or page-local radius override must fail ownership while still passing today's behavior.

The profile requires a local-override counterexample. Using the real component is not enough if the view replaces its owned style.

The `changes` mode proves that a contract-only radius change and an implementation-only disabled-state change fail. The toolkit restores substituted consumers; the checker restores its temporary owner/contract changes.

After an intentional edit:

```sh
node dist/cli.js review examples/vue-design-system capability.json --reason "Describe the reviewed component and view changes"
node dist/cli.js verify examples/vue-design-system capability.json --allow-execution
```

The complete example gate is part of `pnpm verify:pr`. These assertions cover the declared sample states and style boundary, not every Vue pattern or accessibility property.
