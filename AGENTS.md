# Repository contract

- This repository is personal, experimental, and MIT-licensed. Do not publish packages.
- Read README.md and docs/specification.md for current behavior; Current guidance has one release identity in package.json.
- Source owns actual exports and types. Manifests own intent and canonical responsibility. Tests own executable assertions. Trial records own observations.
- Never equate structural validation or lexical matching with semantic correctness, architectural quality, or COD effectiveness.
- Presentation enforcement checks only declared source obligations; preserve unresolved coverage and run independent behavior/visual checks. A corrected development case is not a held-out comparative win. Small fixtures cannot decide full application maintenance value.
- Before adding an operation, inspect source and identify common rules below the enclosing service/file. Share a fitting policy proportionately; keep operation-specific constraints separate. Use capability lookup when useful and record concrete mismatches when creating.
- Use docs/workflows.md and skills/cod-workflow/SKILL.md for workflow changes. Qualification must reject correct copies and dead-owner decoys; readiness still requires semantic review.
- After changes, run relevant behavior tests and update maintained semantic metadata where warranted. Reconcile when using an indexed baseline; tool reports do not prove policy reuse. Keep generated facts out of authored manifests.
- Use strict ESM TypeScript, maintained Node LTS, pinned pnpm through Corepack, Vitest, and Oxlint. Do not add Prettier or Tailwind.
- Preserve shared history; no force pushes or codex/ branches. Keep trials in isolated fresh directories.
- Before changing a Foundation-owned file, mark intentional project ownership in threadlabs.config.json. Do not edit generated locks by hand.
- Run pnpm verify:pr before delivery. Report actual commands, failures, scope, and remaining gaps.
- Public documentation must explain user contracts and tools without internal experiment metrics, acceptance cutoffs, private project names or development decision criteria.
- Freeze COD definitions within a benchmark batch. Version refinements; retain failures and rerun new hypotheses on a new batch.

- Keep research runs, study harnesses, transcripts, comparison datasets, reset patches and historical prototypes outside Git-tracked files and PR diffs. Use an external private research directory; ignore local output paths. Ordinary product regression tests, adversarial fixtures and maintained contracts belong in source control.
- Apply the contract authoring contract in docs/specification.md: establish the actual need, reuse native verification, and reject unnecessary checks or premature abstractions. Prefer existing native contracts/checks and one concise responsibility definition. Reuse input inventories; content fingerprints are change detectors, not proofs. Keep review records compact and do not copy the same rationale or shared digest for every consumer. An implementation edit should not rewrite unrelated consumers or generate research artifacts.
- A passing scoped COD check does not override other required delivery checks. Await the current CI results before declaring delivery verified. Treat unavailable observations as unresolved and review visual changes before accepting baselines.
