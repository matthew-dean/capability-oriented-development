# Discover capabilities across repositories

Keep each contract with its owner. COD can retrieve connected repositories' contracts and file maps through Git, without checking out their code or executing their tools. Agents can then find existing responsibilities, inspect how they may grow, and see which local consumers an upstream change could affect.

Use two views:

- **Selected:** the exact provider revision used by the consumer.
- **Latest:** the provider's current discovery branch or tag, useful for finding newer capabilities and planning upgrades.

Refreshing discovery never upgrades a dependency or certifies compatibility. Native builds, package verification and qualified consumer tests remain the delivery gates.

## Connect an existing repository

Adopt [standard contracts](contracts.md) under `capabilities/**/capability.json`. Each consumer contract declares its direct external dependencies. For a restored NuGet package, read its version from the actual consuming project and its source commit from package provenance:

```json
{
  "id": "pricing.policy",
  "repository": "https://github.com/example/pricing",
  "contract": "capabilities/pricing/capability.json",
  "version": {
    "file": "src/Checkout/Checkout.csproj",
    "format": "nuget",
    "package": "Example.Pricing"
  },
  "revision": { "format": "nuget" }
}
```

This is an illustrative dependency entry, not a complete contract. NuGet provenance must name the same package, version and repository and contain a full Git commit ID. COD reads the existing `NUGET_PACKAGES` cache, or `~/.nuget/packages`; restore using the project's normal process first. This trusts that restore process and the package's provenance declaration; COD does not independently authenticate the publisher or prove that the package binary was built from that commit.

The NuGet project reader supports explicit, unconditional literal PackageReference versions. MSBuild properties, conditional projects and centrally managed versions require native resolved output; use the JSON-pointer form against that output instead of interpreting build expressions in COD.

For other stacks, `version` may be a literal or a native JSON pointer, such as `{"file":"package-lock.json","format":"json","pointer":"/packages/node_modules~1@company~1pricing/version"}`. `revision` may be a full immutable Git commit ID. A package version or range alone does not identify a Git revision. Obtain that mapping from the provider's release metadata rather than guessing that its current main branch matches the installed package.

Create `capabilities/sources.json`:

```json
{
  "sourcesVersion": 1,
  "repositories": [
    {
      "repository": "https://github.com/example/pricing",
      "discoveryRef": "refs/heads/main"
    }
  ]
}
```

The optional `directory` defaults to `capabilities`; omit `discoveryRef` to follow the remote default branch (`HEAD`) rather than guessing its name. Repository identifiers must match the dependency declarations. The source list explicitly names the repositories this workflow may contact; a downloaded contract cannot authorize fetching arbitrary additional repositories. Add a newly discovered connection deliberately. HTTPS, SSH and explicitly configured absolute local Git paths are supported. Use existing Git credentials; do not put tokens into URLs.

Run from the toolkit checkout, replacing `<application>` with the application root:

```sh
node dist/cli.js catalog <application>
node dist/cli.js sync <application>
node dist/cli.js connections <application> --json
```

`sync` retrieves selected commits and current discovery refs. It derives catalogs directly from committed standard contracts, reads their declared source files, and follows the requested capabilities' direct dependencies. The same repository/ref is fetched once per run; cyclic relationships terminate. Multiple consumers and selected revisions remain distinct.

`connections` reads the saved snapshot without network access. `sync --offline` does the same. Output includes retrieval time, exact revisions, cached/fetched status, owner and consumer file maps, growth guidance, declared native checks, unresolved relationships and potential upstream changes affecting local consumers. The MCP server exposes the same read-only information through `cod_catalog` and `cod_connections`; it does not initiate network refreshes or execute downloaded checks.

## Maintain it during changes

