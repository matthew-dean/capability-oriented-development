# Set up an agent to use COD

First [run an example](quickstart.md) and put `cod verify` in your project's required checks. Agent instructions help it follow the workflow; the required checks enforce it.

## Install the skills

The repository includes two skills:

| Skill | Use it for |
|---|---|
| `cod-adopt` | Establish a contract and checks for a responsibility |
| `cod-workflow` | Make a change through an existing contract |

For Codex, copy them into your application repository:

```sh
cod_source=/absolute/path/to/cod-kit
mkdir -p .agents/skills
cp -R "$cod_source/skills/cod-adopt" .agents/skills/
cp -R "$cod_source/skills/cod-workflow" .agents/skills/
```

Review existing copies before updating them. Keep each skill's `references` directory with it.

For Claude Code, load the supplied plugin from your application directory:

```sh
claude --plugin-dir /absolute/path/to/cod-kit
```

Choose one installation route. The plugin supplies instructions; it does not install your project's build or test dependencies.

## Route work to the contract

Add this to the application's existing `AGENTS.md`, preserving its other instructions:

```markdown
For changes covered by our capability contracts, read the cod-workflow skill.
Inspect the contract, owner and consumers before choosing an implementation.
Record the need and reuse decision. Keep requirements, code and checks in
agreement. Run the project's required verification command before finishing.
Use cod-adopt when establishing a new capability contract.
```

Keep that file canonical. If your Claude setup uses `CLAUDE.md`, it can reference the same instructions with `@AGENTS.md`.

Start a new session in the application repository. In Codex, request `$cod-adopt` or `$cod-workflow`; with the Claude plugin, request `/cod:cod-adopt` or `/cod:cod-workflow`. Then describe the actual change. See [a sample task](agent-demonstration.md).

## Optional read-only inspection

Configure your MCP client to start `cod serve <absolute-project-root>`. Its `cod_inspect_contract` tool takes a contract path and an optional project directory beneath that root. It shows the same contract, file paths, check commands and review/map state as `cod inspect`.

Inspection does not execute checks or record review. The agent needs repository access and a command runner to make and verify changes. See [the contract reference](contracts.md#inspect-review-verify).

## Check the setup

Ask the agent to find the contract, identify the owner and run the required verification command. Give it an ordinary change request, then inspect the changed code and results. Confirm that the required command rejects stale review and a deliberate contract disagreement.

If you use a source map, follow [SCIP setup](scip-mapping.md#connect-the-agent-workflow) so the agent consults it and leaves it current.

For archive installation and updates, see [source and guidance archives](preview.md).
