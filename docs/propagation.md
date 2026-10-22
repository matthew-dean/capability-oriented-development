# Observe an actual provider change

`verify-propagation` runs one observer against the real consumer, substitutes a reviewed provider probe, and runs that same observer again. The tool compares the returned JSON values with declared examples. It does not accept an ownership checker's self-reported pass/fail label.

```sh
cod verify-propagation /path/to/app .cod/propagation.json --allow-execution
```

Use it as the same ownership/evolution command in a runtime contract and a [production-variant qualification](variant-qualification.md). Qualify every declared consumer with behavior-correct copies and dead-owner decoys. An observer that merely invokes the provider, ignoring the consumer, follows the provider even when the consumer is copied: its negative cases therefore fail qualification.

## Definition

```json
{
  "propagationVersion": 1,
  "id": "ui.relative-time",
  "responsibility": "Screens follow shared relative-time wording",
  "inputs": [".cod/propagation.json", "observe.mjs", "src/relative-time.mjs", "src/history.mjs", "fixtures/wording-probe.mjs"],
  "provider": {"target": "src/relative-time.mjs", "probe": "fixtures/wording-probe.mjs"},
  "observe": {"command": "node", "args": ["observe.mjs"], "cwd": "."},
  "expected": {"baseline": ["moments ago", "5 minutes ago"], "changed": ["just now", "5m ago"]}
}
```

The observer must invoke actual production entrypoints and emit exactly one JSON value on stdout. Diagnostics belong on stderr. Arrays, objects, strings, numbers, booleans and null are supported; object property order is irrelevant and array order matters. Expected baseline and changed observations must differ. Use meaningful, named results when observing several consumers.

### Distinguish a bypass from stale provider execution

When provider loading can fail independently of the consumer, include a known observation of the provider's changed policy in the same result. Set optional `controlPath` to its property path, for example `["control", "wording"]`. Both expected observations must contain that path and its value must change. The rest of the result must still observe the actual production consumers.

For example, an observer can emit `{"control":{"wording":"just now"},"history":"just now","activity":"just now"}` after a wording change. The control observes the provider directly or through a known independent consumer; `history` and `activity` execute the entrypoints being checked. If the control does not match its changed expectation, the runner returns `unresolved`. If it does match but an owned consumer retains the old wording, the runner returns `violated`. An incompatible probe or an unrelated control cannot establish readiness; review that the control observes the selected policy.

Qualify this observer with a copied consumer while leaving the control intact. A control-only observer will incorrectly accept that copy and fail qualification. An omitted `controlPath` preserves the original comparison behavior; readiness must then be established independently where required. Do not claim that a failure established a consumer bypass when provider execution remains unknown.

For framework tests, a small wrapper can run the native test framework, read JSON written from actual mounted/rendered consumer values, and emit it on stdout. Clear the observation file before every run; never return cached observations or reconstruct expected answers from the contract. The observer receives no case role or expected result argument from COD. Its source and every relevant dependency belong in registered inputs.

`inputs` contains 1–500 unique root-relative regular files, including the provider target and probe. Include the definition, observer, normative examples and actual consumers. Unknown fields are rejected; `cwd` defaults to `.`. Paths and command directories are preflighted before substitution. Provider probe bytes must differ from the original and preserve the native interfaces needed by the consumers. A TypeScript probe, for example, should preserve unrelated exports while changing the chosen policy.

Probe the policy used by each actual consumer, including supported variants and composition. Change its ordinary value at the existing CSS or configuration priority. Do not overpower local overrides to make propagation appear successful. Qualify a shared-component consumer with a local surface or rule override alongside full copies and dead references. A wrapper or new supported variant is not a failure merely because an observer assumes one preferred API.

For compiled applications, rebuild both observations from the corresponding source or establish running-code freshness. A cold compiler start can avoid hot-reload races; a live compiler needs an independently observed readiness condition. Confirm independently that the controlled provider change reached execution before interpreting a target failure; a known control consumer is one option. The contract does not require adding another product consumer solely for verification. An unavailable actuator or compiler reload is unresolved evidence. Keep startup preparation outside measured interactions and retain unsuccessful attempts.

The runner restores original provider bytes in `finally`, including after failure or timeout, and checks registered input identities. It runs trusted project commands, not a sandbox. Use a disposable checkout or exclusive source access; do not run overlapping verification/editing in that tree. Timeout defaults to five minutes per observer invocation and supports the runtime runner's bounded library option.

| Exit | Observation |
|---|---|
| 0 / `verified` | Baseline and provider-change observations match the declared examples |
| 1 / `violated` | The baseline is correct, but the provider-change observation does not match |
| 2 / `unresolved` | Invalid input, wrong baseline, observer failure, malformed/missing JSON, timeout or changed registered inputs |

An unavailable observer or wrong baseline cannot count as the expected exit 1 of a negative qualification case. Passing still requires review that the observer really executes all claimed consumers and the probe represents the selected responsibility. This mechanism checks declared propagation, not universal architectural quality.

Try the packaged example with `cod verify-propagation examples/workflow propagation.json --allow-execution`. It records real outputs from `live/consumer.mjs`, changes only `live/owner.mjs`, and restores it afterward.

## Keep the probe attached to the rule

Follow the actual configured consumer call chain to the policy declaration, including imports, re-exports and supported wrappers. A loader file is not necessarily the owner. After a legitimate move, update the probe binding and source identity while preserving the same consumer examples and changed-policy expectation. Record missing execution as unresolved until the adapted probe runs; do not classify the refactor itself as a reuse failure. Change only the selected owner rule, not every similar expression in its file or an independent consumer copy.

Choose cases that distinguish interacting policies. For example, an error-reporting SDK may suppress HTTP 404 while a workflow recovers from it. Checking that successful recovery emits no event would then miss an erroneous early report. Include a recoverable error that the SDK would otherwise report, such as a supported HTTP 501 fallback, and assert no event after recovery succeeds. The workflow owns recovery and relevance; the SDK owns global reporting eligibility. A copied eligibility filter can satisfy today's examples yet block the next owner-policy change.
