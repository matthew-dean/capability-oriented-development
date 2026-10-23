---
name: cod-adopt
description: Adopt Capability-Oriented Development in an existing repository or implement a new capability from requirements when the user requests COD. Select existing tools, author persistent contracts and qualified checks, and give agents a verifiable workflow.
---

# Adopt COD using the repository's tools

Read the [tool selection guide](references/tool-stacks.md) and [COD specification](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/specification.md). In the plugin/source checkout, full guidance is also under `docs/`. Respect existing instructions and authorization; do not install global tools, publish or rearchitect unrelated features.

1. Inspect source, existing specifications, architecture rules, tests and installed tools. Identify one coherent responsibility behind the requirements and actual production consumers. Distinguish organizational ownership from implementation authority.
2. Trace the requested outcome through existing adapters, middleware, SDK configuration and downstream policy before choosing an owner. A private predicate or configured hook may already own the common rule despite lacking a reusable API. Prefer delegation or a proportionate extraction over a second policy. Record matching existing rules and any demonstrated reason they must evolve independently; do not infer absence from a missing helper. Preserve supported configuration/composition and platform constraints. Prefer existing enforcement tools; use the tool guide to fill actual gaps.
3. Connect a persistent contract to executable requirements and checks in the repository's existing format: responsibility, observable requirements, owner bindings, consumer inventory, supported variation, evidence commands, limitations and reconciliation procedure. Reference native API/schema definitions and tests rather than duplicating them. Prose explains responsibility and permitted variation; it cannot substitute for executable conformance.
4. Implement the requested behavior through that owner. Add native behavior tests against production entrypoints and ownership/evolution checks against declared consumers. Qualify the same production checker with valid delegation/composition and behavior-correct independent copies plus unused-owner decoys. Prefer the toolkit’s `qualify-variants` production overlays when available; do not qualify a different fixture-label classifier. For behavioral propagation, use `verify-propagation` or equivalent actual before/after consumer observations; the tool compares JSON values rather than accepting a checker’s pass label. Qualify every declared consumer, not just the provider. A dependency rule or source-pattern match alone is insufficient.
5. Register one project verification command that runs all applicable checks and fails on violations or missing required evidence. Integrate it into existing CI; document the status that repository administrators should require. Skill instructions alone do not enforce completion.
6. Route repository instructions to the workflow skill. Run the real verification command, inspect failed/uncovered checks and repair the implementation or contract. Review fixture semantics, fit, compatibility and consumer completeness; report executed evidence and remaining gaps.

For a requirement change, reconcile owner, consumers, scenarios and qualification fixtures together. Do not weaken checks to accept a duplicate or treat the contract as a one-time plan. No COD CLI, plugin, registry or specific schema is mandatory if the relationships above are maintained and enforced.

## Keep the first adoption concrete

Follow one request through one real owner and its consumers. For a button appearance change: locate the existing component; express the new appearance in its native executable requirements; implement through its supported boundary; verify behavior and that a shared change reaches each screen; confirm a local copy/override fails the same delivery check. Enforce review after contract or implementation changes without forcing compatible consumers to change source.

Use existing native tests and review enforcement when sufficient. Add only missing observations or change detection. Do not require a COD registry, a new manifest for each helper, a separate report, or toolkit runtime/qualification/binding files for a native adoption. If the checks cannot enforce an obligation, report the gap instead of replacing it with an English instruction. See the bundled `examples/native-stack/README.md` for the worked example.

## Use SCIP mapping when configured

Read the bundled `docs/scip-mapping.md` or https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/scip-mapping.md. Route covered tasks to this workflow through the repository's actual instructions. Inspect the current map before choosing owners; use `inspect-scip --symbol` for definitions and read the returned source and contracts. Inspect stale-map impact on unchanged consumers before refreshing. Complete native checks and authored contract/review changes, then run configured `refresh-scip` and inspect the final state. Leave the map current or explicitly report failed refresh and stale/unresolved coverage; refresh never accepts a contract review.

Treat bindings as reviewed interpretations, not automatic contracts. Preserve unresolved external, generated-code and framework edges; do not infer HTTP or messaging links from names. Native conformance checks remain required. The adapter performs full producer refreshes, not a watch service or incremental compiler engine.

## Enforce both change directions

A contract change expires affected provider/consumer reviews. An implementation change requires changed requirements or explicit reaffirmation of the unchanged contract, followed by current verification. Use existing native enforcement where it fits; the portable toolkit's alternative is `changeBindings` with `requireChangeBindings: true` in the workflow. The [binding guide](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/change-bindings.md) defines its schema and failure states.

Make normative examples or native interface contracts actual inputs to provider/consumer tests. Test contract-only and implementation-only behavioral disagreements with fresh review identities; both must remain rejected. Keep a compatible refactor case that passes after review without artificial requirements changes. Maintain behavior-correct copy/decoy fixtures at every new requirement, and rerun qualification before relying on them.

A structural impact report or regenerated digest cannot replace semantic agreement, trustworthy fixtures or consumer inventory review. Wire the adopted gate into normal delivery and CI, then execute it. The runnable native and portable examples demonstrate these mechanisms; no particular plugin or JSON format is required.

## When a capability is owned elsewhere

Read [distributed adoption](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/distributed-adoption.md) when the current flow crosses repositories, services, packages or vendor adapters; in a source/plugin distribution it is also bundled under `docs/`. Map current authority, candidate implementations and observed deployment separately. An approved target or newer module is not evidence of a runtime cutover.

Reference the owner's immutable contract export instead of duplicating its specification. Bind local clients/consumers to that revision and their native checks. Inventory inspection (`inspect-system` when available) resolves supplied identities only: it never supplies passing conformance or authenticates a remote revision. Trace a request through the real client and qualify ignored-provider/local-copy bypasses. Preserve supported provider/consumer version pairs and both change directions in required delivery; native CI infrastructure owns cross-repository triggers and release gates.

Report executed, inspected, proposed and blocked evidence separately. Missing dependencies or inaccessible providers cannot count as either a product failure or a successful negative check. Respect access boundaries; guidance does not authorize modifying/publishing another repository. Vendor internals remain outside the owned adapter's conformance scope.

## Check actual adoption and review evidence

Observe the promised outcome through the relevant real policy path. A mocked SDK call can verify invocation while hiding its configured filter; it cannot qualify that policy relationship. Baseline behavior must use the real authority and observe the result after policy application; unrelated transport may be mocked. Deliberate owner substitutions may then test propagation through the same consumer path. Include existing matching authorities in inventory review before accepting a new helper's self-consistent tests. Inaccessible downstream policy remains an integration gap, not complete conformance.

Verify the normal required delivery entrypoint, not only a newly named optional script: a covered unreviewed compatible edit must fail review there; restoration must pass. Semantic contract/implementation disagreements must fail even after review refresh. Confirm the CI invocation and required status separately. Keep the existing native runner; do not add a wrapper when the ordinary suite already enforces these checks.

Trace a claimed defect to the declared input domain or an actual producer and consumer boundary. Separate observed failures, source-proven counterexamples and speculative risks. Inspect native exception/transport behavior before inferring it from response payload types. Do not add speculative guards or abstractions to satisfy an unsupported reviewer inference. Update probe bindings after valid owner moves without changing the consumer criteria or mutating an independent copy.
