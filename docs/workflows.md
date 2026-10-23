# Use COD for a development change

This guide applies the [current COD specification](specification.md). Use it alongside your normal feature specifications, development tools and project tests. Its checks establish declared obligations; ordinary code review still evaluates architectural fit and consumer coverage. A separate generated evidence packet is not required.

For an adoption using native tools, follow the [tool recipes](tool-recipes.md). For installation and requests in Codex, Claude Code or ChatGPT, see [agent setup](agent-setup.md). The CLI-specific steps below apply when this toolkit is the chosen enforcement stack.

## Adopt in an existing repository

1. Inspect existing source, specs, owners, design-system contracts and native checks. Choose one recurring responsibility or a reproduced reuse problem; preserve existing safeguards.
2. Identify its common rule, actual owner, affected consumers, supported variation and current requirements in the repository's existing contract format. Record genuine gaps rather than declaring every helper a capability.
3. Connect executable requirements to focused behavior and ownership/evolution checks against real consumers. Challenge the checks with legitimate reuse and behavior-correct bypasses. Keep existing native regression/build checks and review the counterexamples independently. Responsibility prose alone does not enforce this relationship.
4. Enable the repository skill as described below. Add registry manifests only when their lookup or change-routing value is useful; source-and-tests contracts can qualify without them.
5. Make behavior, ownership/evolution and two-way change-review checks run through the existing required verification command and CI. Use native enforcement where it fits. Only if adopting the COD toolkit, register its runtime, qualification and change-binding definitions and run its workflow gate. Configure required CI status checks through the repository's normal administration process; the toolkit does not configure protection automatically.
6. Review fit, current consumers/invariants/tests, false alarms and maintenance cost. Expand to another responsibility after this one is useful.

