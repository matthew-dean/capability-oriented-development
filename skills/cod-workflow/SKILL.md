---
name: cod-workflow
description: Implement and reconcile changes using persistent capability ownership contracts when a repository adopts COD or the user requests a COD workflow. Use existing discovery, qualified conformance witnesses and native checks to preserve appropriate reuse.
---

# COD workflow

Deliver the requested behavior through fitting shared responsibilities and keep their executable contracts current. COD may accompany spec-driven development. Respect the task scope, repository conventions and existing authorization; adopting this skill does not authorize publication or unrelated edits.

## Choose the enforcement stack

Read [tool stacks](references/tool-stacks.md) when adopting COD or selecting enforcement tools. Existing native tools can satisfy COD; do not introduce the COD CLI or its JSON formats just to obtain the label. Use the repository's documented verification command and maintained contract format. The CLI procedures below apply only when that toolkit is installed and adopted.

## Find the responsibility

Read the request and affected source. Identify coherent rules below whole services or components as well as public operations. Use the repository's catalog, source search and contracts to retrieve candidates. When adopted, use `cod plan <root> <intent>` or the read-only `cod_plan` MCP tool; inspect actual source, contracts and examples to establish fit. A lexical match, import or catalog entry is not proof. If indexing does not support the repository's framework/configuration, inspect source directly and retain that structural coverage gap.

Prefer supported configuration, reuse, composition or a proportionate owner extension. Create a responsibility when no existing owner fits; record the concrete mismatch. Keep consumer-specific orchestration and constraints separate. Shared predicates, constants, wrappers and options can be valid; do not force one helper name or interface. For appearance requests, inspect supported component styles and tokens even when the user does not mention a design system.

Search in the request's language as well as implementation names. Inspect invariant matches and resolved declarations behind public exports. Name the particular rule or property the owner controls, and what the consumer retains; a component boundary does not give it ownership of every page decision. If lookup returns nothing, inspect affected source and dependencies before treating creation as necessary.

Trace the requested outcome through adapters, middleware, SDK configuration and downstream policy. A private predicate or configured hook may already own the common rule without exposing a reusable API. Prefer delegation or a proportionate extraction over copying that policy into a new helper. Record matching existing rules and any demonstrated reason they should evolve independently in the ordinary contract or review; a new helper's self-consistent tests cannot establish that it was needed.

## Use SCIP mapping when configured

Read the bundled `docs/scip-mapping.md` or https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/scip-mapping.md. Route covered tasks to this workflow through the repository's actual instructions. Inspect the current map before choosing owners; use `inspect-scip --symbol` for definitions and read the returned source and contracts. Inspect stale-map impact on unchanged consumers before refreshing. Complete native checks and authored contract/review changes, then run configured `refresh-scip` and inspect the final state. Leave the map current or explicitly report failed refresh and stale/unresolved coverage; refresh never accepts a contract review.

Treat bindings as reviewed interpretations, not automatic contracts. Preserve unresolved external, generated-code and framework edges; do not infer HTTP or messaging links from names. Native conformance checks remain required. The adapter performs full producer refreshes, not a watch service or incremental compiler engine.

## Preserve the contract

Capture a clean starting index with `cod snapshot <root> <new-relative-path>` when supported. Do not commit unrelated changes just to obtain a snapshot. Implement the behavior and maintain source bindings, consumer inventory, invariants, examples, dependencies and tests through successive requirements. Reconcile a saved index with `cod reconcile <root> <baseline.json>`; inspect the affected owners and recommended tests. A regenerated index alone does not reconcile semantic requirements.

Before selecting checks, connect each changed requirement to its responsible owner, affected consumers, actual entrypoint and matching assertion. Reuse a check only when it observes that requirement. A new UI obligation does not acquire coverage by adding prose to a backend contract. Extend and requalify coverage where necessary; keep this review proportionate and use the existing project format.

## Restrain contract authoring

