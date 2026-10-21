# Try COD with one capability

Use the guidance preview to give an agent COD's adoption and maintenance skills, then apply them to one responsibility in an existing application. The guidance package includes the documentation and native examples; you do not need to build the COD toolkit to try that workflow.

The source preview additionally contains the TypeScript toolkit and its product tests. Neither package includes internal studies, transcripts or Git history. Current preview access and reuse are governed by the included license. No public-directory listing is implied by an archive or local marketplace.

## Choose a package

| Package | Use it when | Prerequisites |
|---|---|---|
| Guidance ZIP | You want skills, recipes and native examples | A supported agent; Node 22.13+ on the 22 line or Node 24 for examples; npm |
| Source ZIP | You want to build the optional COD CLI/library | Node as above, pnpm through Corepack; Python 3.10+ for distribution checks |

Obtain the preview ZIP and checksum from the maintainer. From the directory containing the files, verify the supplied archive checksums with `shasum -a 256 -c SHA256SUMS` (macOS) or `sha256sum -c SHA256SUMS` (Linux). Extract into a new directory; keep the application you will change in its own directory. The included `distribution.json` records each payload file's SHA-256 and release identity. It detects accidental changes when verified; it is not a signed publisher identity.

## Install in Codex

The extracted preview contains `.agents/plugins/marketplace.json`, identifying the local marketplace `cod-preview` and plugin `cod`. Register it explicitly, then inspect and install:

```sh
codex plugin marketplace add /absolute/path/to/extracted-preview
codex plugin list --marketplace cod-preview --available --json
codex plugin add cod@cod-preview
```

These commands can change user plugin configuration. Use the application client's plugin controls to review and enable the installation. Restart the session, select the application repository and invoke the adoption/workflow skill. Actual support must be read together with the verification status below; discovery is not proof of a completed installation.

For a repository-local skills route, use the copy instructions in [agent setup](agent-setup.md). That route has already been exercised with fresh Codex sessions. Keep its skill directories updated deliberately rather than overwriting local customizations silently.

## Install in Claude Code

From the application repository, register the extracted marketplace and install in project scope:

```sh
claude plugin marketplace add /absolute/path/to/extracted-preview --scope project
claude plugin install cod@cod-preview --scope project
```

Restart Claude Code in that application, then request `/cod:cod-adopt` or `/cod:cod-workflow`. Project scope records settings in the application; collaborators still need access to the package. For a one-session tryout without marketplace registration:

```sh
claude --plugin-dir /absolute/path/to/extracted-preview
```

See [agent setup](agent-setup.md) for reference access, repository instructions and the difference between installing guidance and enforcing checks.

## Verify a first run

Run the native example before changing your own application:

```sh
cd examples/native-stack
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
```

Read its capability contract and deliberately copied variants. A behavior-correct copy must fail the owner-propagation check. Then adopt one actual application responsibility with `cod-adopt`: preserve existing tools, identify owners/consumers, maintain requirements, qualify evidence and integrate verification into the normal delivery command.

For the source package, run from its root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify:pr
```

The source export includes product checks and examples. Research harnesses and execution archives remain outside tracked source and are not part of the adopter package.

## Updates and removal

Keep an old extracted package until the replacement works. Review the new version, changelog and checksum before installing. Local marketplaces point at a directory; replace that directory deliberately or register the new directory, refresh the host and restart sessions. An open session may retain previously loaded instructions.

Claude Code supports `claude plugin update cod@cod-preview --scope project` after refreshing the marketplace. For Codex, refresh with `codex plugin marketplace upgrade cod-preview`, then reinstall with `codex plugin add cod@cod-preview` and review the installed version in the client. For copied skills, review differences before replacing the two directories. Do not overwrite a project's authored capability contracts as part of a guidance update.

To remove a project-scoped Claude installation, use `claude plugin uninstall cod@cod-preview --scope project`. For Codex use its plugin controls or `codex plugin remove cod@cod-preview`. Remove marketplace registration only if no other installed plugins use it. For copied skills, remove only the installed skill folders and their routing instruction; application contracts and tests belong to the application.

## Support and verification status

The [adoption walkthrough](agent-demonstration.md) describes a native-tool workflow. Installation and marketplace support must be verified in the target environment; a command example is not an executed compatibility receipt.

ChatGPT desktop hosts support local marketplace workflows, but a ChatGPT end-to-end coding session has not been demonstrated here. Use Codex or Claude Code for the verified paths. Web conversations without repository execution can plan/review, then hand off to an environment that runs the checks. Service, Protobuf and WIT recipes remain integration guidance rather than executed adapters.

## Report a useful issue

Provide the package version, host/version, operating system, chosen enforcement stack, exact command and sanitized error output. State whether the failure concerns installation, discovery, contract authoring, native verification or a false conformance result. Include a minimal reproduction and the supported representation you expected to pass. Do not attach credentials, private source or unsanitized agent transcripts to a public issue.

The maintainer can triage a sanitized report through the distribution channel. Code and documentation use the [MIT license](../LICENSE). Public issue tracking and contribution guidance must be established before inviting public contributions. The preview is intended for guided adoption; it does not promise every framework, automatic architectural approval or arbitrary-repository reliability.
