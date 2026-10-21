# Adopt COD when the owner lives elsewhere

Keep each capability's contract with its authoritative owner. Consumers reference an identified revision and prove that their actual execution respects it. A repository boundary does not justify copying the policy or creating a competing specification.

Start with one real flow across repositories. Preserve existing specifications, native tests, architectural rules and migration decisions. Build an evidence map before introducing a registry or changing architecture. [Inspect a supplied map](system-map.md) with the toolkit, or maintain equivalent records in your existing catalog.

## 1. Map authority, implementation and runtime separately

For each responsibility, record its logical authority, accountable maintainer, contract source, current implementation, actual consuming entrypoints, and direct dependencies. Separate current, candidate and retired implementations. Separately record which version/environment is deployed and the evidence for that observation. Source code or a deployment file does not prove a live cutover.

Read existing decisions and source together. An architecture document may describe an approved target while a production client still calls a legacy endpoint. Do not silently assign authority to the newest class. Keep the current provider and the intended successor visible, with explicit cutover/rollback conditions. Conversely, old source remaining in a repository does not establish that it is still live.

Map shared libraries, same-repo modules, synchronous APIs, messages and third-party adapters using their actual boundaries. Include data ownership where it affects the responsibility. A database or message broker is a supporting dependency; do not turn every technology or helper into an independent business capability.

A consumer that adds validation or orchestration may own its own capability. An adapter translates transport and bounded semantics; it does not acquire authority over the upstream policy. Reference the provider's API/schema/behavior contract rather than copying it into the adapter notes.

## 2. Establish the existing baseline without a compliance score

For each boundary, record separately:

- source/contract discovery and accountable ownership;
- current behavior and failure/fallback semantics;
- evidence that actual consumers depend on the intended authority;
- evidence that supported provider changes reach those consumers;
- compatibility of the supported provider/consumer versions;
- both directions of contract review and semantic agreement;
- actual delivery enforcement and deployment evidence.

Classify observations as executed, source-inspected, documented intent, proposed, blocked or unknown. A script name is not an executed check. An unavailable dependency or build output is blocked evidence, not a product failure or a successful negative case. Good decomposition and extensive unit tests do not establish the untested ownership/evolution obligations. Do not collapse these into a misleading percentage.

A compatibility receipt must name the boundary it exercised:

| Boundary | Suitable evidence | What it does not establish |
|---|---|---|
| Wire format | Serialize the real provider type and deserialize with the selected consumer version | Source or binary API compatibility |
| Package source/API | Compile the actual consumer against the candidate package | Deployed protocol behavior |
| Binary ABI | Run a compatible prebuilt consumer against the candidate library | Internal provider policy correctness |
| Internal policy mapping | Exercise the real provider aggregation/mapping path into consumer results | Storage, authorization or network behavior omitted by fixtures |
| Deployed integration | Exercise the selected deployed versions through the actual transport | Every unexercised consumer or future version |

For example, renaming a language-level property while retaining its wire name can preserve JSON compatibility. If the consumer package remains fixed, that result says nothing about whether source code compiles against the renamed member. Keep native compatibility rules and supported version pairs explicit.

## 3. Export and consume an authoritative contract revision

The provider publishes or otherwise makes available an immutable contract artifact through the organization's existing authorized release channel. It may contain a native interface description, semantic examples, compatibility requirements, failure behavior and references to provider verification. A contract package need not contain implementation source.

The consumer records provider identity, source location, immutable revision, artifact digest, supported version policy and actual consumer/client entrypoints. Generated clients and local adapters are implementations, not alternative authorities. Preserve the contract's native versioning rules. Authenticate provenance through the existing release process; a digest alone only detects changed bytes.

For a local workflow, materialize the selected export within that workflow's root and bind it as contract input alongside the local client, consumer, check source and review records. Do not defeat root-containment checks with `../provider-repo` or escaping symlinks. A larger temporary verification workspace can contain selected repositories/artifacts as explicit children when authorized; use shared Git object stores/worktrees, shared dependency installs and prompt cleanup.

The [map inspector](system-map.md) checks these declared relationships without fetching or executing. It cannot establish that a supplied revision label is authentic or that its check references are implemented.

## 4. Add checks that observe the hand-off

Keep provider functional tests and consumer behavior tests. Add compatibility verification against the provider/consumer pairs you actually support. Then exercise the real production client and consumer against a distinct valid provider decision. Observe the final consumer result, persisted intent or rendered output. A successful request counter or an imported SDK is insufficient if the result is discarded.

Qualify the same conformance checker used in delivery against supported adapters/composition, a behavior-correct local policy copy, and a consumer that calls the owner but ignores its result. Preserve unrelated formatting, transport and orchestration behavior. Tests should reject the architectural bypass for the reason claimed, not because a mock protocol or fixture label differs.

For messages, separately verify delivery, retries, ordering and idempotency promises. A schema comparison cannot prove them. For caches and projections, name the authoritative producer, freshness/invalidation policy and whether stale or unavailable data may be served. Do not treat a read model as a new policy owner.

## 5. Enforce changes in both directions across releases

A provider contract change expires affected conformance evidence. Provider CI verifies registered supported consumers against the candidate revision. Consumer CI verifies changes to its production client/entrypoint against the selected provider contract. Changes to either side require current review and executable semantic agreement; refreshing a hash is insufficient.

Compatible changes can retain consumer source when current evidence establishes compatibility. Breaking changes need a versioned migration or coordinated release: identify supported old/new pairs, roll out consumers/provider in an order verified by that policy, record deployed versions, and retain a defined rollback window. “Every consumer must be edited” is not the rule; every affected supported consumer must have adequate current evidence.

Integrate the chosen commands into existing required CI checks. Bind verification receipts to relevant source, contract, tool and environment/version inputs. A downstream trigger alone is not a gate: the provider release must wait for the required results. Report absent, stale or unavailable results as unresolved. Do not use a link to yesterday's successful build as approval for today's revision.

The COD toolkit supplies local runtime/qualification/two-way primitives. It does **not** currently implement artifact publishing/retrieval, cross-repository CI dispatch, release matrices, deployment discovery or organizational approval. Use existing delivery infrastructure for those functions and verify its wiring explicitly.

## 6. Handle third-party authority honestly

You usually cannot enforce a vendor's internal implementation-to-contract review. Define the boundary you own: adapter behavior, selected protocol/version, timeout/retry/error mapping, provenance and observed provider behavior. Test the real consumer against qualified protocol/decision fixtures, with authorized live or recorded-provider verification where appropriate. Keep unobservable vendor guarantees outside your conformance claim.

Do not require uncontrolled live vendor traffic in every unit run or hide missing provider verification behind permanently green mocks. Define which checks are deterministic/offline, which need integration infrastructure and which remain operational monitoring. No required evidence may silently disappear when a service is unavailable.

## 7. Adopt in bounded stages

First reconcile the inventory and the selected current authority. Next lock one contract and prove the real hand-off. Then add semantic and stale-review failures in both directions and wire required delivery. Expand along direct dependencies only after that boundary is useful. Keep gaps, false alarms and verification cost visible.

Give agents access to the map, authoritative provider contracts, selected consumer locks and native verification commands. Tell them where upstream changes belong, how to obtain authorized exports, and what to do when access or ownership is unresolved. Guidance must not grant permissions to change another repository or publish a provider release.
