# Capability-Oriented Development specification

Capability-Oriented Development (COD) maintains contracts for reusable responsibilities as software changes. An agent identifies the responsibility behind a request, uses or evolves its fitting owner, and verifies both the requested behavior and the relationships that future changes depend on.

This is the **single current COD specification**. Its release is the version in [package.json](../package.json), shared with the toolkit. Workflow and API references elaborate this specification; they have no independent release numbers.

## 1. What COD is

A capability is a coherent responsibility: an operation, rule, component behavior or presentation contract with an authoritative implementation and identifiable consumers. It can be smaller than a service or file. Permission decisions, relative-time wording and a button's supported appearance are examples; their surrounding report, dialog and layout retain their own constraints.

COD's central contract connects:

- The responsibility and its observable requirements.
- The authoritative owner and supported configuration or extension boundaries.
- The affected consumers and how they depend on that owner.
- Executable evidence for behavior, ownership and propagation of owner changes.
- The requirement to reconcile those relationships and their evidence after later changes.

Source defines actual behavior and types. Authored contracts define intent, ownership, supported variation and requirements. Contracts must distinguish required behavior from incidental implementation choices and qualify legitimate alternatives. A shared button contract, for example, does not own every screen’s heading, content or layout. A checker must not turn an unspecified page label into a component requirement. Executed checks establish their particular assertions. An index is derived navigation and structural evidence, not a second authored specification.

COD carries specifications into ongoing architectural contracts: each change must preserve the required behavior and the responsibility relationships on which later changes rely. The [architectural rationale](architecture.md) explains this successor model and its research foundations.

### What the contract consists of

A COD contract is a maintained definition of a responsibility backed by executable checks. Its representation can use existing source types, schemas, tests and concise ownership notes. An English instruction such as “use the shared button” alone is not an enforced contract. A manifest alone is not one either.

For the shared-button example:

| Part | Concrete artifact | What it does |
|---|---|---|
| Responsibility and allowed variation | `CAPABILITY.md` | Names the shared button, Settings and Team; assigns appearance and interaction rules to the button, labels and actions to screens |
| Executable requirements | `scenarios.json` and native assertions | Specify and check rendered values and interactions for both screens |
| Ownership check | Native propagation tests | Change the real theme and component separately, then observe both screens; behavior-correct copies must fail |
| Two-way change gate | Native binding checks and current review record | Block stale reviews after a contract or covered implementation edit; behavior checks still reject incompatibility after review |
| Delivery enforcement | Required native verification | Runs these checks alongside other required checks |

