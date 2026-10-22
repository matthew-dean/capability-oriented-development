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

```sh
cod refresh-scip . .cod/scip.json .cod/cache/map.json --allow-execution
cod inspect-scip . .cod/cache/map.json --symbol shouldReport
```

`refresh-scip` invokes explicitly trusted project commands, not a sandbox. It captures the Git tracked and nonignored untracked file inventory and contents before and after production. It accepts documents only inside that captured inventory, rejects unsafe paths and mismatching embedded text, and retains the previous snapshot on failed production/import. Keep simultaneous edits and other source-changing checks out of that checkout. Generated/ignored source documents outside the inventory are unresolved coverage; they are not silently considered fresh. List required generated declaration paths in optional `additionalInputs` after native preparation. They must exist before indexing and remain unchanged during production; later edits or removal invalidate the map too. This extends source capture without tracking generated files in Git.

## Bind capabilities without generating new contracts

Inspection returns a scoped capability summary and unresolved-reference count. The symbol query returns matching definitions, source ranges and references; the ignored snapshot retains the full graph. Producer diagnostics are returned by refresh so native warnings can be reviewed. Inspect the source and native contracts, then add a binding to the producer definition:

```json
{"id":"monitoring.eligibility","contract":"docs/monitoring.md","symbols":["scip-typescript npm application 1 src/policy.ts/shouldReport()."]}
```

Put that object in `capabilities`, using the **actual** emitted global symbol, then refresh the map. A binding can contain several symbols. Local SCIP identifiers are document-scoped and cannot serve as global capability bindings. Missing definitions remain unresolved bindings. Imported references without indexed definitions remain visible as unresolved external references; they are not proof that the dependency is absent.

The tool does not infer capability meaning, generate prose contracts or accept reviews. Its initial unbound symbol list is a source inventory for adoption, not an architectural specification. Stable capability IDs remain separate from compiler symbol identities, which can change during refactoring.

## Keep it current

Run `inspect-scip` before relying on a map. It exits 2 when source has changed since capture and reports changed files plus reverse-reference impact, including unchanged consumers. Changes outside indexed documents, such as configuration edits or new files, conservatively mark all bindings for reconciliation. Refresh through the normal agent workflow or native CI/watch trigger, then reconcile affected responsibilities and run their checks. Refreshing the map never refreshes contract reviews automatically.

The initial implementation performs a complete configured producer refresh; it does not implement partial SCIP-index merging, watch daemons or incremental compiler analysis. Producers may supply their own caching. Source freshness is relative to the recorded run; it does not authenticate a producer, prove that it indexed every input, or detect later changes to external executables, ignored dependencies or remote services. Pin tools/dependencies and refresh when that environment changes.

## Coverage and interpretation

References are not necessarily calls, and a reference does not prove policy delegation. This importer uses occurrence definitions/references; it does not yet expand SCIP symbol relationships such as interface implementation edges. Unresolved symbols and incomplete framework support require native inspection and tests.

For Vue/Nuxt, explicitly check component scripts, templates, auto-imports and generated types. Ordinary TypeScript indexing does not guarantee that those relationships are covered. HTTP, messaging and database boundaries between C# and TypeScript also need their native interface contracts and [distributed bindings](distributed-adoption.md); matching names cannot invent a cross-language edge.

`mapped` means the configured producers ran with stable captured source inputs. `current` means that inventory still matches. Neither means that the application conforms to COD. Integrate the independent contract checks through the [normal required delivery command](workflows.md#verify-that-adoption-reaches-delivery).
