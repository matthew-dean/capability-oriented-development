# Adopt COD around your existing stack

Start with one responsibility whose consumers and required behavior you can identify. The JavaScript, C# and Vue examples are executable through the shared toolkit; the broader integrations below must be adapted and verified in the adopting application. Tool links below lead directly to their maintained instructions.

## Write the persistent contract first

Use an existing architecture/specification document or a capability-specific Markdown file. Replace the illustrative entries in this template with actual source and commands:

```markdown
# Pricing calculation
Responsibility: Produce an authoritative quote for a cart.
Requirements: Currency rounding, discount eligibility and failure behavior.
Authority: pricing service; quote handler and domain policy implementation.
Consumers: checkout submission; account preview; their production entrypoints.
Supported variation: Currency and customer tier through documented inputs.
Evidence:
- Provider functional tests for the pricing policy.
- Consumer interaction contracts and provider verification.
- Checkout integration probe showing dependence on the pricing result.
- Compatibility checks for the versions supported by these consumers.
Qualification: Legitimate adapters pass; correct local price copies and
unused-service decoys fail the relevant ownership probe.
Reconciliation: Update requirements, owner, consumers, contracts and checks
when the rule or interface changes; run project verification and review gaps.
```

Reference authoritative API/type definitions rather than copying them into the prose. Register commands, entrypoints and evidence revisions clearly. A natural-language claim without executable evidence must remain a review obligation, not appear as a passed check.

## JS/TS libraries — demonstrated

[Copy and run the example](../examples/native-stack/README.md). Its dependency-cruiser configuration requires Settings and Team to depend on the shared button and prevents the component/theme from depending on screens. Node tests run the actual app in Chromium, substitute the theme in an isolated copy and qualify the same rendered check against valid wrappers, correct local copies and unused-owner decoys.

To adapt it:

1. Replace the teaching policy with your actual shared responsibility and real consumer entrypoints.
2. Keep your native behavior tests, type checks and builds. Add relevant edge/failure scenarios.
3. Change the required/forbidden dependency rules to match supported architecture. If valid reuse goes through a wrapper, express that route; do not require a direct import merely because the example does.
4. Make the ownership probe observe the consumer's actual result. Dependency injection, a test double at the declared boundary or a restored source substitution may be suitable.
5. Calibrate with valid alternatives and behavior-correct copies, including unused imports/options. A probe should not reject unrelated consumer orchestration.
6. Add the resulting command to normal verification and CI. Update the contract and calibration when requirements change.

[Dependency-cruiser rule reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).

## Java and other local libraries

Use ArchUnit for Java dependency/layer rules alongside the project's native tests. Specify which module owns a domain responsibility and which consumer entrypoints must use it. A permitted package dependency alone is insufficient: test the executed relationship using an appropriate seam and calibrate copies/decoys.

Preserve valid wrappers and implementations of a supported interface. Recheck compatibility after moving a class, changing injection wiring or introducing another implementation. For another language, use its existing architecture mechanism where available and native tests for behavior/propagation; COD does not require translating the library into TypeScript. [ArchUnit guide](https://www.archunit.org/userguide/html/000_Index.html).

## HTTP and message services

Use OpenAPI to describe HTTP interfaces where adopted. Write Pact consumer tests that invoke the production client and test its interaction expectations. Verify the provider against those contracts, keep provider functional tests for policy behavior and use Broker version/deployment records where your deployment workflow adopts them.

Add a responsibility contract naming policy authority and covered consumer flows. For example, checkout must use the authoritative quote response rather than silently calculate its own price. An integration probe can substitute a distinct valid quote and observe the checkout result. Qualify the probe with supported adapters and a behavior-correct local calculation plus a discarded quote request.

Keep message payload contracts separate from delivery, ordering, retries and idempotency obligations. Verify those transport promises with appropriate integration tests. A Broker result about registered version pairs does not certify unregistered consumers or all business behavior. [Pact setup](https://docs.pact.io/getting_started/how_pact_works), [Broker deployment checks](https://docs.pact.io/pact_broker/can_i_deploy), [OpenAPI](https://spec.openapis.org/oas/v3.1.1.html).

## Protobuf and generated clients

Use Buf's native compatibility comparison against an immutable or otherwise identified supported baseline. Generated clients implement transport/type bindings; identify the authoritative domain policy separately. Run native tests through each covered client/consumer and the actual policy entrypoints.

A typical Buf v2 configuration fragment is:

```yaml
version: v2
modules:
  - path: proto
breaking:
  use:
    - FILE
```

`FILE` is the strict default category; choose a different category only after checking generated-client and serialization requirements. `WIRE` covers binary compatibility, not all JSON or generated-code constraints. Run your configured `buf breaking --against <identified-baseline>` alongside native tests. This is an illustrative integration fragment, not a command executed by this repository. [Buf quickstart](https://buf.build/docs/breaking/quickstart/), [category reference](https://buf.build/docs/breaking/rules/).

## Cross-language components and UI

For WebAssembly components, reference WIT interfaces/worlds and define additional behavioral requirements. Test each declared implementation and consumer path with the relevant toolchain. Compatible interface types do not establish equivalent behavior or authority. [WIT reference](https://component-model.bytecodealliance.org/design/wit.html).

For browser and native UI, maintain shared interaction requirements with platform-specific component owners and styling boundaries. An appearance request should inspect the existing owner before introducing a local skin. Native interaction, accessibility and visual checks establish the supported presentation contract; dependency rules alone do not. Calibrate valid variants and a component-using local override that violates the declared boundary. The toolkit's Vue adapter is one bounded option, not mandatory for COD; see [presentation checks](presentation-checks.md).

## Catalogs and change routing

Backstage can expose components, organizational owners, provided/consumed APIs and dependencies. Link each relevant entry to its persistent capability contract and CI evidence. Keep team ownership distinct from the module/service that implements the authoritative rule.

When a capability changes, use registered consumers and dependency information to identify affected checks. Review completeness against actual source and integration paths. Update the catalog relationships and contract with the implementation; never use a fresh catalog timestamp as a substitute for executed conformance. [Backstage descriptors](https://backstage.io/docs/features/software-catalog/descriptor-format/).

## Bind changes in both directions

The [native example](../examples/native-stack/README.md#reproduce-both-change-directions) supplies a contract-review record and stale-binding check. A changed contract invalidates affected owner/consumer bindings. A changed implementation requires contract review and current tests, including explicit reaffirmation for an internal refactor. Do not auto-refresh records in CI; fresh digests establish input identity, not semantic agreement. Keep approval for changing obligations separate from ordinary implementation verification.

## Make the gate part of delivery

Give the project one documented verification command that runs normal behavior/build checks plus adopted ownership, evolution and qualification checks. CI must fail when required checks fail or cannot execute. Some external tools use their own exit conventions; translate outcomes deliberately when integrating them with a COD runtime receipt. For example, dependency-cruiser's CLI counts error violations, so its exit 2 must not automatically be treated as an execution gap.

Ask repository administrators to require the resulting CI status through normal repository settings. Agents should report actual execution and unresolved review obligations. Installing a skill or plugin does not create branch protection or a trustworthy witness automatically.
