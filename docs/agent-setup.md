# Give agents COD instructions and enforcement tools

Use the two supplied skills to adopt COD and maintain changes through its contracts. Both include local references and links to the [existing-tool guide](existing-tools.md) and [recipes](tool-recipes.md). They tell the agent how to select installed tools, implement from requirements and qualify checks; installing this toolkit is optional.

| Skill | Use it for |
|---|---|
| `cod-adopt` | Establish a capability contract and verification workflow from requirements or existing code |
| `cod-workflow` | Discover fitting owners, implement a change and reconcile ongoing contracts |

The repository ships a portable `plugin.json` and a Claude Code `.claude-plugin/plugin.json`. They package the same canonical `skills/` directory. This is a local/source distribution, not a plugin listed in either public directory. The code and documentation use the [MIT license](../LICENSE).

For versioned packages, marketplace installation, updates and support, start with the [preview guide](preview.md).

## Codex: repository skills

From the target repository, with `cod_source` pointing to this checkout:

```sh
cod_source=/absolute/path/to/capability-oriented-development
mkdir -p .agents/skills
cp -R "$cod_source/skills/cod-adopt" .agents/skills/
cp -R "$cod_source/skills/cod-workflow" .agents/skills/
```

Use fresh destination skill directories; review existing copies before updating them. Add this routing instruction to the existing root `AGENTS.md`, preserving other rules:

```markdown
This repository adopts COD for the responsibilities named in our contracts.
Read .agents/skills/cod-workflow/SKILL.md before implementation changes.
For a new adoption, also use .agents/skills/cod-adopt/SKILL.md.
Follow our native verification command; keep requirements, owners, consumers
and qualified checks current. Report executed evidence and uncovered scope.
```

Start a new Codex session in that repository. Request `$cod-adopt` for initial adoption or `$cod-workflow` for a change. Repository routing also supports requests that do not explicitly name the skill. Codex discovers repository skills under `.agents/skills`; automatic selection is still agent behavior, not enforcement. [Official skill locations](https://learn.chatgpt.com/docs/build-skills).

## Claude Code: load the supplied plugin

From the target application repository:

```sh
claude --plugin-dir /absolute/path/to/capability-oriented-development
```

In that session, request `/cod:cod-adopt` or `/cod:cod-workflow`, followed by the requirements. The plugin loads instructions and references; it does not install dependency-cruiser, Pact or other project dependencies. The adoption skill inspects existing tools and proposes or adds the needed local configuration within the authorized task.

If a bundled reference lives outside the application directory, Claude may request read access. Grant access through your normal session permissions, or use the repository-local skill route below so the references live inside the application. The skill never grants this access by itself.

Keep root `AGENTS.md` canonical. If adopting this routing convention, add `@AGENTS.md` to the application's `CLAUDE.md`, preserving existing instructions. The COD checkout's own maintainer instructions are not the application contract and are not automatically loaded just because it is a plugin. [Claude plugin loading](https://code.claude.com/docs/en/plugins).

Alternatively copy both skill directories into the target's `.claude/skills/` and use `/cod-adopt` or `/cod-workflow`. Prefer one installation route to avoid duplicate skills. This guide's executed Claude demonstration uses the local plugin route.

## Build a self-contained plugin archive

From the source checkout, with Python 3 installed:

```sh
python3 tools/package_guidance.py /path/outside/checkout/cod-plugin.zip
```

Choose a new output filename. The archive includes both manifests, skills, public guides and the native example; it excludes internal research, benchmark records and installed dependencies. Manifest versions are derived from `package.json` during packaging. The archive is a guidance bundle, not a preinstalled native toolchain. Full repository verification remains a source-checkout task; the independent example has its own installation instructions.

Claude Code can load that archive with `claude --plugin-dir /absolute/path/cod-plugin.zip`. Other plugin hosts must use their supported installation flow; an archive's existence does not establish public-directory listing or availability in every ChatGPT surface.

## ChatGPT: choose a surface with the required access

The portable manifest packages skills for compatible ChatGPT/Codex plugin hosts. Local marketplace and public-directory availability differ by surface; this repository has not been submitted or published. Do not assume that pasting the GitHub URL installs the plugin. Use your host's supported local/custom plugin path when available. [Official plugin packaging](https://developers.openai.com/plugins/build/plugins).

For an immediately usable coding workflow, open the application repository in Codex with the repository skills above. A ChatGPT coding environment can also use the instructions if it can read the project and execute its native checks. Supply the skill and contract documents through that environment's supported files/plugins mechanism, and verify it actually runs the gate.

In a conversation without repository execution, attach or provide the skill, relevant contracts and source for planning/review. The agent can propose a conforming implementation, but someone or an execution-capable environment must run verification. A read-only inspection connection does not itself grant file edits or native test execution. ChatGPT installation and end-to-end execution have not been demonstrated by this repository's local CLI trials.

## Give the agent a usable request

For initial adoption:

> Use COD to implement these requirements in this repository. Inspect existing
> owners and tools, maintain a capability contract, add qualified native checks,
> and integrate the checks with our normal verification command.

For maintenance:

> Make this change using the repository's COD workflow. Preserve existing
> behavior, reconcile affected contracts and consumers, and run verification.

Ordinary feature requests need not list tools or say “reuse the design system.” The repository instructions should make that inspection part of the workflow. The prompt establishes intent; the contract and executed gate establish the evidence.

## Verify the setup

Before relying on the workflow, ask the agent to locate the installed skill, identify the authoritative contract and run the project's verification command. Then give it a real change request. Independently inspect the result and rerun checks; do not accept the agent's summary as proof.

When adopting source mapping, verify the [mapping task route and completion steps](scip-mapping.md#connect-the-agent-workflow) with that ordinary request. Check that the agent actually consults the map and that the final snapshot has the promised freshness and consumer coverage. Skill discovery, map consultation, map maintenance and semantic reuse are separate observations.

The [adoption walkthrough](agent-demonstration.md) describes how to establish checks for this example. Native enforcement is compulsory only when integrated into the project's delivery checks and required CI status. Neither a plugin nor an LLM judgment makes it compulsory by itself.
