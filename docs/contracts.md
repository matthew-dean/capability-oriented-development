# The toolkit contract

The supported entry point is one `capability.json`. All three profiles use the [same schema](../schemas/contract.schema.json) and implementation in [src/contracts.ts](../src/contracts.ts).

The toolkit derives its execution, source substitutions and review bindings in memory. It does not write additional runtime/qualification/workflow/binding definition files. Native checks still implement domain-specific assertions; a schema cannot decide what a correct price or button looks like.

## Read the sections in order

| Field | Meaning and reader action |
|---|---|
| `contractVersion` | Format version: `1` |
| `id` | Stable name, beginning with a letter; letters, numbers, dots, underscores and hyphens are allowed |
| `profile` | `javascript-library`, `csharp-library`, or `vue-design-system`; selects native execution |
| `responsibility` | One sentence describing the shared job |
| `decision` | Needed outcome, existing candidates considered, chosen action and reason |
| `owner` | `entrypoint`, exported symbol/type name in `export`, and supporting `files` |
| `consumers` | Real caller entrypoints, symbols, supporting files, optional local examples and required alternatives |
| `rules` | Owned decisions, consumer decisions, allowed variation, extension guidance and forbidden bypasses |
| `requirements` | Expected domain values read by the native checks |
| `checks` | One native checker `entrypoint` and its supporting `files` |
| `mapping` | Optional SCIP producers and exact emitted owner symbols; see below |
| `dependencies` | Optional external `{id, repository, contract, version}` references; declarations only |

All paths are relative to the root supplied to the command, not to the contract's directory. Required files must exist inside that root. Unknown fields are rejected. `owner.files`, consumer `files`, consumer `examples`, `alternatives.additional` and `dependencies` default to empty values when omitted. Required fields cannot be null. Empty requirements are rejected.

`export` identifies the API for readers. The native compiler and checker must exercise that API; the toolkit does not claim arbitrary-language symbol resolution from this string.

## Explain why this piece belongs

`decision` is required. It keeps the reuse decision beside the code's promise:

```json
{
  "action": "reuse",
  "need": "Checkout needs the shared discounted total.",
  "considered": [
    {
      "candidate": "src/Pricing.cs",
      "finding": "Pricing.Total already owns this calculation."
    }
  ],
  "rationale": "Use the existing result rather than adding a second discount formula."
}
```

`action` is `reuse`, `configure`, `compose`, `extend` or `create`. The need and rationale must be nonempty; at least one inspected candidate or searched scope must be described. If no owner exists, name the actual scope searched and what was missing. Do not invent a candidate merely to satisfy the format.

Review this against the request and source: is the addition needed, consistent with the capability's rules, and free of duplicated responsibility within that scope? The toolkit requires the explanation, displays it, carries the chosen action into the workflow, and invalidates review when it changes. It cannot establish the truth of that explanation. Tests reject declared bypasses; ordinary review decides whether the design and contract are justified.

## What goes under a consumer?

A consumer names a real production entrypoint and the files that implement it. It also points to alternative source files that can replace that entrypoint during verification:

```json
{
  "id": "checkout",
  "entrypoint": "src/Checkout.cs",
  "export": "Shop.Checkout.Total",
  "files": ["app/App.csproj", "app/Program.cs"],
  "alternatives": {
    "wrapper": "cases/wrapper.cs.txt",
    "copy": "cases/copy.cs.txt",
    "unusedImport": "cases/unused-import.cs.txt"
  }
}
```

The original and wrapper must pass behavior and ownership. The copy and unused-import/discarded-result case must pass behavior and fail ownership. Vue requires an `override` case too; other profiles may supply one. `additional` accepts `{name, source, followsOwner}` cases for supported alternatives or other bypasses, such as a component copy that shares theme tokens.

An alternative can instead contain a compact transformation of that consumer's current source:

```json
{
  "wrapper": {
    "replace": [
      { "from": "return Pricing.Total(subtotal);", "to": "return SharedTotal(subtotal);" },
      { "from": "// helper", "to": "decimal SharedTotal(decimal value) => Pricing.Total(value);" }
    ]
  }
}
```

Each `from` must match exactly once, and replacements apply in order. Replacement text is literal. All transformations are prepared against original source before the first check or source mutation. A missing or ambiguous match is unresolved evidence; reconcile the case after a refactor. This keeps a small policy alternative small without storing a duplicate of the complete consumer file. Source-path alternatives remain available when a replacement file is clearer.

