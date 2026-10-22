# Maintain a source map with SCIP

This toolkit uses [SCIP](https://github.com/scip-code/scip) as its code-mapping interchange. Native language indexers supply declarations and references; reviewed capability bindings connect those facts to authored contracts. The map helps discovery and change routing. Behavior, ownership and contract checks still establish conformance for their covered boundaries.

The toolkit accepts the JSON emitted by the official `scip print --json` command. It delegates binary decoding to that CLI. No Sourcegraph account, upload, graph database or hosted service is required. SCIP is the toolkit’s source-map interchange; COD can still be implemented with equivalent native contracts and verification without this mapper. The [mapping schema](../schemas/scip-mapping.schema.json) describes producer configuration; CLI validation also checks path safety, global-symbol bindings and fresh output arguments.

## Set up the producers

Install the [SCIP CLI](https://github.com/scip-code/scip#installing-the-scip-cli), [scip-dotnet](https://github.com/sourcegraph/scip-dotnet#local-install) for C#/Visual Basic, and [scip-typescript](https://github.com/sourcegraph/scip-typescript) for TypeScript/JavaScript. Pin them in the project's existing toolchain and preserve its runtime, restore and build configuration. Compiler indexes need the real project configuration and dependencies.

Use the bundled `tools/scip-producer.mjs` bridge or a native equivalent. The bridge runs the indexer, directs diagnostics to stderr, converts the binary with the official CLI and removes the temporary binary. It does not upload source. Set `COD_SCIP_CLI` if the decoder is outside PATH. In this example `/tools/COD` is the installed COD directory; replace it with its actual path.

```json
{
  "scipMappingVersion": 1,
  "producers": [
    {"command":"node","args":["/tools/COD/tools/scip-producer.mjs","{output}","dotnet","tool","run","scip-dotnet","index","App.sln","--output","{index}"]},
    {"command":"node","args":["/tools/COD/tools/scip-producer.mjs","{output}","pnpm","exec","scip-typescript","index","web/tsconfig.json","--output","{index}"]}
  ],
  "capabilities": []
}
```

Save this as `.cod/scip.json`. Ignore a generated cache directory, such as `.cod/cache/`. Keep the producer definition and authored contracts in source control. Commands execute with the repository root as their default working directory; set a producer's `cwd` when needed. `{output}` receives a fresh temporary JSON path; `{index}` is the bridge's temporary binary path.

Reuse the same ignored snapshot path across sessions. Agents query it through the inspector; the full graph need not be copied into a prompt. Inspection reads the saved map and current source inventory without running indexers or installing tools.

```sh
cod refresh-scip . .cod/scip.json .cod/cache/map.json --allow-execution
cod inspect-scip . .cod/cache/map.json --symbol shouldReport
```

`refresh-scip` invokes explicitly trusted project commands, not a sandbox. It captures the Git tracked and nonignored untracked file inventory and contents before and after production. It accepts documents only inside that captured inventory, rejects unsafe paths and mismatching embedded text, and retains the previous snapshot on failed production/import. Keep simultaneous edits and other source-changing checks out of that checkout. Generated/ignored source documents outside the inventory are unresolved coverage; they are not silently considered fresh. List required generated declaration paths in optional `additionalInputs` after native preparation. They must exist before indexing and remain unchanged during production; later edits or removal invalidate the map too. This extends source capture without tracking generated files in Git.

Configure native indexers to include authored source and exclude compiled bundles, such as `storybook-static`, coverage output and build directories. Keep authored stories and tests when they are part of the intended coverage. Required generated declarations belong in `additionalInputs`; accepting every generated bundle would obscure the boundary rather than improve it.

## Bind capabilities without generating new contracts

Inspection returns a scoped capability summary and unresolved-reference count. The symbol query returns matching definitions, source ranges and references; the ignored snapshot retains the full graph. Producer diagnostics are returned by refresh so native warnings can be reviewed. Inspect the source and native contracts, then add a binding to the producer definition:

```json
{"id":"monitoring.eligibility","contract":"docs/monitoring.md","symbols":["scip-typescript npm application 1 src/policy.ts/shouldReport()."]}
```

Put that object in `capabilities`, using the **actual** emitted global symbol, then refresh the map. A binding can contain several symbols. Local SCIP identifiers are document-scoped and cannot serve as global capability bindings. Missing definitions remain unresolved bindings. Imported references without indexed definitions remain visible as unresolved external references; they are not proof that the dependency is absent.

The tool does not infer capability meaning, generate prose contracts or accept reviews. Its initial unbound symbol list is a source inventory for adoption, not an architectural specification. Stable capability IDs remain separate from compiler symbol identities, which can change during refactoring.

## Connect the agent workflow

A stored map or installed plugin does not put mapping into the agent's task flow. Extend the repository's existing task routes to the workflow skill or project runbook for each adopted area. A route for one domain does not automatically cover adjacent API or frontend tasks. Keep the actual inspect/refresh commands in one maintained runbook.

For example, adapt this instruction to the project's adopted areas and skill location:

```markdown
For changes covered by .cod/scip.json, read
.agents/skills/cod-workflow/SKILL.md before choosing an owner.
Inspect the map and read the returned source and contracts. Complete native
checks and authored contract/review updates before the final map refresh
and inspection. Report failed refreshes and stale coverage explicitly.
```

Verify adoption with an ordinary change request in a fresh agent session. Inspect the tool trace for actual map consultation before implementation; opening a skill or naming a capability is insufficient. After the change, independently inspect freshness and whether the new or changed indexed consumers appear. Check the resulting behavior and shared-owner propagation separately: successful navigation does not establish a better reuse decision. Local traces can diagnose routing and completion gaps without adding tracked per-change proof files.

## Keep it current

Run `inspect-scip` before relying on a map. A stale report exits 2 and lists changed files plus reverse-reference impact, including unchanged consumers. Invalid input also exits 2; read the report and diagnostics rather than treating the exit status alone as a freshness result. Changes outside indexed documents, such as configuration edits or new files, conservatively mark all bindings for reconciliation.

Use this order for a workflow that promises a maintained map:

1. Inspect the starting map and query relevant symbols before selecting owners. Refresh a stale starting map through the configured native producers before relying on its currency.
2. After editing, inspect stale-map impact before refreshing it. Reconcile affected owners, contracts and consumers against actual source and coverage gaps.
3. Complete native verification and authored contract/review changes. Let preparation and source-changing qualification checks finish before the final index run.
4. Refresh the same cache path, then inspect it again. Leave it current or explicitly report failed refresh and stale/unresolved coverage. Updating a review record after refresh changes captured source and can require another refresh.

The existing inspector can enforce freshness where the project requires it. Append its invocation to the existing verification entrypoint after native checks and authored review are complete:

```sh
cod inspect-scip . .cod/cache/map.json
```

Confirm that the required entrypoint actually reaches this command; a separately named optional script does not enforce it. A clean CI checkout needs producer setup and an initial refresh before inspection because the cache is ignored. Keep independent behavior, ownership and contract-review checks in delivery; a fresh map cannot replace them. Refreshing never accepts a contract review automatically.

A failed refresh retains the previous snapshot, but preparation may already have changed captured generated declarations. Inspect the retained map's state; retention does not imply freshness. Recover through a successful refresh after resolving the producer/input problem.

The initial implementation performs a complete configured producer refresh; it does not implement partial SCIP-index merging, watch daemons or incremental compiler analysis. Producers may supply their own caching. Source freshness is relative to the recorded run; it does not authenticate a producer, prove that it indexed every input, or detect later changes to external executables, ignored dependencies or remote services. Pin tools/dependencies and refresh when that environment changes.

## Coverage and interpretation

References are not necessarily calls, and a reference does not prove policy delegation. This importer uses occurrence definitions/references; it does not yet expand SCIP symbol relationships such as interface implementation edges. Unresolved symbols and incomplete framework support require native inspection and tests.

For Vue/Nuxt, explicitly check component scripts, templates, auto-imports and generated types. Ordinary TypeScript indexing does not guarantee that those relationships are covered. HTTP, messaging and database boundaries between C# and TypeScript also need their native interface contracts and [distributed bindings](distributed-adoption.md); matching names cannot invent a cross-language edge.

`mapped` means the configured producers ran with stable captured source inputs. `current` means that inventory still matches. Neither means that the application conforms to COD. Integrate the independent contract checks through the [normal required delivery command](workflows.md#verify-that-adoption-reaches-delivery).
