# Why capability contracts outlive individual changes

COD treats a shared responsibility as an enduring development contract. Its behavior, implementation ownership, permitted variation and consumer relationships remain part of the system after a feature is delivered. Subsequent work must reconcile those relationships, rather than rediscovering them from an isolated change request.

This is the proposed advance over specification-driven development: specifications guide implementation; capability contracts also govern how the resulting architecture evolves. It is a successor model that can be adopted within an existing SDD workflow.

## A capability is a responsibility, not a file

A settings screen may contain form state, layout, permissions and action buttons. A team screen has different content and actions but can share the same button appearance and interaction rules. COD names that common responsibility and gives it an owner and supported interface. It does not require one giant screen abstraction.

Parnas's modularity research makes decomposition criteria central to how a system can change. COD applies that concern when identifying responsibility boundaries; it does not claim that extracting more helpers necessarily improves an architecture. [Parnas, 1972](https://doi.org/10.1145/361598.361623).

A COD capability is an architectural ability with a maintained contract. It is not an object-capability security token or an automatic grant of execution privileges. Nor is a broad business capability sufficient without implementable ownership and verification relationships.

## Behavior and ownership answer different questions

Suppose Settings and Team show matching action buttons. One uses the shared component; the other recreates its styles locally. Both can look correct today. When the design tokens change, only the first follows the shared design automatically.

COD therefore asks three questions:

| Contract claim | Example observation |
|---|---|
| Behavior | The action renders with the supported appearance and disabled behavior |
| Ownership | The screen uses the supported shared button API |
| Evolution | Changing only the theme updates the button on every declared screen |

A propagation probe can temporarily substitute an observable owner result, invoke the real consumer and restore the owner. This checks an executed dependency. It must be calibrated against valid delegation, valid composition, correct independent copies and misleading unused owner references. Merely finding an import does not establish the relationship.

Behavioral substitutability also concerns invariants and history, rather than signatures alone. That is why COD preserves requirements and compatibility checks when an owner is extended or replaced. [Liskov and Wing, 1994](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf).

## Build on SDD without misrepresenting it

SDD can maintain domain specifications and use deterministic verification. OpenSpec, for example, describes current domain specifications and change deltas; these are not disposable prompts. [OpenSpec concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md).

COD makes responsibility conformance an explicit part of that maintained specification:

| Development concern | COD contract adds |
|---|---|
| What a change must accomplish | Which existing responsibilities fit the request |
| Implementation design | Authoritative owners, consumer bindings and supported variation |
| Acceptance verification | Separate behavior, ownership and evolution obligations |
| Later changes | Reconciliation of affected consumers, contracts and executable evidence |

An SDD implementation that already maintains these relationships may also qualify as COD. The advance is the contract it requires, not the label on the tool. Deterministic checks are possible in both approaches; COD specifically requires evidence for declared responsibility relationships where those relationships matter.

## Across languages and platforms

Keep the shared requirement separate from its platform implementation. A browser component and a native mobile component can implement the same interaction contract while owning different rendering and accessibility details. Shared responsibility does not require them to call the same function or have identical internals.

| Boundary | Appropriate contract and native evidence |
|---|---|
| TypeScript or Python library | Input/output requirements, owner bindings, native unit tests and consumer propagation probes |
| .NET or JVM service | Domain rules, public interface, integration tests and compatibility checks |
| HTTP service used by several languages | Interface schema, error/authentication semantics and consumer integration checks |
| Generated message APIs | Message schema, serialization scenarios and evolution compatibility checks |
| Browser and native UI | Interaction requirements plus platform-specific appearance, accessibility and component boundaries |

OpenAPI supplies a language-neutral HTTP interface description; COD can reference it rather than reproduce it. An interface description alone does not establish that every consumer uses the intended policy. [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html).

Protocol Buffers illustrates why evolution rules must respect the actual boundary: field identity and wire compatibility require specific handling, and JSON representations have different constraints. COD contracts should preserve those native rules, not replace them with a generic signature hash. [Protocol Buffers language guide](https://protobuf.dev/programming-guides/proto3/#updating).

WIT provides interface types and worlds for WebAssembly components across implementation languages. Such bindings can be part of a COD contract, with additional behavioral obligations where required. [WIT reference](https://component-model.bytecodealliance.org/design/wit.html).

These are architectural applications of the model, not a list of implemented source adapters. This toolkit resolves TypeScript source and checks a bounded Vue presentation pattern. Its command runner can execute a repository's native checks when their executables are available. Other language resolvers and complete cross-platform verification are not supplied.

## What the demonstration establishes

The [quickstart](quickstart.md) runs a shared-policy consumer and a behavior-correct independent copy. Their behavior check passes in both cases; the qualified propagation check rejects the copy. This demonstrates that a selected ownership obligation can be enforced independently of current behavior.

It does not prove every consumer is known, that every witness measures its authored claim, or that COD always reduces development effort. Those questions need evidence from the adopting application. The practical contract is to state the responsibility, run its declared observations, expose uncovered relationships and reconcile them as software changes.
