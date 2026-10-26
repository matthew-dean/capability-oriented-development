# Qualify the checker used in delivery

Use production-source variants when adopting a new ownership or evolution check. The runner applies each reviewed fixture to the actual source path, invokes the **same behavior and conformance commands**, and restores the original source before the next case. Case labels are not arguments or environment variables passed to the checker. This prevents qualifying a separate fixture-label classifier while a different checker inspects production code.

```sh
cod qualify-variants /path/to/app .cod/qualification.json --allow-execution
```

Commands execute trusted project code without a shell. This is not a sandbox. Run one verification process at a time in that source tree: overlays are temporary writes, not a parallel-safe snapshot. Use a disposable checkout when other people or tools may edit the same files.

## Define reviewed production variants

```json
{
  "qualificationVersion": 2,
  "id": "button-checker",
  "responsibility": "Screens follow shared button appearance",
  "inputs": ["checks/probe.mjs", "src/button.mjs", "src/settings.mjs", "fixtures/delegation.mjs", "fixtures/composition.mjs", "fixtures/copy.mjs", "fixtures/decoy.mjs"],
  "witness": ["checks/probe.mjs"],
  "behavior": {"command": "node", "args": ["checks/probe.mjs", "behavior"]},
  "conformance": {"command": "node", "args": ["checks/probe.mjs", "ownership"]},
  "cases": [
    {"id": "delegation", "role": "delegation", "overlays": [{"target": "src/settings.mjs", "source": "fixtures/delegation.mjs"}]},
    {"id": "wrapper", "role": "composition", "overlays": [{"target": "src/settings.mjs", "source": "fixtures/composition.mjs"}]},
    {"id": "copy", "role": "independent-copy", "overlays": [{"target": "src/settings.mjs", "source": "fixtures/copy.mjs"}]},
    {"id": "unused-import", "role": "dead-owner-decoy", "overlays": [{"target": "src/settings.mjs", "source": "fixtures/decoy.mjs"}]}
  ]
}
```

`qualificationVersion: 2` is the serialized format identity, not a separate product release. Definitions reject unknown fields. Required strings are nonempty. `cwd` defaults to `.` and resolves within the supplied root. Each command has an executable `command` and string-array `args`. Register 1–500 unique input paths and 1–100 witness paths; witnesses must be inputs. There must be 4–16 uniquely identified cases, including each required role above. Additional supported representations use `valid-alternative`. Use `policy-override` for a consumer that invokes the shared owner but replaces part of its owned result, such as a local component skin. It is an additional negative case, not a substitute for the required copy and decoy cases.

Each case has 0–20 overlays. An empty overlay exercises the unchanged source. Every source and target must already exist as a root-relative regular file and be registered in `inputs`. An overlay replaces target bytes; imports inside the fixture must resolve from the target's directory. Targets cannot alias another target in that case, any fixture source, or a witness file, including through symlinks/hard links. All cases are preflighted before writing any target.

The runner restores overlaid source in `finally`, including after command failure or timeout. Registered input changes, unavailable commands and timeouts produce `unresolved` (exit 2). Every case's behavior must exit 0. Conformance must exit 0 for delegation, composition and valid alternatives, and exactly 1 for copies, decoys and policy overrides. An exit 2 is unresolved coverage, not a successful negative case. Mismatched observed outcomes produce `unqualified` (exit 1); all matches with stable evidence produce `qualified` (exit 0). Timeout defaults to five minutes per command; library options accept the runtime runner's bounded timeout.

Each variant must pass the repository’s applicable native type/build checks and current behavior before testing ownership. A compiler error or broken fixture does not demonstrate that the ownership check rejects duplicated policy. For request policies, inspect every relevant outbound request: a matching but discarded owner request must not hide a later request produced by local policy. For result policies, observe the result the consumer actually uses.

## Bind qualification to live delivery

Register this definition in the workflow's `qualifications`, with the runtime contract IDs it covers. The workflow accepts both qualification formats. For format 2, the conformance executable, argument array and working directory must exactly match a non-behavior obligation of each covered runtime contract; an unrelated fixture checker leaves the workflow unresolved. Use the same declared command in both places. Once a runtime contract adopts format 2, every ownership/evolution command in that contract needs a matching production-variant qualification; an additional legacy matrix cannot cover an unrelated live checker.

Keep normative examples, providers, consumers, fixtures and checker sources in the runtime and change-binding inventories. The [strict workflow](workflows.md#verify-that-adoption-reaches-delivery) binds current review and execution together. [The packaged example](../examples/workflow/workflow.json) uses production variants and two-way bindings.

Format 1 remains available for existing command-based calibration. It cannot establish command identity between its per-case checks and the live obligation by itself; review that relationship explicitly or migrate to format 2. Neither format proves fixture semantics: independently verify that a copy still produces correct behavior, a decoy retains an unused owner reference, valid alternatives remain supported, and every claimed production consumer is exercised. A checker may not decide conformity from the case's label or filename. Strict workflows require both copy and decoy overlays for each declared consumer. For behavioral propagation, use [actual output observations](propagation.md) or equivalent native execution; a source-pattern checker can still be fooled by same-name local components, comments and discarded owner calls.