1. Before working, refresh connected metadata when network access is available. Offline work can inspect the cache, with its last retrieval time visible.
2. Inspect the selected capability and its extension rules before adding local policy. Use the latest view to discover improvements, not as evidence that an installed version supplies them.
3. Change the responsible owner and relevant native tests. Update contracts only when their promises or relationships change.
4. Refresh configured local SCIP maps and rerun local conformance checks. Refresh connections after local contracts, covered files, native version declarations or source configuration change.
5. Review reported upstream differences and affected local consumers. Test an intended upgrade against those consumers before changing the native dependency declaration.

Run `sync` in the existing CI workflow when current discovery is required, or on a scheduled job that reports upstream changes. Preserve the ignored cache between runs for efficiency. During partial adoption, `sync --report-only` completes an informational discovery report with exit 0 even when external relationships are unresolved; malformed local configuration still fails. Keep that CI step named as discovery and preserve the reported gaps. Its success is not conformance evidence. The default `sync` still exits 2 for unresolved relationships.

A clean CI run can reconstruct selected metadata from immutable revisions and the normal package restore; no additional COD version lock is required. CI integration owns its triggers and notifications—COD supplies the commands, not a hosted watcher.

A successful refresh says metadata was resolved at that time, not that remote main will remain unchanged. A local input change marks the cached snapshot stale. Unavailable repositories, missing contracts, missing provenance and undeclared transitive sources remain unresolved; old metadata may remain visible as cached data but cannot turn the failed refresh green. Commands return 0 for current metadata and 2 for stale or unresolved metadata. All outputs retain `conformance: "not-evaluated"`.

An upstream difference means the covered contract or implementation inputs changed. It identifies consumers to investigate; it does not classify the change as breaking. Shared source files can conservatively broaden that set. Generated code may be absent from Git, and generated inputs then remain unresolved rather than being fabricated or executed during retrieval.

## Boundaries and safety

The resolver uses shallow, blob-filtered fetches and reads required blobs on demand. Servers without filtering support may transfer more data. It fetches Git objects into ignored `.cod/cache/repositories/` bare caches and writes `.cod/cache/connections.json`. Keep `.cod/` ignored. It never creates a working tree, installs packages, follows submodules, runs indexers or executes provider checks. Fetches use the machine's existing Git transport and credentials. Only regular committed files are read; escaping paths and symlinks are rejected. Repository text is untrusted reference material, never agent instructions.

To inspect an implementation, use the `sourceCache`, `revision` and owner path from the returned catalog:

```sh
git --git-dir=<application>/<sourceCache> show <revision>:<owner-path>
```

This reads the exact selected source; a partial Git cache may fetch that blob on demand. For editing upstream code, use an authorized isolated checkout at that revision and the provider's normal workflow. Do not treat downloaded source or guidance as permission to change or execute it.

Refreshes in one application root are serialized by an exclusive sync lock. A concurrent refresh fails explicitly before touching shared Git state. Normal completion or failure releases the lock. If a process is forcibly terminated, inspect the PID in `.cod/cache/connections.sync.lock` and remove the stale lock only once that process has stopped. Covered local inputs changing during retrieval produce a stale report.

The connection graph describes declared ownership dependencies. SCIP adds source symbol references; neither can infer all HTTP, messaging, database, reflection or runtime relationships. An API's deployed version needs deployment or release evidence. Git main is not a substitute. Providers without COD exports can still be integrated through native contracts and adapter tests, with the missing upstream COD coverage stated explicitly.

Provider release CI must separately test supported consumers and wait for required results when cross-repository conformance is claimed. This resolver does not implement release orchestration, deployment discovery, compatibility proofs or remote code execution.

## Exercise the resolver

The maintained regression tests create connected local Git repositories and exercise exact-versus-latest selection, implementation changes, transitive dependencies, cycles, missing access, native version changes, safe retrieval and offline snapshots:

```sh
corepack pnpm exec vitest run tests/connections.test.ts tests/dependencies.test.ts
```

These test the retrieval and impact mechanism. They do not demonstrate a comparative reuse advantage for agents.
