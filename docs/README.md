# COD documentation

Capability-Oriented Development keeps shared responsibilities discoverable and enforceable as software changes. Begin with the walkthrough, then use the guides for the work you need to do.

| Your task | Start here |
|---|---|
| Try a versioned adopter package | [Preview setup and support](preview.md) |
| Follow a request through an executable contract | [Shared-button walkthrough](../examples/native-stack/README.md#walk-through-one-change) |
| Try the optional CLI and diagnose a violation | [Toolkit quickstart](quickstart.md#try-the-optional-toolkit) |
| Understand capabilities, platforms and the advance over SDD | [Architectural rationale](architecture.md) |
| Implement COD with existing tools | [Qualifying configurations](existing-tools.md) and [recipes](tool-recipes.md) |
| Install skills or the plugin | [Agent setup](agent-setup.md) |
| Guide an agent through adoption | [Agent adoption walkthrough](agent-demonstration.md) |
| Create or change contracts without unnecessary machinery | [Contract authoring contract](specification.md#contract-authoring-contract) |
| Determine whether an implementation qualifies as COD | [Specification](specification.md) |
| Adopt COD, guide an agent and integrate checks | [Workflow and adoption guide](workflows.md) |
| Adopt across repositories, service owners and vendor adapters | [Distributed adoption](distributed-adoption.md) |
| Inspect external owners, contract pins and missing check references | [System map reference](system-map.md) and [example](../examples/system/README.md) |
| Bind contract changes to provider/consumer review | [Two-way change bindings](change-bindings.md) |
| Verify the same checker against production variants | [Production-variant qualification](variant-qualification.md) |
| Observe actual consumer values under a provider change | [Propagation observations](propagation.md) |
| Author executable obligations | [Runtime contract reference](runtime-contracts.md) |
| Enforce a supported Vue presentation boundary | [Presentation check reference](presentation-checks.md) |
| Give an agent the development procedure | [Repository skill](../skills/cod-workflow/SKILL.md) |

The specification defines the method. The references define the toolkit's implemented coverage. There is one release identity, in [package.json](../package.json); machine-format version fields identify compatibility formats separately.

Read [verification scope](evidence.md) for runnable ownership/two-way checks and their limits.

- [Maintain source maps with SCIP](scip-mapping.md): native indexers, capability bindings, source freshness and change impact.
