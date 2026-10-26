# Verify two-way change bindings

This is the lower-level binding API reference. Unified contracts derive these bindings automatically; use [inspect, review and verify](contracts.md#inspect-review-verify) for the standard workflow.

A binding connects a reviewed contract/evidence revision to an identified provider or consumer implementation. Contract changes invalidate those bindings. Implementation changes invalidate their contract review. Compatible code may be reverified without source edits; unchanged requirements may be explicitly reaffirmed after a refactor. Current identities alone do not establish behavioral conformance or approve a review.

The CLI reads declared files without executing project code or writing acceptance records:

```sh
cod binding-state /path/to/app .cod/bindings.json
cod verify-bindings /path/to/app .cod/bindings.json .cod/reviews.json
```

`binding-state` reports current identities for inspection, never acceptance. `verify-bindings` exits 0 for current reviewed identities, 1 for stale/wrong/missing implementation bindings, and 2 for invalid definitions, unavailable files or other unresolved input. A missing review file is unresolved. Required delivery commands must reject both nonzero exits.

## Definition and separate review

```json
{
  "bindingVersion": 1,
  "id": "ui.action-button",
  "contractInputs": ["contracts/action-button.md", "tests/action-button.test.ts"],
  "implementations": [
    {"id": "button", "role": "provider", "inputs": ["src/button.ts"]},
    {"id": "settings", "role": "consumer", "inputs": ["src/settings.ts"]},
    {"id": "team", "role": "consumer", "inputs": ["src/team.ts"]}
  ]
}
```

Paths are explicit, root-relative regular files. Missing paths, outside-root paths and escaping symlinks are rejected. IDs and each input list must be unique; at least one provider and one consumer are required. Input lists have 1–200 paths; there may be 2–200 implementations. Unknown fields are rejected. Include policy dependencies and check sources that affect the claimed responsibility. Coverage is declared, not inferred.

Prefer the compact review format:

```json
{
  "reviewVersion": 2,
  "id": "ui.action-button",
  "definitionDigest": "<current definition fingerprint>",
  "contractDigest": "<current shared contract/check fingerprint>",
  "implementations": {
    "button": "<current provider fingerprint>",
    "settings": "<current consumer fingerprint>",
    "team": "<current consumer fingerprint>"
  },
  "rationale": "Reviewed the component refactor; requirements are unchanged and relevant checks passed."
}
```

Use actual 64-character SHA-256 values reported by `binding-state`, not these explanatory placeholders. There is one contract identity and explanation per responsibility, plus one digest per declared implementation. Changing an implementation requires updating its digest and the review explanation; unchanged consumers keep their code and digests. Contract changes require rechecking the declared implementations, without artificial source edits. Inventory moves invalidate `definitionDigest`.

Version 1 remains supported for existing records that keep a `bindings` object with separate contract/implementation digests and rationale per implementation. Both formats reject omitted or extra implementation IDs and preserve two-way invalidation. Avoid repeating the same explanation or shared digest just to satisfy a preferred file shape.

Review the requirements, consumer inventory, implementation and relevant executed checks before recording acceptance. Explain requirement changes or why the old contract remains applicable. Do not add an automatic receipt-refresh step to delivery: it would erase the review barrier. A hash is an input identity, not proof that an agent or person performed a meaningful review. Protect contract/check/review changes through the project's normal trusted delivery process.

## Strict workflow integration

The workflow accepts `changeBindings`, a list of `{definition, review}` paths, and `requireChangeBindings: true`. Strict workflows with no declared bindings remain unresolved. Stale declared bindings prevent calibration/execution and readiness. Strict coverage also requires all registered runtime/qualification definitions and input files to occur in the declared binding inputs. Their source files and review records are fingerprinted across execution, so commands cannot silently alter them during verification.

Legacy workflows default `requireChangeBindings` to false for format compatibility. They do not establish complete two-way enforcement just because they reach `ready-for-review`. Standalone native gates can satisfy the same obligation without this CLI; the [native example](../examples/native-stack/README.md) demonstrates that route.

Continue to execute independent behavior, architecture, qualified ownership/evolution and compatibility checks. A copied policy can have fresh bindings and still violate ownership. Review whether the declared inputs cover the claim; the tool cannot infer every consumer or determine the truth of a rationale.
