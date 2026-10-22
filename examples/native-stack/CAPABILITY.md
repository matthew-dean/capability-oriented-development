# Shared action button contract

Settings and Team select the shared button API. The button and theme own background, corner radius, padding, keyboard focus, disabled and loading behavior. Screens own labels, actions, layout and surrounding status messages. They must not clone the appearance or replace interaction rules locally.

Current tokens are blue `#3154d9`, radius `10px` and padding `10px 18px`. Loading and disabled buttons cannot activate. Loading exposes `aria-busy`; ordinary actions remain keyboard reachable. `scenarios.json` records exact observable examples for both screens and all three states.

A supported design change updates the shared component/theme and the executable contract together. Every declared screen must follow both the theme values and the component-owned rules that map them to appearance. Compatible internal refactors may reaffirm the same contract with a reason; changed source and requirements expire prior review identities.

Verification runs the real application in Chromium. It checks computed appearance, actual click effects, keyboard access and loading/disabled states. Qualification substitutes actual screen implementations: valid delegation and wrappers pass, while behavior-correct independent copies and unused-owner decoys fail a provider-only design change. Qualification also includes a copy that imports the real theme: a component-only radius refinement must still reach the screen. Sharing the lower-level tokens does not establish use of the Button rule. An import alone does not establish reuse.

The fixed native binding inventory covers both screens, the component, theme, app wiring and CSS. Registered HTML, observer, dependency rules, assertions and examples are contract evidence. New source requires inventory reconciliation. These checks cover this declared button boundary, not every design decision or accessibility property of an arbitrary application.

The standalone native delivery command runs both `checks/contract.test.mjs` and `checks/bindings.test.mjs` using Node’s test runner with concurrency one. Replacing that entrypoint requires deliberate reconciliation of its native configuration check; refreshing a review alone cannot remove either obligation. The package invocation is a covered input.
