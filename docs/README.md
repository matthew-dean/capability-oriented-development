# COD documentation

## Start here

1. [Understand the idea](start-here.md): one shared rule, with checks that its callers follow it.
2. [Run your first contract](quickstart.md): inspect the files and see a deliberate mistake fail.
3. [Choose your stack](contract-profiles.md): JavaScript, C# or Vue examples.

## Use it in your project

| When you need to… | Read… |
|---|---|
| Adopt a contract or make a change | [Workflow](workflows.md) |
| Look up a field, command or failure state | [Contract reference](contracts.md) |
| Give an agent the workflow | [Agent setup](agent-setup.md) |
| Find declarations and callers in a larger project | [SCIP mapping](scip-mapping.md) |
| Share a responsibility across repositories | [Distributed adoption](distributed-adoption.md) |
| Reuse an existing verification tool | [Tool guide](existing-tools.md) and [recipes](tool-recipes.md) |
| Understand what passing checks establish | [Verification scope](evidence.md) |
| Build or use a local archive | [Distribution](preview.md) |

## Design and integration references

The [specification](specification.md) defines COD's obligations. The [architectural rationale](architecture.md) explains the design choices.

For custom integrations with the underlying toolkit APIs:

- [Runtime execution](runtime-contracts.md)
- [Production-source alternatives](variant-qualification.md)
- [Change bindings](change-bindings.md)
- [Propagation observations](propagation.md)
- [Vue presentation source checks](presentation-checks.md)
- [System inventory](system-map.md)

The unified contract uses these mechanisms through the standard commands; you do not need to configure them separately.
