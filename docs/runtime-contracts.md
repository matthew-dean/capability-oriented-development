# Runtime contract reference

A COD responsibility contract binds an owner, its consumers and executable obligations. Verification must test the responsibility actually exercised by consumers. An imported symbol or a catalog entry is insufficient evidence of reuse.

## Three separate claims

- **Behavior:** inputs produce the required observable outputs and interactions.
- **Ownership:** consumers delegate the common rule to a fitting canonical owner, retaining their distinct orchestration and constraints.
- **Evolution:** a change to that common rule reaches relevant consumers without independently maintaining copies.

A behavior-correct copy can satisfy the first claim while failing the other two. A shared helper can satisfy ownership while implementing the wrong behavior. Evaluate claims separately and require all applicable claims before accepting a responsibility as reconciled.

An owner-change probe modifies or substitutes the owner's behavior and observes consumer output. The probe must accept valid delegation and composition and reject an unused import plus an independent, behavior-correct clone. Its substitution must preserve irrelevant behavior: for example, changing every text node while testing button appearance would also change screen labels and manufacture a false alarm. Counterexample calibration precedes relying on the check.

## Implemented execution API

`cod verify-contract <root> <contract.json> --allow-execution` executes explicitly trusted local commands. The read-only MCP server does not execute these commands. The API accepts `runtimeContractVersion:1`, an ID, responsibility, relative input files, and uniquely identified obligations with `claim`, `kind` (`behavior`, `ownership`, `evolution`), executable, argument list and optional relative working directory.

Every working directory and registered input is resolved inside the chosen root before execution. Commands run without a shell, sequentially. The runner records actual exit status, timeout, elapsed time, bounded output and registered input hashes. A nonzero exit violates its obligation except registered unresolved exit codes (default `[2]`). Missing executables, timeouts or registered inputs that differ or disappear when execution ends leave the result unresolved. Working directories must be real directories; all are validated before the first command starts. Inputs are fingerprinted before and after execution; legitimate implementation changes happen before verification.

Execution authorization trusts project code. Path checks are not a process sandbox, and a passing command is not universal correctness. The receipt explicitly reports `claimSemantics: not-independently-validated` and `semanticReuse: not-established`: a declared kind does not certify that the command measures it. Test commands can be weak, deceptive or incomplete; independent assessment must validate their claims and coverage. Authors identify the relevant consumer set and keep bindings and obligations current. Automatic discovery of every semantic consumer remains a research problem.

## Responsibility resolution and evolution

Bindings may identify a public operation, a source component or a pure policy below an enclosing service. Do not require an entire service to be reused when only one rule is common. A justified new owner can be introduced where the current source contains a genuine gap or duplicate responsibilities; consumers retain their distinct row shapes, input checks and platform dependencies.

Transparent re-exports, supported configuration, composition and owner extensions may satisfy a contract. A checker tied to an obsolete binding must report a coverage gap or false alarm after a valid refactor, rather than redefine good code as a violation. Reconciliation includes updating bindings, affected consumers, behavior assertions and propagation obligations. It is not completed merely by regenerating an index.

## Agent acceptance protocol

Discover fitting responsibilities before adding a competing rule. Record a concrete mismatch when introducing or extending an owner. Maintain contracts as requirements change, run applicable behavior and propagation obligations, resolve violations, and preserve unresolved coverage for review. Costs include discovery, authoring, testing, false alarms and repairs. A successful gate does not replace existing project verification.

The [current specification](specification.md) defines the responsibility requirements. The [workflow guide](workflows.md) explains how to qualify witnesses and combine these obligations into a review packet.

## Start from the shipped example

The [runtime definition](../examples/workflow/runtime.json) registers behavior, ownership and evolution obligations against a live text-policy consumer. Its [qualification definition](../examples/workflow/qualification.json) supplies valid delegation/composition and behavior-correct copy/decoy cases. Follow the [quickstart](quickstart.md) to run both before authoring application-specific probes.

For `verify-contract`, the definition filename is resolved from the calling terminal's current directory; use an absolute filename when running outside that directory. Paths inside the definition remain relative to the supplied application root. By contrast, `workflow` and `qualify-witness` resolve their definition filenames relative to the supplied root.

## Runtime definition fields

Unknown fields are rejected at both levels; null is not accepted for the fields below.

| Field | Requirement |
|---|---|
| `runtimeContractVersion` | Required literal `1` |
| `id`, `responsibility` | Required nonempty strings |
| `inputs` | Required nonempty array of nonempty relative filenames; files must resolve inside the root |
| `obligations` | Required nonempty array; obligation IDs must be unique |
| Obligation `id`, `claim`, `command` | Required nonempty strings |
| Obligation `kind` | Required `behavior`, `ownership` or `evolution` |
| Obligation `args` | Required string array; an empty array is allowed |
| Obligation `cwd` | Optional string, default `.`; must resolve to a directory inside the root |
| Obligation `unresolvedExitCodes` | Optional array of integers 1–255, default `[2]`; an empty array is allowed |

The library execution option requires `allowExecution: true` exactly. Optional `timeoutMs` defaults to 300,000 and accepts integers from 1 through 3,600,000. Each output stream retains at most 65,536 characters. Execution receipts distinguish `verified`, `violated` and `unresolved`; CLI exits are 0, 1 and 2 respectively. These are tool-contract rules, not adoption success measures.
