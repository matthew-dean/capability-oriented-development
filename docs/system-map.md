# Inspect a cross-repository capability map

For standard contract adoption, start with the derived `cod catalog` and [connected catalog resolver](connected-catalogs.md). This supplied inventory format handles additional declared runtime and migration evidence; it is not a second required registry.

`inspect-system` checks a supplied inventory and local authoritative-contract exports. It helps find missing owners, unknown dependencies, changed provider artifacts and consumers still pinned to old contract bytes. It never fetches repositories, runs checks, or certifies conformance.

```sh
cod inspect-system /path/to/inventory system.json
```

The [complete example](../examples/system/system.json) models a settings app consuming Identity's workspace-permission capability. Run it with `node dist/cli.js inspect-system examples/system system.json` from this checkout after building.

## Definition

`systemVersion: 1` identifies the serialized format, not the package release. Definitions reject unknown fields. Strings must be nonempty after trimming.

- `id`: the inventory identity.
- `repositories`: 1–200 unique `{id, location, inspectedRevision?}` records. Locations are descriptive strings; no network access occurs. Inspected source revisions do not establish deployed versions.
- `capabilities`: 1–1,000 unique records with `id`, `responsibility`, `owner`, `implementations`, optional `contract`, optional `dependsOn`, and `consumers`.
- `owner`: `{repository, team?}`. The repository must be registered; absent accountable ownership remains a gap.
- `implementations`: up to 100 `{repository, reference, role}` records. `role` is `current`, `candidate` or `retired`. At least one current implementation is required to resolve the inventory. These are supplied source classifications, not deployment observations.
- `contract`: `{repository, revision, artifact, sha256, source}`. Its repository must match the authoritative owner. The artifact is a root-relative regular file; outside-root paths and escaping symlinks are rejected. `sha256` is 64 lowercase hexadecimal characters. `revision` names an immutable provider release/source revision; common floating labels such as `main`, `master`, `HEAD`, `develop` and `latest` are rejected, but arbitrary alias provenance is not authenticated.
- `dependsOn`: up to 200 unique capability IDs, default `[]`. Unknown and self dependencies are gaps. The inspector does not require a global DAG: real systems can have cycles that require architectural review.
- `consumers`: up to 200 records, unique by `id` within a capability, with `repository`, `entrypoint`, optional `contractSha256`, and `checks`. No consumers leaves inventory coverage unresolved.
- `checks`: optional textual references `behavior`, `ownership`, `evolution`, `compatibility`, `twoWay`. These can identify native commands or evidence definitions; they are not run. All except compatibility are required to resolve a consumer; compatibility is additionally required across repositories. A same-repository boundary may still need native compatibility checks appropriate to its contract.

## Result and authority

Exit 0 / `resolved` means registered identities, local contract bytes, consumer locks and required check references resolve. **It always reports `conformance: not-evaluated`.** Even invented check references cannot turn this inventory into passing conformance.

Exit 2 / `unresolved` reports inventory gaps or invalid/unavailable input. Gaps include `unassigned-owner`, `no-current-implementation`, `missing-contract-lock`, `contract-digest-mismatch`, `unreconciled-consumer`, `unknown-capability`, and missing check references. Malformed definitions fail before inspection. The operation writes no acceptance records.

A contract change with a new provider digest makes old consumer pins visibly unreconciled. This does not replace native compatibility or two-way delivery gates. A consumer source change is detected by its local binding/verification workflow, not by this inventory tool. Follow [distributed adoption](distributed-adoption.md) to connect these pieces to actual provider and consumer delivery.