The toolkit replaces the actual consumer entrypoint, runs the same check commands, and restores exact source bytes in `finally`. Fixture labels never become arguments to the checker. The shared production-variant engine rejects aliases that could overwrite fixtures or checker inputs. Every consumer's cases run; the engine does not cap the case count or permit omitting consumers to fit a matrix.

Every declared consumer needs its own copy and unused-import case. Tests and source review must independently check the consumer inventory: deleting the only evidence that a consumer exists cannot prove that it is gone.

## One native checker, three modes

The profile chooses these invocations automatically:

| Profile | Invocation |
|---|---|
| JavaScript / Vue | `node <checks.entrypoint> <mode> <contract-path>` |
| C# | `dotnet run --project <checks.entrypoint> -- <mode> <contract-path>` |

The JavaScript/Vue entrypoint is a `.js`, `.mjs` or `.cjs` file. The C# entrypoint is a `.csproj`; normal builds remain enabled. The working directory is the supplied root. No shell is used.

| Mode | Native checker must do |
|---|---|
| `behavior` | Read requirements, exercise actual consumers and compare observable results |
| `ownership` | Establish current behavior, change a real owner rule temporarily, exercise the same consumers, assert propagation, and restore exact sources |
| `changes` | Deliberately change only the contract, then only the implementation; prove the behavior assertions reject both disagreements and restore inputs |

Return `0` for success, `1` for an assertion rejecting the implementation, and `2` for unavailable/unsupported observations or infrastructure errors. A missing executable, timeout, changed inputs or checker crash cannot count as a successfully rejected copy.

For compiled or served applications, the ownership check must establish that changed source actually ran. The C# example rebuilds a separate consumer process; the Vue example compiles actual SFCs for fresh browser visits. Do not infer propagation from source names or imports.

Keep check orchestration in the repository’s test/tooling area, with behavioral assertions in the existing native consumer suite. Wire it into the appropriate delivery lane. Run the normal coverage gates as well as contract verification; do not lower production thresholds or add production-source exclusions to accommodate a check runner. Measure the combined CI runtime against an ordinary successful run; give the additional checks an explicit lane or a measured execution budget while retaining the existing suite.

Keep `checks.files` complete: include checker helpers, build/project files, browser setup, dependency rules and the normal delivery configuration. The toolkit adds the contract, owners, consumers and alternative sources to the input inventory automatically. This avoids repeating the same inventory across several formats.

## Discover the repository's capability and file map

Keep related contracts under a directory such as `capabilities/`, with one
`capability.json` per responsibility. Subdirectories can follow the native
frontend/backend boundaries. They are organizational paths, not another registry.

```sh
cod catalog . capabilities
cod catalog . capabilities --json
cod catalog . capabilities --check-reviews
cod verify-catalog . capabilities --allow-execution
cod verify-catalog . capabilities/backend --allow-execution --json
```

The catalog is derived from the standard contracts in that directory. It shows
each contract, owner, real consumers, extension rules, native check commands,
review/map state and the complete input-file map. Adding or moving a contract
changes discovery directly; do not maintain a second authored list of the same
relationships. Duplicate IDs, malformed contracts, missing source files,
empty catalogs and symlink traversal fail rather than producing a partial map.

Plain `catalog` is read-only discovery. Its JSON has `catalogVersion: 1` and
`conformance: "not-evaluated"`; stale reviews/maps remain visible with their gaps.
`--check-reviews` exits `2` when any review is missing or stale. It does not run
indexers or require generated maps, so an existing frontend review gate can use
it without a .NET SDK. Invalid catalogs also exit `2`.

`verify-catalog` runs the existing contract verification serially for every
contract in the selected directory. Configured maps must be current. It exits
`0` only when every declared contract is ready for review, `1` for a violation,
and `2` for unresolved evidence. It does not record reviews or accept missing
contracts. Source-changing checks must not overlap in the same checkout.

### External references

`dependencies` names selected external contract references, for example:

```json
{
  "dependencies": [{
    "id": "identity.permissions",
    "repository": "https://example.test/identity",
    "contract": "workspace-permissions",
    "version": "1.2.0"
  }]
}
```