The prose explains the boundary; the executable requirements and checks enforce observable obligations; the change gate keeps review current. Review still decides whether the boundary fits and whether all relevant consumers are covered. The [walkthrough](../examples/native-stack/README.md#walk-through-one-change) follows one design request through these existing files. It introduces no new contract language or required toolkit.

### The contract binds changes in both directions

A declared responsibility has two change obligations:

1. **Contract to implementations and consumers.** A change to requirements, supported interfaces or required evidence invalidates the affected conformance bindings. Delivery stays blocked until the owner and affected consumers have been reconciled and verified against that contract revision.
2. **Implementation to contract.** A covered owner/component or consumer change invalidates its contract review. Reframe the contract when the responsibility changes; otherwise record why the implementation still satisfies the existing contract and rerun its obligations.

This requires current evidence and an explicit review against the changed inputs, not artificial edits to every consumer or gratuitous changes to requirements after an internal refactor. A compatible consumer may keep its source unchanged. Tests and source resolution establish conformance for their declared coverage; review resolves meaning, compatibility and completeness.

Use native compiler/API compatibility checks and consumer tests where possible. For relationships those tools cannot bind, a review record can tie the contract revision, implementation inputs and affected consumer evidence to content digests. Stale/missing bindings must block the adopted delivery command. Regenerating hashes alone does not establish semantic agreement or approve changing a contract. Protect check and contract changes through the repository's normal review process.

The [native example](../examples/native-stack/README.md#reproduce-both-change-directions) demonstrates a bounded two-way gate using existing tools. The portable CLI also provides [change-binding definitions and review records](change-bindings.md). Set `requireChangeBindings: true` and register `changeBindings` in a workflow to reject stale reviews and uncovered runtime/qualification inputs before executing obligations. The `reconcile` command still reports structural impact; it does not complete those reviews.

A complete adopted gate must check **semantic agreement as well as review freshness**: executable contract examples must drive provider and consumer tests. A contract-only behavior change must fail even with freshly generated review records; an implementation-only behavior change must fail against the unchanged examples. A compatible refactor may pass those semantic checks but still requires current review. Handwritten prose with no executable relationship to the affected behavior cannot supply this guarantee.

Qualification must exercise the **same conformance checker against the same production boundary** that delivery relies on, including supported variants, behavior-correct copies and dead-owner decoys. A fixture-label classifier or a different test that happens to reject the negative labels cannot qualify a production checker. Keep case identity and expected outcomes in the calibration harness, outside the checker decision. The [production-variant runner](variant-qualification.md) makes that command identity explicit and applies reviewed source substitutions itself. Fixture meaning and complete consumer coverage still require independent review. Behavioral propagation evidence must observe actual consumer results under the original and changed provider, rather than infer delegation from an import, call-shaped text or component name. [The observation tool](propagation.md) compares those values; production variants must challenge every declared consumer. Equivalent native checks remain valid.

## 2. What qualifies as COD

An implementation qualifies when it maintains the central contract above and uses it to decide, verify and reconcile changes. A catalog, import count, one-time feature specification or generic instruction to reuse code is insufficient on its own. A manifest for every private helper is not required.

Several representations are valid:

| Implementation | Persistent contract | Enforcement |
|---|---|---|
| Source and tests | Maintained responsibility notes alongside source, explicit owner/consumer relationships, supported variation and linked tests | Native tests, qualified owner/consumer probes and agent review |
| Existing SDD workflow with COD | Feature specs plus ongoing responsibility contracts and reconciled consumer/evidence records | SDD's normal verification supplemented by ownership/evolution checks |
| Indexed registry | Structured capability manifests, resolved source bindings and evidence links | Structural graph checks, qualified runtime checks and reconciliation |
| Specialized domain adapter | An explicit component, policy or presentation contract with declared coverage | A qualified domain-specific checker plus relevant behavior/integration tests |

The [existing-tool configurations](existing-tools.md) show how native tools can satisfy these requirements, and the [native demonstration](../examples/native-stack/README.md) executes one configuration without the COD CLI.

These representations can be combined. Tests themselves may express a durable contract if its responsibility, ownership, affected consumers and intended assertions are explicit and maintained. A new framework, MCP server, JSON catalog or particular helper API is not mandatory.

Correct reuse means the consumer actually depends on a fitting implementation of the common responsibility. Supported configuration, delegating wrappers, predicates, constants, options factories and composition can qualify. Independently reproducing a common rule does not become reuse because it occupies the correct package or retains a correct import. Consumer-specific transaction, transport, row-shape and product-positioning rules need not be forced into one abstraction.

For appearance changes, using a component is necessary evidence but not sufficient conformity. The consumer must respect its supported styling/configuration boundary and required behavior. A local skin can bypass that boundary even while rendering the shared component. Missing options should be addressed through a proportionate owner extension when appropriate, preserving existing defaults and relevant consumers.

### Define the boundary narrowly enough to enforce

Describe ownership at the level of a rule or property, rather than declaring that a component owns everything rendered beneath it. Put the following information in the existing responsibility contract; a separate metadata file is unnecessary:

| Responsibility | Shared owner | Consumer retains | Evidence |
|---|---|---|---|
| Interactive action appearance | Supported surfaces, focus treatment and disabled appearance | Label, action and page placement | Native component/visual tests; consumer observations under an owned appearance change |
| Relative-time wording | Wording and supported locale choices | Which timestamp to display, local input precision and surrounding content | Examples exercised through the real screens; wording-change propagation |
| Permission decision | Eligibility rule and supported context | Page composition and request orchestration | Provider/consumer cases; eligibility-change propagation |

A consumer can compose an owner with a local responsibility. It cannot silently replace an owned decision with a copy or override. When two consumers legitimately need different behavior, express the demonstrated difference through an existing option, a proportionate owner extension, or a distinct responsibility. Document why the original obligation does not apply to an exception and test both the exception and the consumers that still share the rule. A blanket exemption from all ownership checks is not a supported variation.

Discoverability is part of maintaining this boundary. Use the language people use in requests, concrete supported variations and invariant descriptions; link actual source, examples and tests. An agent must inspect those candidates before inventing a parallel owner. A failed lexical search does not establish that no fitting capability exists: inspect affected source and its dependencies as well. The toolkit searches IDs, intent, operation names, extensions and invariants, and uses resolved declaration paths as well as public source paths for proximity. It does not infer synonyms or decide semantic fit.

## 3. A typical COD workflow

1. Read the requested behavior and relevant source. Identify the actual common rules below the enclosing component, service or file. Discover candidate capabilities and inspect their source, contracts and examples for fit.
2. Choose supported configuration, reuse, composition, extension or justified creation. Record a concrete mismatch when no existing owner fits; keep the explanation proportionate to the change.
3. Identify affected consumers and a starting contract state. Capture an indexed baseline when supported and useful; a clean snapshot is not a behavior certificate.
4. Implement the request. Update the responsibility contract, bindings, consumers, invariants and acceptance tests when they change.
5. Check each changed requirement against its responsible boundary, actual production entrypoint and matching assertion. Extend or establish qualified coverage when the request changes a different responsibility; adding prose to an existing contract cannot make an unrelated check observe it. Run relevant native behavior/build/integration checks and qualified ownership/evolution obligations. Fix violations; retain missing or unsupported coverage honestly.
6. Reconcile the resulting source, contracts and evidence. Review fit, proportionality, consumer completeness, compatibility and whether tests express the latest requirements. Submit the change with actual execution results and remaining gaps.

For example, changing a button appearance starts with inspection of the shared component and its supported variants. A reusable variant may fit several screens even though their actions and layout differ. Rendered behavior checks cover appearance, loading, disabled and keyboard behavior. A provider-only theme change checks that every registered screen follows the shared design. A later design change updates that owner’s contract, the affected consumer evidence and assertions, rather than independently repairing page-local skins.

The [workflow guide](workflows.md) provides commands, definitions and a runnable example. The [quickstart](quickstart.md) demonstrates behavior and ownership checks, including a behavior-correct copy that fails conformance.

A code-review defect claim needs a declared input obligation or a reachable producer/call chain and counterexample. A response DTO does not establish the shape of the exception thrown by its HTTP client. Distinguish executed failures, source-proven disagreements and unverified risks before adding guards or abstractions. Requirements introduced in a maintained specification also need matching executable coverage; writing a broader promise does not verify it.

## 4. Adopting COD into an existing repository

Adopt one useful responsibility at a time. Inspect the repository's real architecture, existing specs, design system, owner guidance and checks. Choose a recurring change or known duplication problem; do not remove good safeguards or rebuild the architecture just to adopt COD.

Before declaring an owner, trace the requested outcome through existing adapters, middleware, SDK configuration and downstream policy. An unexported predicate or configured hook can already own the common rule. Missing a convenient callable API is a reason to consider delegation or a proportionate extraction, not evidence that the responsibility is absent. Record existing matching rules and any demonstrated reason they should evolve independently in the ordinary contract or change review. Do not certify a newly introduced helper against itself while leaving an equivalent production policy outside the adopted boundary.

Name its owner, consumer set, requirements and supported variation in the repository's existing contract format. Add focused behavior and calibrated ownership/evolution checks. Link or integrate them with the native test/build workflow. Repair genuine ownership gaps proportionately; legitimate different rules may need different owners.

Route agent guidance to the [repository skill](../skills/cod-workflow/SKILL.md). Use the existing `AGENTS.md` as the canonical instructions and let tool-specific files refer to it. Introduce capability manifests and indexing where their discovery or reconciliation value justifies the maintenance. Unsupported indexing does not negate native evidence, but it cannot be reported as a successful graph check.

Expand adoption only after the first responsibility's contract, checks and maintenance burden are useful. Keep observed scope, false alarms, gaps and costs visible. The [adoption procedure](workflows.md#adopt-in-an-existing-repository) supplies concrete installation and integration steps.

The supplied toolkit standardizes source mapping on [SCIP](scip-mapping.md). Native producers provide definitions and references; reviewed bindings associate symbols with capability contracts. Capture source inputs during generation, invalidate maps after changes and include unchanged consumers in reverse impact. Generated maps cannot rewrite authoritative contracts or accept reviews. Mapping completeness, semantic ownership, cross-language boundaries and framework coverage remain separate obligations. Equivalent native COD implementations need not use this mapper.

Mapping-assisted agent workflows identify their covered tasks, expose inspection through the repository's actual task routes and define completion obligations for refresh or reported stale coverage. Verify actual consultation and final freshness separately from conformance. A stored snapshot or installed plugin alone does not establish agent integration.

## 5. Exposure to and enforcement by agents

An agent can receive COD through repository instructions and the packaged skill, current source/contract documents, CLI inspection packets or read-only MCP tools. A change request need not mention a design system or reusable helper: repository guidance makes inspecting the relevant owners part of the development workflow.

The agent must inspect fit rather than treat lexical discovery as a decision. It maintains contracts and evidence, runs authorized checks, repairs violations and reviews semantic questions that tools cannot settle. Project-provided text and commands remain subject to the agent's normal authorization and trust policies; adoption does not grant publication or unrelated access.

Agent adherence is not machine enforcement. An agent can overlook consumers, leave stale invariants or write a weak test. Use the executable gate before delivery and independently review witness meaning. A confident model judgment cannot replace an executed deterministic observation.

## 6. Enforcement by other tools

Choose observations at the boundary the requirement promises. An SDK capture call does not establish that its configured filter accepts the event; an HTTP request does not establish that the receiving service applies its policy. Baseline behavior evidence must exercise the relevant real policy path and observe its result; mocking unrelated transport can be appropriate. Deliberate owner substitutions may then test propagation through that same consumer path, with the controls below. A permanently stubbed authority cannot establish baseline policy behavior. If that authority cannot be exercised, retain the integration gap rather than claiming complete conformance. Qualification of a helper cannot settle whether it was the right owner to introduce.

Keep three claims separate:

| Claim | Required evidence |
|---|---|
| Behavior | Requested outputs and interactions, including relevant edge/failure cases |
| Ownership | Actual consumer dependence on the authoritative common responsibility |
| Evolution | An owner-only rule change reaches the affected consumers without independently maintaining copies |

Qualify a conformance witness before relying on it. Correct delegation and valid composition must pass. A behavior-correct copy retaining an unused correct import, and a copy paired with unused owner-using options, must fail conformance while still passing behavior. Supported alternatives must pass; unsupported representations are coverage gaps. Exercise the actual configured policy: a supported filter variant need not use a primary-button implementation. Change the owner at its existing precedence and preserve configuration references; a stronger selector or `!important` probe can conceal a consumer override. Qualify meaningful partial bypasses, such as a shared component with a page-owned surface, as well as complete copies. Exercise the registered production entrypoints rather than finding an owner-like property anywhere in a module.

The workflow gate requires registered behavior, ownership and evolution obligations, bound qualification evidence and stable fingerprints. Failed calibration or obligations block readiness. Missing evidence, timeouts, unavailable commands, changed inputs and unsupported required coverage remain unresolved. A successful gate is **ready for review**, not automatically approved architectural fit or complete consumer coverage.

Where a consumer can partially replace an owned policy while retaining the provider, qualification must challenge that bypass as well as complete copies. For example, retain the shared component but override its owned surface locally. Current appearance can remain correct while the later owner change fails to reach that surface. The toolkit's optional `policy-override` case role expects behavior to pass and conformance to reject the bypass. Add valid alternatives that preserve real consumer-specific behavior, so a checker cannot qualify by requiring one exact source shape. The runner cannot infer which partial overrides or exceptions a boundary needs; review their coverage explicitly.

Bind executed evidence to the code actually built. A test command against an older compiled assembly cannot establish conformance of changed source. Preserve failures through command pipelines, clear old result files, and rebuild source-changing probes or establish that the running provider contains the changed policy. Confirm the actuator independently before classifying a consumer failure. Compiler startup or stale hot-reload state is unresolved observation, not a successful rejection.

Native test runners, type/build checks and CI can enforce these obligations. To make a gate compulsory, the adopting repository must include it in its existing check script and required CI checks. Verify that invocation through the normal delivery entrypoint: a covered unreviewed compatible edit must expire review there, and semantic disagreement must still fail after review refresh. A standalone optional script does not establish compulsory adoption. This toolkit does not automatically configure branch protection, block arbitrary file writes or control every agent.

When a compiled or running application may retain stale provider code, require an independent observation that the selected provider change reached execution. The toolkit's optional propagation `controlPath` binds that observation to a changing value in the same JSON result; a missing or unchanged control leaves evidence unresolved. A control that follows the provider cannot substitute for actual consumer observations. Qualify a consumer copy while retaining the control: the control must change and conformance must still reject the copied consumer.

## 7. Tools provided in this repository

| Tool | Implemented purpose | Boundary |
|---|---|---|
| `cod check`, `cod index` / `buildIndex` | Validate manifests, resolve TypeScript exports/types, check ownership/dependencies and fingerprint scoped inputs | Structural evidence, not behavior or semantic equivalence |
| `cod discover`, `cod plan` / `discover`, `planReuse` | Retrieve candidate capabilities, source, constraints and evidence | Lexical ranking; fit remains a review decision |
| `cod snapshot` / `captureSnapshot` | Capture a clean, valid starting index without overwriting it | Explicit local write; not a signed attestation |
| `cod reconcile` / `reconcile` | Compare graphs, changes, affected owners and recommended tests | Conservative impact; does not edit contracts or execute tests |
| `cod enforce` / `enforcePresentation` | Check declared Vue wrapper/provider and presentation ownership boundaries | Bounded source adapter; needs behavior/visual checks |
| `cod verify-contract` / `verifyRuntimeContract` | Execute trusted registered obligations with status, bounded logs and input fingerprints | Assertion meaning and complete coverage are not inferred |
| `cod qualify-witness` / `qualifyWitness` | Execute positive/negative calibration cases and reject an unqualified witness | Fixture semantics and production relevance require review |
| `cod workflow` / `verifyWorkflow` | Combine qualification, current obligations, fingerprints and optional graph reconciliation | Produces a review packet; does not automatically approve a design |
| `cod serve` / `createCodServer` | Expose inspection through stdio MCP | Six read-only tools; no arbitrary command execution |
| `skills/cod-workflow/SKILL.md` | Give agents the discovery, reuse, qualification and reconciliation workflow | Guidance requires adoption and actual adherence |

The MCP tools are `cod_check`, `cod_discover`, `cod_plan`, `cod_get`, `cod_reconcile` and `cod_enforce`. Every request scans the fixed root afresh. Snapshot capture and trusted execution remain CLI/library operations.

The [manifest schema](../schemas/capability.schema.json) and validators define supported machine formats. The [runtime reference](runtime-contracts.md), [presentation reference](presentation-checks.md) and [workflow guide](workflows.md) define arguments, fields, exits and coverage. JSON fields such as `schemaVersion: 1` identify compatibility formats, not separate COD product releases.

The indexed registry supports stable dotted capability IDs, unique operation bindings, lifecycle values and dependency checks. Source references resolve within their manifest directory. Stable capabilities link at least one example and test; those links establish existence only. Compiler resolution uses TypeScript sources; the separate presentation adapter handles a bounded Vue source pattern. Indexing skips symlinks and excludes generated/tool directories, and imported project source cannot escape the chosen root.

The index records exports, signatures, diagnostics, content hashes and Git state. Reconciliation conservatively invalidates capabilities on scoped TypeScript changes and propagates reverse dependencies. Equal signatures do not establish compatibility. TypeScript 7 builds the toolkit; the pinned TypeScript 6 API analyzes source. New language/framework features can therefore remain unsupported.

## 8. Relationship to SDD and intended improvements

SDD connects intended behavior, implementation and verification through specifications. COD emphasizes persistent ownership of reusable responsibilities and the relationships that must survive successive changes. It can extend an SDD workflow: feature specifications describe the requested change, while capability contracts preserve how shared rules, consumers and supported variation fit together over time.

COD aims to improve discovery of fitting owners, preserve design and policy consistency, avoid correct-but-independent copies, route later changes to their shared owners, and make selected ownership/evolution obligations checkable. It does not replace feature specifications or normal tests. SDD can also use deterministic checks and persistent contracts; these practices are compatible and are not exclusive to a product label.

The [architectural rationale](architecture.md#what-the-demonstration-establishes) explains why behavior alone does not establish shared ownership and shows how to test that distinction. It separates this demonstrated mechanism from claims about adoption outcomes and long-term maintenance.

## Implementation limits and evolution

The provided tools implement the bounded checks above. Complete semantic duplicate detection, automatic inference of every consumer, automatic validation of qualification fixture meaning, robust whole Vue/monorepo indexing and safe automatic semantic reconciliation remain gaps. An LLM may help review fit and uncovered relationships, but its opinion must identify evidence and uncertainty.

When a requirement, supported representation or consumer changes, update its contract and verification together. A check that cannot cover the new representation must report that gap. This specification defines COD requirements; the tool references describe implemented coverage.

## Cross-repository responsibility contracts

Capability authority is independent of repository location and deployment topology. Consumers reference the authoritative contract revision; a local adapter or generated client does not become a competing policy owner. Maintain actual consuming entrypoints and supported provider/consumer version pairs. Keep source-present current/candidate/retired implementations separate from observed deployment state and migration decisions.

Two-way obligations cross the boundary: provider contract changes invalidate affected conformance evidence, and consumer/client changes require current contract review and verification. Compatible consumers may retain source when current evidence supports the candidate contract. Breaking changes require a versioned migration or coordinated release with explicit rollback conditions. Required evidence cannot silently disappear when another service is unavailable.

A third-party provider's internal review process may be unobservable. State the owned adapter/protocol scope and unresolved upstream guarantees. A catalog, artifact digest or inventory inspector establishes declared relationships, not behavioral conformance or deployment approval. Follow [distributed adoption](distributed-adoption.md) and the [map reference](system-map.md).

## Contract authoring contract

Contract creation and maintenance are themselves COD work. An authoring agent must satisfy these obligations; a contract that justifies unnecessary implementation or verification machinery does not qualify merely because its checks pass.

- **Establish need.** Trace each obligation to the actual request, established required behavior or an approved design. An experiment may define a hypothetical requirement in an isolated example; it cannot turn that requirement into an adopter's product scope.
- **Add only missing information.** Reference authoritative types, schemas, interfaces and tests. Define the missing responsibility/consumer relationship without restating contracts already owned elsewhere. Keep one authoritative input inventory and a compact review record where native tools cannot bind it.
- **Reuse verification.** Map each obligation to the repository's existing compiler, tests, visual gate or boundary tools before adding a checker. Add only the missing observation or adapter. Visual acceptance should use an established visual gate; an ownership probe may supplement it without reimplementing color analysis or screenshot comparison.
- **Choose a proportionate implementation.** Prefer a fitting owner or supported configuration. Extend that owner when it owns the required policy. Share a stable responsibility across real consumers, while keeping differing consumer rules and simple local work local. An imagined future use does not justify a shared framework. Neither duplicated policy nor premature abstraction satisfies this obligation.
- **Review the necessary delta.** Reject generated contracts, checks and abstractions that add no needed coverage or responsibility. Compare with a simpler alternative that preserves the legitimate requirements and safeguards; remove unnecessary machinery rather than moving it into another helper. Passing tests, additional layers and fewer repeated lines do not establish architectural fit. Do not weaken requirements or native checks to reduce code.

These obligations apply to implementation, test infrastructure and contract-generation tooling. No particular manifest, new checklist file or numerical code/abstraction quota is required. Record only the decision the repository's normal review needs; compatible consumers can keep their source unchanged. Both contract and implementation edits still require current two-way evidence.

### Review reuse and restraint against concrete alternatives

An agent or reviewer resolves the following questions against the request and changed source. Include the relevant reasoning in the ordinary change review; do not generate a second report or treat filled-in answers as approval.

- **Fit:** Which existing owner was inspected, which exact requirement fits or does not fit, and does the consumer execute that owner? An import, matching name or model assertion does not settle this.
- **Necessary delta:** What is the simplest adequate alternative using current APIs and native checks? Identify the requirement it cannot meet before adding a new layer, checker or contract. Count the proposed verification and contract machinery as part of the change.
- **Abstraction:** Which demonstrated consumers share the rule, and which requirements intentionally differ? A one-off local responsibility can stay local. Repeated code with different change reasons need not share an owner; a wrapper that preserves orchestration can be valid composition.
- **Evolution:** Which later change should happen once at the owner, which consumers should follow, and which local differences must remain intact? Exercise those expectations through current consumers, rather than predicting maintainability from code appearance alone.
- **Evidence:** Which conclusions come from executed checks, which require judgment, and which remain unsupported? A failure in observation infrastructure is not a rejected bypass, and a passing conformance gate is not a minimality certificate.

These questions define heuristic review criteria, not a deterministic score. Tooling should enforce the mechanical parts of the selected boundary, while review explains architectural decisions with source evidence. A simpler alternative that preserves requirements and safeguards is a reason to remove machinery; an arbitrary line count is not.

Native schemas, command bindings, ownership boundaries and review-freshness checks can enforce their declared mechanical constraints. They do not prove that a requirement is necessary or an implementation is the smallest maintainable choice. The workflow therefore reports contract necessity and solution restraint as required reviews after executable checks pass; it must not claim that minimality has been mechanically certified. Agent or human review must resolve those questions against the actual request and source before accepting the change.

A scoped conformance result cannot override another required CI failure. Infrastructure or observer failures leave conformance unresolved; changed screenshots need review against the intended appearance before acceptance.

Ordinary contracts, regression tests and reusable counterexample fixtures belong in source control. Research runs, empirical result archives, transcripts, evaluator records, reset patches and historical prototypes do not. Store them privately outside tracked files and PR diffs. Runtime output belongs in ignored build/test paths or CI artifacts. Research storage is separate from the adopter's development workflow.
