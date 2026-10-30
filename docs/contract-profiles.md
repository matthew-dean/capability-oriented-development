# The same contract in C#, JavaScript and Vue

All three profiles are implemented and have runnable examples. They use the same [contract schema](contracts.md), `inspect → review → verify` flow, review freshness checks, and source-substitution engine.

| What you are building | Profile | Native checker | Working example |
|---|---|---|---|
| JavaScript library | `javascript-library` | Node script | [Two screens and a shared button](../examples/native-stack/README.md) |
| C# library | `csharp-library` | .NET checker project, rebuilt on each invocation | [Pricing and Checkout](../examples/csharp-library/README.md) |
| Vue design system | `vue-design-system` | Node script using the project's real Vue/browser setup | [Button and Settings SFCs](../examples/vue-design-system/README.md) |

The contract always names the shared job, owner, callers, allowed changes, expected results and checker. The native checker always accepts `behavior`, `ownership` and `changes`. The profile selects the invocation; it does not invent the product's expected values.

## C# library

Identify the public type/member, supporting implementation and real consuming entrypoints. Reuse the existing compiler and test infrastructure. The sample prices an order through `Shop.Checkout.Total`, which calls `Shop.Pricing.Total`.

Its standalone checker is prepared once through the native SDK; it rebuilds and runs the actual consumer to observe the total. It changes the shared pricing formula and rebuilds again. A wrapper follows the new price; a copied formula or a discarded Pricing result does not. Compiler/process errors are unresolved, not a successful rejection.

Source and binary compatibility remain the native library's concerns; add the project's existing API checks where required. See [.NET compatibility guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes).

## JavaScript library

Identify public exports and real consumers. Reuse TypeScript declarations, JSDoc and native tests where present. The sample's `createButton` export returns a DOM element, so its native observer uses a browser. A non-UI library would observe returned values or other real effects instead.

Both screens must follow theme changes and component-rule changes. Copies, unused imports and local overrides still look right today but must fail ownership. The contract's shared requirements are written once and read by the native assertions.

## Vue design system

Identify the public component, its supported props/events/slots, owned appearance/interaction rules, and actual consuming views. Reuse existing Vue/component/browser tools. The sample compiles real `.vue` files and visits the rendered Settings view in Chromium.

It checks normal/busy behavior, then changes a shared token and a component rule separately. A wrapper passes. Copies, unused component imports and a consumer's inline style override fail. The Vue profile requires the override case because rendering the real component does not itself prove respect for its styling boundary.

Props/events/slots define a native API boundary; rendered observations check its effects. See [Vue component composition](https://vuejs.org/guide/components/slots.html).

## What stays the same

You fill in domain facts and write assertions using native tools. You do not design a new workflow, receipt format, source-overlay runner or command registry for each capability. `cod inspect` shows the exact files and native commands before anything executes.

The complete example gates run in this repository's normal verification. Passing examples demonstrate these declared boundaries, not universal consumer discovery or automatic test authoring for every possible library/framework feature.