Apply the [contract authoring contract](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/specification.md#contract-authoring-contract) before generating or changing a contract; it is also bundled in `docs/specification.md`. Trace obligations to the actual request, established required behavior or an approved design. Keep hypothetical experiment requirements isolated from product changes.

Reference existing types, schemas and tests; add only missing responsibility relationships. Reuse native verification before adding a checker, and implement only the uncovered observation. Do not recreate a visual gate or test framework to satisfy a new contract. Prefer a fitting owner or supported option; extend an owner only for policy it owns. Share a stable responsibility for real consumers, rather than building a general layer for an imagined future use. Keep differing consumer rules and simple local work local.

Review the necessary delta against a simpler alternative that preserves the requirements and safeguards. Remove unnecessary contracts, checks and abstractions; hiding them in helpers is not simplification. Do not weaken checks to save code. Keep one authoritative input inventory and compact review record per responsibility; compatible changes should not rewrite unrelated consumers. Passing checks do not settle contract necessity or solution restraint, and no numerical code/abstraction quota proves either.

Use the specification's [concrete review questions](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/specification.md#review-reuse-and-restraint-against-concrete-alternatives) in the ordinary change review: identify inspected source, the smallest adequate alternative, demonstrated shared consumers, legitimate local differences, and the later change that should propagate. Keep one-off requirements local when they do not share the rule. Explain a justified exception at the affected obligation rather than disabling all checks. These are evidence-based heuristic decisions, not approvals produced by filling in a form.

Research runs, transcripts, evaluator output, comparison datasets and reset patches stay in a private directory outside Git. They are not ordinary review artifacts. Keep reusable product checks and counterexample fixtures in source; write transient execution output to ignored paths or CI artifacts.

## Establish trustworthy checks

Observe the boundary the requirement promises. An SDK capture call does not prove its configured filter accepted the event. Baseline behavior must exercise the relevant real authority and observe the result after policy application; unrelated transport may be mocked. Deliberate owner substitutions may then test propagation through that same consumer path. If the real baseline path cannot be exercised, report the integration gap rather than qualifying only the new helper and calling the responsibility covered.

Keep behavior, ownership and owner-change propagation separate. For behavioral propagation claims, prefer `cod verify-propagation` (bundled `docs/propagation.md`) or an equivalent native observation check: invoke actual production consumers, capture their values as JSON, substitute a compatible provider probe and capture values again. Do not replace those observations with source-pattern presence or a self-reported ownership exit code. Qualification must reject an observer that only calls the provider and never exercises the consumer.

 Use an existing qualified witness when available. Before relying on a new or changed witness, exercise actual production consumers and verify:

- Correct delegation and legitimate composition pass.
- A behavior-correct independent copy with an unused correct import fails conformance while passing behavior.
- A copy accompanied by unused owner-using options also fails conformance.
- A shared owner with a consumer-owned override of the claimed policy fails conformance while retaining current behavior.
- Other supported representations, including legitimate configured variants, pass; unsupported ones remain explicit gaps.

Qualification must run the same production checker used by delivery. A separate fixture-label classifier does not qualify it. With the toolkit, prefer `cod qualify-variants` and qualification format 2: the harness overlays reviewed variants onto actual source paths and runs one unchanged behavior/conformance command pair. The workflow checks that its conformance command matches every covered live obligation. Strict workflows also require copy and decoy overlays targeting each declared consumer, not just the provider. Read bundled `docs/variant-qualification.md` for setup and restoration constraints. Keep case labels outside checker decisions.

Use the additional `policy-override` role for partial bypasses and `valid-alternative` for legitimate supported differences. For propagation in compiled or live applications, include a provider readiness control when required. The optional `controlPath` identifies its changing value in the observed JSON: if the control does not establish changed execution, report unresolved evidence rather than a rejected consumer bypass. The control supplements actual consumer observations; a copied consumer must still fail with a functioning control.

Change the actual configured owner policy at its existing priority. Preserve custom-property and configuration references; do not add stronger selectors or `!important` to overpower a bypass. Confirm independently that the changed provider reached execution before classifying failures; use a known control consumer or another suitable readiness check. Rebuild source-changing probes or establish running-code freshness; startup/hot-reload failures remain unresolved.

Inspect the qualification fixture semantics and whether its commands really observe the claimed entrypoints. Scanning an owner-like property anywhere in a module is insufficient. Always-pass commands and kind labels do not establish reuse. Adapt registered witnesses when legitimate owner moves or refactors invalidate old bindings.

Run `cod qualify-witness <root> <relative-definition.json> --allow-execution` to execute a declared matrix. Commands are trusted project code, not sandboxed by COD. Within an authorized development task, normal local verification includes this explicit execution flag; follow existing permission policies without inventing another approval requirement.

## Close the change

Run applicable native behavior, type/build, integration and qualified conformance checks using the repository's documented command. Build changed sources before accepting compiled-test results; an old assembly run with a no-build option is not evidence for the new source. Preserve nonzero statuses through pipelines and clear prior result files. Reconcile the maintained contract and report actual results. If the COD toolkit is adopted, register those checks alongside current ownership/evolution obligations in a runtime contract; include the witness source and actual consumers as fingerprinted inputs. Bind qualification definitions to the runtime contract IDs in a workflow definition. Run `cod workflow <root> <relative-workflow.json> --allow-execution`.

Exit 0 and `ready-for-review` mean only the registered obligations and declared calibration matrix passed with stable inputs. All other required native/CI checks must also pass before delivery is verified. Inspect and reconcile intended visual changes before updating their baselines; never replace failing evidence with fresh hashes. Review architectural fit, proportionality, complete consumer coverage, qualification case meaning, and current requirements/tests before calling the change complete. Exit 1 reports a violated check or unqualified witness; fix the cause and rerun affected checks. Exit 2 reports missing evidence, unsupported coverage, timeouts or changed inputs; resolve it or report the gap. Never claim tests passed without executed receipts, or treat a stale test as disposable merely because it conflicts with new code.

## Enforce both change directions

A contract change invalidates affected owner/consumer reviews. A covered implementation change requires contract review: update changed requirements or explicitly reaffirm the unchanged contract with a reason. Compatible consumers need current evidence, not needless source edits. Use the project's native binding gate; when using the portable CLI, register `changeBindings` and set `requireChangeBindings: true`. Bind actual providers, consumers, runtime/qualification definitions and their inputs. See bundled `docs/change-bindings.md` for the maintained format. Structural reconciliation alone does not close reviews.

Make normative examples or native interface contracts drive real provider/consumer tests. Verify that a contract-only behavior change and an implementation-only behavior change fail **even with fresh review identities**. Accept a compatible refactor after explicit reaffirmation and current checks. A digest refresh cannot replace semantic agreement.

Rerun qualification after a requirement, consumer, fixture or witness changes: earlier passing fixtures may now encode the superseded behavior. Maintain behavior-correct copy/decoy cases at the new requirement, not just an old negative-case label. Run the adopted delivery command before finishing; check names and generated files are not evidence that it passed. Keep stale/missing or unqualified evidence blocking. Protect contract and check changes through normal repository review.

## When a capability is owned elsewhere

Read [distributed adoption](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/distributed-adoption.md) when the current flow crosses repositories, services, packages or vendor adapters; in a source/plugin distribution it is also bundled under `docs/`. Map current authority, candidate implementations and observed deployment separately. An approved target or newer module is not evidence of a runtime cutover.

Reference the owner's immutable contract export instead of duplicating its specification. Bind local clients/consumers to that revision and their native checks. Inventory inspection (`inspect-system` when available) resolves supplied identities only: it never supplies passing conformance or authenticates a remote revision. Trace a request through the real client and qualify ignored-provider/local-copy bypasses. Preserve supported provider/consumer version pairs and both change directions in required delivery; native CI infrastructure owns cross-repository triggers and release gates.

Report executed, inspected, proposed and blocked evidence separately. Missing dependencies or inaccessible providers cannot count as either a product failure or a successful negative check. Respect access boundaries; guidance does not authorize modifying/publishing another repository. Vendor internals remain outside the owned adapter's conformance scope.

## Check actual adoption and review evidence

Verify the normal required delivery entrypoint, not only a newly named optional script: a covered unreviewed compatible edit must fail review there; restoration must pass. Semantic contract/implementation disagreements must fail even after review refresh. Confirm the CI invocation and required status separately. Keep the existing native runner; do not add a wrapper when the ordinary suite already enforces these checks.

Trace a claimed defect to the declared input domain or an actual producer and consumer boundary. Separate observed failures, source-proven counterexamples and speculative risks. Inspect native exception/transport behavior before inferring it from response payload types. Do not add speculative guards or abstractions to satisfy an unsupported reviewer inference. Update probe bindings after valid owner moves without changing the consumer criteria or mutating an independent copy.
