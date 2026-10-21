# Inspect a capability owned in another repository

The settings app consumes a permission decision owned by Identity. Its map references a provider-owned contract export and pins the exact bytes. Check references explain what the adopting projects must execute; they are intentionally illustrative, not test results.

From the COD checkout root after building:

```sh
node dist/cli.js inspect-system examples/system system.json
```

Expect `resolved`, exit 0, and **`conformance: not-evaluated`**. That means the supplied inventory and artifact identities resolve, not that either application conforms. This command executes no project code and makes no network requests.

Change the contract file without changing its pin: inspection reports a digest mismatch. Update the provider pin but leave the consumer pin unchanged: inspection reports an unreconciled consumer. Candidate source, missing owners, absent checks and unregistered dependencies also remain visible as gaps. Use a disposable copy when trying these edits.

In real projects, obtain the artifact through an authorized channel at an immutable revision, verify its origin using your existing release process, and run actual provider/consumer checks. Maintain local two-way bindings against the imported artifact and real client/consumer source. The inspector does not authenticate origin, retrieve repositories, coordinate CI, discover all consumers or verify deployments. Follow the [cross-repository guide](../../docs/distributed-adoption.md).
