# Use a source or guidance archive

Use a source checkout for the [quickstart](quickstart.md). Archives provide the same documentation and examples for local distribution.

| Archive | Contents | Use |
|---|---|---|
| Source | Toolkit source, tests, examples, guides and skills | Build the CLI and run the examples |
| Guidance | Guides, skills and example source | Give an agent the instructions; use a separately built toolkit to run checks |

## Build an archive

From the repository root, with Python 3.10 or later:

```sh
python3 tools/package_guidance.py /path/outside/checkout/cod-source.zip --kind source
python3 tools/package_guidance.py /path/outside/checkout/cod-guidance.zip --kind guidance
```

Choose new filenames. The packager excludes dependencies and build output. Each archive includes `distribution.json` with its version and file hashes. If supplied with `SHA256SUMS`, verify it before extracting:

```sh
shasum -a 256 -c SHA256SUMS
```

Hashes detect changed files; they do not authenticate a publisher.

## Run the source archive

Extract into a new directory. Follow the [quickstart](quickstart.md) to install dependencies, build and run an example. The [README](../README.md#build-and-run) lists prerequisites for the complete verification suite, including C#.

For optional source mapping, use a Git checkout and follow [SCIP setup](scip-mapping.md); map freshness uses the Git source inventory.

## Use the guidance

Follow [agent setup](agent-setup.md) to install the skills from the extracted directory. Installing guidance does not install the CLI or your application's native check tools.

When updating, review the version and differences before replacing installed skill directories. Preserve application contracts and project-specific instructions. Start a new agent session so it reads the updated guidance.

## Report a problem

Include the toolkit version, operating system, exact command, error output and a small reproduction. For a contract-check failure, include the expected result and relevant contract fields. Remove credentials and private source before sharing.

Code and documentation use the [MIT license](../LICENSE).
