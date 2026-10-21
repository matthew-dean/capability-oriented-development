---
name: cod-adopt
description: Adopt Capability-Oriented Development in an existing repository or implement a new capability from requirements when the user requests COD. Select existing tools, author persistent contracts and qualified checks, and give agents a verifiable workflow.
---

# Adopt COD using the repository's tools

Read the [tool selection guide](references/tool-stacks.md) and [COD specification](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/specification.md). In the plugin/source checkout, full guidance is also under `docs/`. Respect existing instructions and authorization; do not install global tools, publish or rearchitect unrelated features.

1. Inspect source, existing specifications, architecture rules, tests and installed tools. Identify one coherent responsibility behind the requirements and actual production consumers. Distinguish organizational ownership from implementation authority.
2. Choose a fitting owner or record why an owner must be introduced. Preserve supported configuration/composition and platform constraints. Prefer existing enforcement tools; use the tool guide to fill actual gaps.
3. Author a persistent contract in the repository's existing format: responsibility, observable requirements, owner bindings, consumer inventory, supported variation, evidence commands, limitations and reconciliation procedure. Reference native API/schema definitions rather than duplicating them.
4. Implement the requested behavior through that owner. Add native behavior tests against production entrypoints and ownership/evolution checks against declared consumers. Qualify the same production checker with valid delegation/composition and behavior-correct independent copies plus unused-owner decoys. Prefer the toolkit’s `qualify-variants` production overlays when available; do not qualify a different fixture-label classifier. For behavioral propagation, use `verify-propagation` or equivalent actual before/after consumer observations; the tool compares JSON values rather than accepting a checker’s pass label. Qualify every declared consumer, not just the provider. A dependency rule or source-pattern match alone is insufficient.
5. Register one project verification command that runs all applicable checks and fails on violations or missing required evidence. Integrate it into existing CI; document the status that repository administrators should require. Skill instructions alone do not enforce completion.
6. Route repository instructions to the workflow skill. Run the real verification command, inspect failed/uncovered checks and repair the implementation or contract. Review fixture semantics, fit, compatibility and consumer completeness; report executed evidence and remaining gaps.

For a requirement change, reconcile owner, consumers, scenarios and qualification fixtures together. Do not weaken checks to accept a duplicate or treat the contract as a one-time plan. No COD CLI, plugin, registry or specific schema is mandatory if the relationships above are maintained and enforced.

## Enforce both change directions

A contract change expires affected provider/consumer reviews. An implementation change requires changed requirements or explicit reaffirmation of the unchanged contract, followed by current verification. Use existing native enforcement where it fits; the portable toolkit's alternative is `changeBindings` with `requireChangeBindings: true` in the workflow. The [binding guide](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/change-bindings.md) defines its schema and failure states.

Make normative examples or native interface contracts actual inputs to provider/consumer tests. Test contract-only and implementation-only behavioral disagreements with fresh review identities; both must remain rejected. Keep a compatible refactor case that passes after review without artificial requirements changes. Maintain behavior-correct copy/decoy fixtures at every new requirement, and rerun qualification before relying on them.

A structural impact report or regenerated digest cannot replace semantic agreement, trustworthy fixtures or consumer inventory review. Wire the adopted gate into normal delivery and CI, then execute it. The runnable native and portable examples demonstrate these mechanisms; no particular plugin or JSON format is required.

## When a capability is owned elsewhere

Read [distributed adoption](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/distributed-adoption.md) when the current flow crosses repositories, services, packages or vendor adapters; in a source/plugin distribution it is also bundled under `docs/`. Map current authority, candidate implementations and observed deployment separately. An approved target or newer module is not evidence of a runtime cutover.

Reference the owner's immutable contract export instead of duplicating its specification. Bind local clients/consumers to that revision and their native checks. Inventory inspection (`inspect-system` when available) resolves supplied identities only: it never supplies passing conformance or authenticates a remote revision. Trace a request through the real client and qualify ignored-provider/local-copy bypasses. Preserve supported provider/consumer version pairs and both change directions in required delivery; native CI infrastructure owns cross-repository triggers and release gates.

Report executed, inspected, proposed and blocked evidence separately. Missing dependencies or inaccessible providers cannot count as either a product failure or a successful negative check. Respect access boundaries; guidance does not authorize modifying/publishing another repository. Vendor internals remain outside the owned adapter's conformance scope.