For a concrete native adoption, follow the [shared-button walkthrough](../examples/native-stack/README.md#walk-through-one-change). No COD-specific JSON definitions or executable are needed.

If you choose the toolkit, a project script can execute its responsibility gate after ordinary tests/build checks:

```json
{
  "scripts": {
    "check:cod": "cod workflow . .cod/workflow.json --allow-execution"
  }
}
```

The project must make its chosen COD executable available. Calling this script executes trusted local commands from the registered definitions; it is not a process sandbox. A required gate exits nonzero for violations and unresolved evidence. Do not silently bypass it to get a green CI result.

## Use the maintained source map

For mapping-assisted adoption, use [SCIP producers and capability bindings](scip-mapping.md). Refresh source-derived declarations/references through native indexers, inspect stale-source impact and reconcile affected contracts. Generated maps belong in an ignored cache; authored responsibility definitions remain authoritative. A map refresh cannot accept changed requirements or replace behavior and propagation checks.

Connect each adopted area to the [agent mapping workflow](scip-mapping.md#connect-the-agent-workflow) through the repository's actual task routes. Verify consultation and final freshness separately from implementation quality. Finish native checks and authored review changes before the final refresh; inspection can be part of the existing required verification command when freshness is an adopted obligation.

## Verify that adoption reaches delivery

A named check script or one successful manual run does not make a contract compulsory. Trace the normal delivery command to the actual behavior, ownership, propagation and change-review checks. Verify that CI invokes that command and that the intended status is required by the repository's merge policy.

Challenge the integration through that normal command: a covered, behavior-preserving source edit without a current contract review must fail the review obligation. Restore the source and confirm the command passes. Separately test contract-only and implementation-only behavioral disagreements even after review identities are refreshed. These establish different properties; a fresh digest cannot excuse either semantic mismatch. Use a disposable checkout and preserve unrelated required checks. Do not repeatedly run a full application suite in every calibration variant when a focused native check observes the same obligation.

The [native example](../examples/native-stack/README.md) runs binding assertions in its ordinary verification suite. Its package configuration is itself covered, and a focused test rejects removing either required suite even with fresh review identities. That deliberately supported sample command is a bounded integration contract, not a parser or proof of arbitrary CI configurations.

## When the owner is in another repository

Use [distributed adoption](distributed-adoption.md) to map actual owners, import pinned contracts, verify real hand-offs and connect provider/consumer delivery. The [map inspector](system-map.md) finds inventory gaps without fetching, executing or declaring conformance. Keep existing native verification; the toolkit does not orchestrate cross-repository releases.

## Enable agent guidance

Copy `skills/cod-workflow` into the target repository's `.agents/skills/cod-workflow`. Its `SKILL.md` is self-contained and can also be used by an agent supporting the same skill format. For agents that do not discover skills, route their repository instructions to that file. Keep the project's root `AGENTS.md` authoritative and have `CLAUDE.md` refer to it. Preserve existing conventions; avoid duplicating independently maintained versions of the COD instructions. This package does not modify global agent configuration or install itself into other repositories.

For example, add this routing instruction to the adopting repository's existing `AGENTS.md`:

```markdown
This repository uses COD for implementation changes. Read
.agents/skills/cod-workflow/SKILL.md and follow its responsibility discovery,
qualified conformance and reconciliation workflow alongside our native checks.
```

Build the COD checkout with `corepack pnpm install --frozen-lockfile` and `corepack pnpm build`. The command examples use the installed `cod` executable; without installation, substitute `node /absolute/path/to/COD/dist/cli.js`. Local package installation from a tarball is supported; publishing remains disabled. All definition paths for `workflow` and `qualify-witness` are relative to the supplied application root.

## Require two-way change bindings

Use [portable change bindings](change-bindings.md), the [native two-way gate](../examples/native-stack/README.md#reproduce-both-change-directions), or equivalent boundary-specific enforcement in the required delivery command. Contract changes expire affected provider/consumer reviews. Implementation changes require contract review, changed requirements or explicit reaffirmation, and current verification. The structural `reconcile` report routes impact; it does not complete these obligations.

For the portable workflow, set `requireChangeBindings: true` and register definitions and review records in `changeBindings`. Bind all runtime and qualification definitions and their inputs, plus actual provider/consumer source. The strict gate rejects stale/missing reviews and uncovered evidence before execution. Review the consumer inventory: the tool cannot discover an omitted consumer from a definition that never mentions it.

Use normative examples or native interface contracts as actual inputs to conformance tests. Qualify semantic disagreement in both directions, including **fresh review records with incompatible contract/implementation behavior**. Fresh hashes must not make these tests pass. Keep a compatible refactor case that passes after review without requiring an invented requirements change.

## Make and reconcile a change

1. Run `cod plan /path/to/app "the requested behavior"`; inspect candidate source, examples and constraints. Choose reuse, configuration, composition, extension or justified creation.
2. When indexing supports the app, capture a clean starting graph with `cod snapshot /path/to/app .cod/before.json`. The command refuses to overwrite a baseline. An unsupported index is a coverage gap; existing native verification still matters.
3. Implement the request and update the responsible contracts and consumers. Run native feature tests and relevant integration/build checks. Preserve distinct consumer orchestration.
4. Run `cod reconcile /path/to/app /path/to/app/.cod/before.json` when a baseline exists. Review requirement changes, affected consumers, signatures, invariants and acceptance tests; resolve or document every relevant mismatch.
5. Qualify ownership/evolution witnesses and run the workflow gate below. Inspect its review obligations before delivery.

Read-only MCP tools remain available: `cod_plan`, `cod_discover`, `cod_get`, `cod_check`, `cod_reconcile` and `cod_enforce`. Start the server with `cod serve /path/to/app`. Execution commands are CLI/library operations and are not exposed through that read-only server.

## Qualify a witness

A witness is an executable check that observes a responsibility relationship. Prefer [production-source variant qualification](variant-qualification.md) for new toolkit adoptions: format 2 applies source overlays itself and runs the same checker used by delivery. The command-based format below remains supported for existing integrations; explicitly review that its per-case checks are the actual live checker. A qualification definition has `qualificationVersion: 1`, `id`, `responsibility`, `inputs`, `witness`, and `cases`. `inputs` is a nonempty list of root-relative evidence files; `witness` identifies check source files and must be a subset of those inputs. Cases have unique IDs, a `role`, and separate `behavior` and `conformance` commands. Each command has an executable `command`, argument array `args`, and root-relative `cwd` (default `.`). Unknown fields are rejected.

Required roles are `delegation`, `composition`, `independent-copy` and `dead-owner-decoy`. `valid-alternative` allows additional supported abstractions and legitimate local differences. `policy-override` challenges a consumer that uses the provider but replaces part of its owned result. There must be 4–16 cases. Behavior must exit 0 for every case. Conformance must exit 0 for valid roles and exactly 1 for copies, decoys and policy overrides. Exit 2, missing commands, timeouts and evidence changes are unresolved, not expected rejections. Other unexpected exits fail qualification. Commands execute sequentially and without a shell; timeout defaults to five minutes per command. Library callers can set `timeoutMs` within the runtime runner's bounds.

```sh
cod qualify-witness /path/to/app .cod/qualification.json --allow-execution
```

For behavioral propagation, register `verify-propagation` with [actual JSON observations](propagation.md), or an equivalent native before/after execution check. A source-pattern checker alone cannot establish this property. Qualify every declared consumer with copies and decoys, and partial overrides where applicable. Establish changed provider execution independently when compiled or running code may be stale; the optional `controlPath` can make that observation part of the propagation result.

Prefer focused, representative consumer probes for calibration; register full native regression/build runs as current behavior obligations rather than repeating an entire suite in each calibration case.

The tool executes this matrix and fingerprints its inputs. It cannot determine that an author-labeled fixture really contains a behavior-correct copy or executes the real consumer. Review that evidence independently. All-0 checkers fail the negative cases; checkers fooled by dead owner references should fail the decoy case. A valid qualification applies only to its reviewed fixtures, witness revision and supported representations.

## Run the workflow gate

The workflow definition has `workflowVersion: 1`, `id`, a `decision` with `action` and `rationale`, a nonempty list of relative runtime `contracts`, and nonempty `qualifications` entries. Actions are `reuse`, `configure`, `compose`, `extend` or `create`. Each qualification entry supplies a relative `file` and the runtime contract IDs it covers. An optional relative `baseline` references a saved index. `requireChangeBindings` defaults to `false` for legacy definitions; full two-way enforcement requires `true`. `changeBindings` contains up to 20 relative `{definition, review}` pairs. Contract and qualification lists are bounded at 20 entries. Runtime IDs must be unique and qualification references must resolve.

```json
{
  "workflowVersion": 1,
  "id": "report-export-change",
  "decision": {"action": "reuse", "rationale": "The existing relative-time owner fits both screens"},
  "contracts": [".cod/runtime.json"],
  "qualifications": [{"file": ".cod/qualification.json", "contracts": ["report-export"]}],
  "baseline": ".cod/before.json",
  "requireChangeBindings": true,
  "changeBindings": [{"definition": ".cod/bindings.json", "review": ".cod/review.json"}]
}
```

Runtime contracts use the existing `runtimeContractVersion: 1` format with inputs and executable obligations. The workflow requires behavior, ownership and evolution obligations across the registered contracts. Every contract with ownership/evolution claims needs a bound qualification. Its registered inputs must include the qualification's witness files, preventing a recorded calibration revision from being disconnected from the live check's evidence. This path/hash binding is not proof that commands actually execute those files; review that relationship.

```sh
cod workflow /path/to/app .cod/workflow.json --allow-execution
```

The gate validates files, references and command directories before execution; runs the qualification matrices; and executes current obligations only if calibration succeeds. It fingerprints definition/evidence files across the whole run. Changes or disappeared inputs invalidate readiness, including changes made by an earlier command that would otherwise be missed by a later command's own before/after hashes. Temporary owner substitutions must restore the registered source before returning.

| Exit / state | Meaning | Next action |
|---|---|---|
| 0 / `ready-for-review` | Registered commands and declared calibration cases passed with stable evidence | Review fit, proportionality, case semantics, consumer completeness and reconciliation |
| 1 / `violated` | A runtime obligation failed or its witness failed calibration | Fix the cause and rerun affected verification |
| 2 / `unresolved` | Missing claim/binding, changed inputs, unsupported graph, unavailable executable or timeout | Resolve the gap or explicitly leave completion unresolved |
| 2 / `INVALID_INPUT` | Definition or path validation failed | Correct the definition before retrying |

`qualify-witness` instead returns `qualified`, `unqualified` or `unresolved` with the same 0/1/2 convention. These states refer to the declared matrix, not universal semantic truth. A decision rationale is authored review material, not an automatically approved abstraction. The workflow's optional structural reconciliation remains conservative and explicitly requires semantic review.

## Try the packaged example

The runnable example contains explicit normative examples, shared relative-time wording, one live consumer, four isolated calibration variants, and strict two-way bindings. `examples.json` drives the behavior checks; `bindings.json` and `review.json` bind that contract/evidence to the live implementations. Copy it before running, because the propagation probe temporarily changes and restores its owner:

```sh
cp -R /path/to/COD/examples/workflow /tmp/cod-workflow-demo
cod qualify-witness /tmp/cod-workflow-demo qualification.json --allow-execution
cod workflow /tmp/cod-workflow-demo workflow.json --allow-execution
```

The valid workflow should report `ready-for-review`. Replacing `live/consumer.mjs` with the independent-copy variant keeps behavior correct but makes its ownership/evolution checks fail. The example demonstrates command integration and rejection semantics; it does not measure application-scale adoption outcomes. See the [quickstart](quickstart.md) for a complete walkthrough.

Current limits include manual witness/fixture authoring, manual review of conformance meaning and current requirements, incomplete automatic consumer inference, and unsupported framework/index configurations. Do not silently bypass a required failed or unresolved check to obtain a green workflow.

## Keep ordinary changes small

Apply the [contract authoring contract](specification.md#contract-authoring-contract): establish the real need, reuse native checks and reject unnecessary machinery or premature abstractions. Use native contracts and checks where they already enforce the obligation. A typical edit changes the implementation, relevant tests and one concise responsibility review. It does not produce a research report, transcript archive or reset patch. Reuse authoritative input inventories and prefer compact review format 2 to repeated shared digests. Store transient execution output in ignored directories or CI artifacts; keep research outside Git and PRs.

`ready-for-review` describes the configured workflow, not the entire repository. Required CI failures still block delivery. An observer crash is unresolved evidence, and an intentional appearance change must be reconciled with reviewed visual baselines.
