# Verify the declared responsibility

Run the [shared-button example](../examples/native-stack/README.md) to inspect COD enforcement through real browser behavior. Settings and Team share a button and theme. The checks exercise loading, disabled state, keyboard access, appearance and the effects of controlled owner changes.

## Three different questions

- **Behavior:** do the actual consumers meet the current requirement?
- **Ownership:** do they depend on the intended shared policy, rather than reproduce it locally?
- **Evolution:** do owner changes reach those consumers without separately repairing copies?

The same live checker must accept delegation and valid wrappers, while rejecting behavior-correct copies, unused-owner references and owner-using local overrides. The example changes theme tokens and the component-owned mapping separately: importing real tokens does not establish shared component behavior.

Two-way review fingerprints expire after contract or implementation changes. Explicit reaffirmation permits compatible refactors without artificial consumer edits. Fresh fingerprints cannot excuse failed behavior or propagation. See [change bindings](change-bindings.md) for the compact record and [qualification](variant-qualification.md) for reusable counterexamples.

## Delivery and limits

All required project checks still apply, including compilation, integration and reviewed visual baselines. A browser reload, timeout or missing result is unresolved evidence. A successful scoped command does not establish whole-repository conformance, deployment correctness or general agent productivity.

This example is an executable mechanism demonstration. Empirical research records, model comparisons and transcripts are stored outside the repository and package. Adopting COD does not require generating those artifacts.
