# Run your first COD contract

This walkthrough shows a consumer that behaves correctly but violates its shared-policy contract. You will run the valid implementation, substitute an independent copy, observe the failed ownership check and restore the consumer.

The example demonstrates verification mechanics. Use your application's production consumers and native checks when adopting COD.

## 1. Build the toolkit

You need this repository checkout, Node 22.13+ on the 22 line or Node 24, and pnpm through Corepack. Run the following terminal commands from the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

The next commands use a POSIX shell on macOS or Linux. The CLI itself is invoked through Node; no global `cod` installation is required.

## 2. Copy the example

Keep the checkout as the current directory. Use a fresh temporary workspace, because the probe temporarily changes and restores its owner:

```sh
cod_demo_dir=$(mktemp -d)
cp -R examples/workflow/. "$cod_demo_dir/"
```

The copied files have distinct roles:

| File | Role |
|---|---|
| `live/owner.mjs` | Owns shared relative-time wording |
| `live/consumer.mjs` | Uses that rule through its supported interface |
| `probe.mjs` | Checks behavior and observes owner-only changes through the consumer |
| `cases/` | Valid and invalid implementations used to calibrate the probe |
| `qualification.json` | Declares calibration cases and expected conformance roles |
| `runtime.json` | Declares current behavior, ownership and evolution obligations |
| `workflow.json` | Binds qualification to obligations and records the reuse decision |

Inspect those files before authorizing execution. `--allow-execution` permits trusted commands from the definitions; it does not sandbox them.

## 3. Qualify and verify

```sh
node dist/cli.js qualify-variants "$cod_demo_dir" qualification.json --allow-execution
node dist/cli.js workflow "$cod_demo_dir" workflow.json --allow-execution
```

Both commands emit JSON. The qualification state should be `qualified`, and the workflow state should be `ready-for-review`; both exit 0. The calibration accepts delegation and composition and rejects the independent-copy and dead-owner-decoy cases while their behavior remains correct.

Read the workflow's review obligations. Readiness establishes the registered observations with stable inputs. You still review whether the selected owner fits, the cases mean what they claim and the consumer set is complete. In this small example, ownership and evolution use the same propagation probe; a real contract may need distinct checks for additional evolution promises.

## 4. Introduce a behavior-correct violation

```sh
cp "$cod_demo_dir/cases/independent-copy/consumer.mjs" "$cod_demo_dir/live/consumer.mjs"
(cd "$cod_demo_dir/live" && node ../probe.mjs behavior)
node dist/cli.js workflow "$cod_demo_dir" workflow.json --allow-execution
```

The behavior command exits 0. The strict workflow reports `unresolved` and exits 2 because the consumer edit expired its review. Inspecting the ownership command directly also rejects the copy: `(cd "$cod_demo_dir/live" && node ../probe.mjs conformance)` exits 1. The live consumer keeps the current wording but no longer follows an owner-only change. The reusable check was calibrated against this kind of copy before it was used as a gate.

## 5. Restore and rerun

```sh
cp examples/workflow/live/consumer.mjs "$cod_demo_dir/live/consumer.mjs"
node dist/cli.js workflow "$cod_demo_dir" workflow.json --allow-execution
```

The workflow returns to `ready-for-review`. Your original checkout and its example remain unchanged. The temporary workspace can be deleted after inspection.

## Resolve unexpected results

| Result | What to inspect |
|---|---|
| `INVALID_INPUT` | Run from the checkout root; verify the supplied application root and root-relative definition paths |
| `unresolved` | Read command errors, missing executable details, timeouts or changed-input evidence; restore any files a probe failed to restore |
| `unqualified` | Inspect each calibration case; an always-passing checker cannot reject copies |
| Copy still becomes ready | Check that you changed `live/consumer.mjs`, then inspect whether the witness actually invokes that consumer |

For the visual version, run the [shared-button application](../examples/native-stack/README.md): two real screens, browser checks and deliberate local style copies.

Next, [adopt one responsibility in an existing repository](workflows.md#adopt-in-an-existing-repository). Preserve its feature specs and native verification, route agents to the workflow skill, and author obligations against the actual consumer boundary. Use the [runtime reference](runtime-contracts.md) for complete field and execution rules.
