# Use COD for a change

Start with [the plain-language guide](start-here.md). All new toolkit adoption uses the [same contract format](contracts.md) and [native profiles](contract-profiles.md).

## Establish intent before choosing an owner

Start with the outcome the user wants and the observable result that would satisfy it. Read relevant source, existing product decisions and specifications before asking questions. Existing behavior can resolve implementation questions; it cannot authorize an unrelated product decision.

Ask when an unresolved answer would materially change behavior, access, data handling, compatibility, scope or acceptance. Explain the consequence and offer concrete choices where useful. Do not ask questions already answered by the request or repository, require a fixed questionnaire, or seek approval for routine implementation choices. Honor explicit delegation: make the decision within that authority and record it as your choice, not as user approval. Continue independent investigation while waiting; leave work that depends on an unanswered consequential decision unimplemented.

Keep the smallest sufficient record in the request, existing issue or feature brief. Capture the intended outcome, observable acceptance and consequential decisions or remaining unknowns. Small changes may need only a sentence; a substantial feature may need scenarios. Keep user statements, existing constraints and agent assumptions distinct, and link to the source where it already lives. Do not create a new brief, checklist or approval file merely to use COD.

Once intent is clear, inspect capabilities and choose configuration, reuse, composition, extension or creation. Put the enduring responsibility and executable expected results in the existing contract; keep feature-specific orchestration and temporary discussion with the feature. With this toolkit, `decision.need` explains the actual need, `decision.considered` and `rationale` explain the choice, and `requirements` supplies the native check's expected values. A new feature may change several responsibilities; an existing contract's passing check cannot cover behavior it does not observe.

For example:

- **“This button should look like a link.”** Inspect its current action and the design system's variants. Preserve action semantics; do not ask whether to create a navigation feature merely because the appearance resembles a link.
- **“Let teammates share a report.”** Inspect existing sharing and permission rules. If they do not settle it, ask who can receive access and whether sharing means a file or a live link before implementing that behavior.
- **“Export the existing catalog as JSON to stdout; no upload or access changes.”** Inspect the current CLI first. If it already does this, use it; do not create a sharing abstraction or another specification.

### Enforce the agreed behavior with existing checks

Translate each changed acceptance condition into an assertion through its actual owner and consumer. Reuse native types, API schemas, component tests and delivery gates. Challenge a plausible wrong implementation and, where a shared rule is involved, a copy or ignored-owner result. Check both contract-only and implementation-only disagreement after refreshing review. Keep a valid implementation or composition passing, so the gate cannot succeed by rejecting everything.

The supplied Vue example expresses its agreed busy-state behavior in `requirements.states`. The existing browser checker observes `disabled`, `ariaBusy` and the activation result. Changing an expected value to contradict the runtime must fail even after a fresh review; removing agreed activation blocking must also fail. This needs no separate feature format or intent-checking service. See the [example](../examples/vue-design-system/README.md).

Review the result against the original request and recorded decisions as well as the contract. A checker can establish agreement with executable expected values; it cannot prove that an agent asked every important question, truthfully recorded an answer or encoded the right product requirement. More metadata alone does not close that semantic gap. Keep unanswered decisions and unobserved requirements explicit instead of calling them verified.

SDD tools may supply the feature description, clarification and planning stages. COD accepts those artifacts and carries the resulting obligations into maintained owners and consumers; it does not require copying them into a second specification system.

## Adopt in an existing repository

Choose one shared responsibility that is worth protecting. Identify its real owner and consumers. Reuse existing public types, component APIs and tests.

Write one `capability.json` with its responsibility, owner, consumers, rules, requirements and native checker. Use the JavaScript, C# or Vue profile to select the native invocation. Supply a legitimate wrapper, correct-looking copy and unused-import/discarded-result case for each consumer; supply an override case for Vue.

The checker has the same three modes in every profile: `behavior`, `ownership`, `changes`. Use real consumers and observable results. The toolkit owns source substitutions, review identities, command execution, input fingerprints and the required order. Do not build another orchestration layer around each capability.

## Follow the change

1. `cod inspect . capability.json`: read the returned source, requirements and check route.
2. Use the owner's supported variation or extend it where the shared responsibility belongs.
3. Update intentionally changed requirements and their native assertions. Keep legitimate local concerns local.
4. Keep copies and overrides behavior-correct at the new baseline; otherwise they no longer challenge the intended bypass.
5. Review the agreement and record it with `cod review . capability.json --reason "..."`.
6. `cod verify . capability.json --allow-execution`: fix violated or unresolved checks, then run the rest of normal verification.

The tool does not infer that your architectural choice is good. Inspect assertion meaning, source coverage and the need for the abstraction during ordinary code review.

## Verify that adoption reaches delivery

Put `cod verify` in the project's normal required verification command and CI. An optional manually run script is insufficient. Protect changes to both contract and checks through normal review.

Challenge that delivery path: a covered source edit without review must fail; a changed promise must fail against the unchanged implementation even after review is recorded; an implementation that breaks the promise must fail too. The included examples and toolkit regressions exercise these distinct obligations.

## Use the maintained source map

When needed, put SCIP producer configuration and reviewed owner symbols in the contract's `mapping` section. Ignore `.cod/`. Complete preparation and review changes, run `cod refresh-map . capability.json --allow-execution`, then inspect and verify. Configured maps are required to be current before and after verification.

Generated references help locate callers. They do not establish that a caller uses an owner's result. See [SCIP mapping](scip-mapping.md).

## Enable agent guidance

Route the repository's normal instructions to `skills/cod-workflow/SKILL.md` or an installed copy. Keep the root `AGENTS.md` canonical. The agent should inspect the contract before choosing an owner, explain changed requirements, and report actual check results.

MCP's `cod_inspect_contract` gives agents the same read-only view as the CLI. Review recording and verification remain explicit CLI/library operations. Adoption does not authorize publication or unrelated edits.

## Require two-way change bindings

Unified contracts always require current two-way review. There is no opt-out flag. The toolkit derives these bindings from the contract, owner, consumers, check inputs and alternative sources. Review goes in the adjacent `.review.json` file.

Current review identities cannot excuse a failing behavioral assertion. The required `changes` mode must challenge both directions of disagreement using the same native behavior assertions. See [the check protocol](contracts.md#one-native-checker-three-modes).

## When the owner is in another repository

Use [distributed adoption](distributed-adoption.md) to name the authoritative contract/version and test the actual hand-off. Keep deployment observations separate from source inventories. A remote provider's unavailable evidence is a gap, not a pass.

## Existing low-level integrations

The [runtime](runtime-contracts.md), [production-variant](variant-qualification.md), [propagation](propagation.md) and [change-binding](change-bindings.md) APIs remain available. They use the same underlying engine. Follow [migration](contracts.md#moving-from-the-older-formats) to replace separately maintained definitions with the unified file.

## Work across repositories

Use [connected catalogs](connected-catalogs.md) to retrieve current discovery metadata while preserving exact selected provider revisions. Read the same owners, growth rules and native checks across the graph; keep missing upstream coverage visible. A refreshed map guides verification and reuse; it does not replace either.