The derived catalog exposes these relationships for authorized readers and
crawlers. It does not fetch repositories, authenticate a version label or prove
remote conformance. A package version is not a Git revision or deployed version.
The native checks must exercise the selected boundary; follow
[distributed adoption](distributed-adoption.md) for provider/consumer version
pairs and release gates. Discovery of newer versions never silently changes
the contract version being verified.

## Inspect, review, verify

```sh
cod inspect . capability.json
cod inspect . capability.json --json
cod review . capability.json --reason "Reviewed the changed shared rule and affected callers"
cod verify . capability.json --allow-execution
cod verify . capability.json --allow-execution --json
```

Inspection shows the exact files, commands, expected alternative outcomes, review state and map state. MCP exposes the same read-only view as `cod_inspect_contract`; it never runs commands or accepts a review.

Review creates `capability.review.json` beside the contract. A differently named contract uses the same stem plus `.review.json`. The record contains one contract identity, implementation identities and the supplied explanation. It is bookkeeping, not proof of approval or a passing test. CI must not regenerate it automatically.

Verification uses the existing strict workflow engine:

1. Validate definitions, files and current two-way review. When mapping is configured, require a current map too.
2. Preflight all registered commands and source substitutions.
3. Run the original and every alternative through the same behavior and ownership commands.
4. If those challenges pass, run current behavior, ownership, evolution and change-disagreement obligations. Ownership and evolution intentionally use the same qualified command.
5. Check that all registered source/evidence inputs were restored. With mapping configured, check final map freshness too.

`0 / ready-for-review` means these declared checks passed. `1 / violated` means an assertion or challenge failed. `2 / unresolved` means missing/stale evidence or unavailable observation. Invalid input also exits `2` with a diagnostic. Read the diagnostic; the exit alone does not explain the cause.

Record review after reconciling the change; run verification afterward. Include `cod verify` in normal required checks. Protect edits to the contract and checker with ordinary review. All profiles execute trusted project code; they are not sandboxes. Do not overlap source-changing checks in one checkout.

## Optional SCIP mapping uses this same file

Add a `mapping` section with `producers`, `symbols` and optional `additionalInputs`. Producers use the existing `{output}` protocol described in [SCIP mapping](scip-mapping.md). Exact global symbols come from the compiler index; they are not guessed names. An empty symbol list permits an initial unbound index for discovery.

```sh
cod refresh-map . capability.json --allow-execution
cod inspect . capability.json --json
```

The generated map lives at `.cod/cache/<id>.json`; ignore `.cod/` in Git. Finish native preparation and review recording before the final refresh, because those edits can make an earlier map stale. A clean CI checkout needs its configured producers and a fresh map before verification.

A map says where declarations and references were found. It does not prove use of a returned value or complete framework coverage. Mapping never creates requirements or accepts review. See the [mapping limits](scip-mapping.md#coverage-and-interpretation).

## Moving from the older formats

For new adoption, use the unified format. For an existing integration:

- Record the actual need, existing candidates and chosen action in `decision`.
- Move responsibility and allowed variation into `responsibility` and `rules`.
- Name actual provider/consumer entrypoints under `owner` and `consumers`.
- Put normative examples under `requirements` and make native checks read them.
- Replace separate command registrations with the three-mode native checker.
- Move each production overlay into its consumer's `alternatives`.
- List supporting checker/configuration files once under `checks.files`.
- Record a fresh review with `cod review`, and change required delivery to `cod verify`.

The old low-level commands/APIs remain for existing integrations. They share the same enforcement engine; they are not extra files required by the new format.

## Connected provider catalogs

A dependency can read its version from a native NuGet PackageReference or JSON pointer. `revision` accepts an immutable Git commit or `{ "format": "nuget" }` to read matching restored package provenance. See [connected catalogs](connected-catalogs.md) for the complete setup, freshness model and limits. The version source file is automatically bound into the contract review inputs. Resolving provider metadata does not establish remote conformance.

For a readable source fragment shared by multiple counterexamples, a replacement
step may use `{"from":"unique source text","toFile":"test/fixtures/helper.cs.txt"}`
instead of `to`. Supply exactly one. The toolkit reads the fragment as text,
includes it in the same canonical review/map input inventory, checks containment
and fixture aliasing before mutation, and restores production source afterward.
This keeps test code in native fixtures instead of repeating escaped code in JSON.
