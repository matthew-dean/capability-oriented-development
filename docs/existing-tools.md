# Implement COD with existing tools

A repository can implement COD without this toolkit. Qualification depends on maintained responsibility contracts and their enforcement, not a package name. Keep your existing specs, native tests, interface standards and architecture tools; connect their evidence to the capability they govern.

For a working example, [run the native stack](../examples/native-stack/README.md). For an existing application, choose a recipe below and [enable the agent skills](agent-setup.md).

## What a qualifying configuration maintains

| Requirement | What an adopter must be able to identify |
|---|---|
| Persistent responsibility | What the capability does and which observable requirements it owns |
| Implementation authority | The service, module, component or platform-specific implementation that owns each shared rule |
| Supported use | Consumer entrypoints, configuration, composition and extension boundaries |
| Behavior evidence | Executed checks for the current requirements and relevant failures |
| Ownership and evolution evidence | Checks that actual consumers depend on the designated rule and preserve applicable evolution promises |
| Qualified checks | Valid representations pass; behavior-correct copies and misleading unused owner references fail relevant conformance checks |
| Reconciliation | A change updates affected contracts, consumers, bindings and evidence, followed by execution and review |

A team name in a catalog identifies organizational responsibility. An implementation binding identifies where the rule is authoritative. Keep both when useful; one does not substitute for the other. A capability may have different authoritative implementations on different platforms, with shared requirements and platform-specific obligations.

Do not declare an entire repository “COD compliant” because one capability has checks. State the adopted responsibilities, covered consumers and unsupported boundaries. No external certification or ecosystem-wide compliance standard is implied by this project's definition.

## Choose a stack for the boundary

| Boundary | Existing foundation | Additional project obligations | Status here |
|---|---|---|---|
| JS/TS shared library | dependency-cruiser + Node or existing native tests | Responsibility contract, actual-consumer propagation probe, calibrated copies/decoys, reconciliation | [Runnable demonstration](../examples/native-stack/README.md) |
| Java modules/services | ArchUnit + native tests | Responsibility-specific behavior and ownership/evolution evidence | [Adoption recipe](tool-recipes.md#java-and-other-local-libraries); not executed here |
| HTTP/message services | OpenAPI where applicable + Pact + provider functional tests + deployment gates | Policy authority, covered consumer paths, relevant evolution probes and maintained version evidence | [Adoption recipe](tool-recipes.md#http-and-message-services); not executed here |
| Protobuf APIs | Protobuf + Buf + native consumer tests | Boundary-appropriate compatibility rules, policy behavior, authority and consumer inventory | [Adoption recipe](tool-recipes.md#protobuf-and-generated-clients); not executed here |
| WebAssembly components | WIT + native component tests | Behavioral invariants, supported substitutions, platform-specific evidence | [Adoption recipe](tool-recipes.md#cross-language-components-and-ui); not executed here |
| Service/component discovery | Backstage + any enforcement stack | Bind catalog entries to authoritative contracts and executed evidence | [Catalog integration](tool-recipes.md#catalogs-and-change-routing); not executed here |

These are qualifying configurations to implement and review, not certifications of those tools or arbitrary installations. Even the demonstrated stack qualifies only for its documented contract and fixtures.

## What existing tools actually establish

Pact connects consumer interaction tests with provider verification; its Broker tracks verification across versions and supports deployment decisions. Provider functional tests still establish the business rule and side effects. Preserve that distinction instead of putting every policy assertion into the Pact interaction contract. [Pact mechanics](https://docs.pact.io/getting_started/how_pact_works), [functional-test boundary](https://docs.pact.io/consumer/contract_tests_not_functional_tests), [deployment gate](https://docs.pact.io/pact_broker/can_i_deploy).

Buf compares Protobuf revisions using generated-code, wire and JSON compatibility categories. Choose coverage for the clients and representations actually used. It does not observe an application's policy implementation or all consumer paths. [Buf rules](https://buf.build/docs/breaking/rules/).

ArchUnit checks Java dependencies and architecture rules. Dependency-cruiser offers required and forbidden dependency rules for JS/TS. These provide structural evidence: an unused dependency can still satisfy an import rule. The native example deliberately tests that limitation. [ArchUnit](https://www.archunit.org/userguide/html/000_Index.html), [dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).

Backstage records organizational owners and provided/consumed APIs. COD can use those records for discovery while linking implementation authority and verification separately. [Catalog descriptors](https://backstage.io/docs/features/software-catalog/descriptor-format/).

## Guidance, enforcement and discovery have different jobs

Skills instruct agents to inspect existing owners, implement through supported boundaries and reconcile contracts. A plugin packages those instructions and their references. Neither makes the agent incapable of bypassing a rule.

Native checks and required CI statuses enforce the declared observations. Catalogs and optional MCP tools expose contracts and candidates. Review resolves fit, consumer completeness and whether a witness really measures its claim. All three roles can be supplied by existing infrastructure.

Use the [adoption recipe](tool-recipes.md) to connect them and the [agent setup guide](agent-setup.md) to deliver the instructions. The [specification](specification.md) remains the authoritative definition of COD.

## Keep both change directions enforceable

Require current provider/consumer evidence when the contract changes, and contract review when a covered implementation changes. The [native change gate](../examples/native-stack/README.md#reproduce-both-change-directions) binds exact inputs and fails on stale reviews. Native API compatibility and consumer tests can supply stronger boundary-specific evidence; record their revisions and unresolved changes through normal CI/review. See [verification scope](evidence.md) for the implemented checks and their limits.
