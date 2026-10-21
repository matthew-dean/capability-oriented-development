# Choose existing tools for COD

In the installed plugin or source distribution, prefer the [local configuration guide](../../../docs/existing-tools.md) and [local recipes](../../../docs/tool-recipes.md). If only the skill folder was copied, use the hosted links below; the complete plugin bundle includes the full offline guides.

COD does not require the COD CLI. Follow the adopting repository's capability contracts and verification commands first. Reuse installed tools before introducing dependencies.

Read the [qualifying stacks guide](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/existing-tools.md) for mappings and the [adoption recipes](https://github.com/matthew-dean/capability-oriented-development/blob/main/docs/tool-recipes.md) for procedures. These links currently require access to the private repository. The plugin/source checkout also includes those files under `docs/`.

| Application boundary | Existing tools | Additional COD work |
|---|---|---|
| JS/TS library | [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), native test runner | Owner/consumer contract; actual-entrypoint propagation probes; copy/decoy calibration |
| Java library/service | [ArchUnit](https://www.archunit.org/userguide/html/000_Index.html), native tests | Responsibility-specific ownership and evolution evidence beyond package boundaries |
| HTTP or message API | [Pact](https://docs.pact.io/getting_started/how_pact_works), [OpenAPI](https://spec.openapis.org/oas/v3.1.1.html), provider functional tests | Named policy authority, actual consumer paths, current version evidence and reconciliation |
| Protobuf boundary | [Buf](https://buf.build/docs/breaking/quickstart/), native integration tests | Suitable compatibility category, policy behavior and implementation authority |
| Cross-language components | [WIT](https://component-model.bytecodealliance.org/design/wit.html), native component tests | Behavioral invariants, platform-specific owners and substitution evidence |
| Discovery catalog | [Backstage](https://backstage.io/docs/features/software-catalog/descriptor-format/) | Link organizational ownership to implementation authority and executed checks |

Require persistent responsibility/requirements, authoritative bindings, consumers, supported variation, behavior/ownership/evolution evidence and a reconciliation procedure. Imports, catalog records and generated clients alone do not establish semantic ownership. Calibrate checks with legitimate alternatives and behavior-correct copies/decoys. Treat unsupported coverage as a gap.
