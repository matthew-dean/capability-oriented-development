# Give an agent a COD task

Install the [agent guidance](agent-setup.md), then give the agent a concrete change in your application:

> Make the shared buttons round. Preserve disabled and busy behavior. Use the
> existing capability contract, check which part owns the rule, and run the
> project's required verification command.

The agent should:

1. Read the contract and inspect the existing owner and consumers.
2. Record the need, alternatives considered and reuse or extension decision.
3. Update the owner and intentionally changed requirements together.
4. Check real behavior and prove that consumers follow an owner change.
5. Confirm that valid wrappers pass and correct-looking copies fail ownership.
6. Reconcile review, run the project's checks and report remaining gaps.

Review the changed code, contract and test results. Check that the addition is needed, consistent with the capability and does not duplicate an existing responsibility. A passing test cannot make that design judgment for you.

Follow the [button walkthrough](../examples/native-stack/README.md) to see the assertions, or the [adoption workflow](workflows.md) to integrate them into your project.
