# One rule. One place to change it.

You have two pages. Each page has a blue button.

Both pages use the same piece of code to draw that button. That is useful: change the shared code once, and both buttons change.

Now you ask an AI to make the buttons round.

It might change the shared code. Good.

But it might also put a new style on each page. Both buttons look right. A test that checks their shape may pass. Yet the pages now have their own rules. The next shared change might not reach them.

How do we catch that?

## Check what we already have

Before we add a piece, ask: What do we need? Is there a piece that already does that job?

Look within the same area of the app. If the shared button can do the job, use it. If it needs a new option, add that option in one place. Make a new piece when there is a clear reason the old one does not fit.

Write down what you checked and why you chose that path. Keep the choice in line with the area's rules. We want each piece to have a reason to exist, not two pieces doing the same job by mistake.

## Write down the rule

Give the shared part a short contract. It says:

> This part makes our buttons. It owns their shape and how they work. These two pages use it. A page may choose its button's words and action, but it must not make its own copy of the shared rules.

COD is short for **Capability-Oriented Development**. A capability is something the code can do. A contract names that job and the promises that come with it.

The contract points to the real code and tests. It is not just a note the AI is meant to remember.

## Check two things

First, check that the buttons work now. Do they have the right shape? Does a disabled button stay disabled?

Then change the shared rule in a test. Do both pages follow it?

If a page uses the shared part, it should follow the change. If it made a copy, it may stay the same. The test catches that.

We also test the test. We try a copy that looks right. It must fail the shared-rule check. We try a page that uses the shared part through a helper. It must pass.

That helps us check that the test catches the mistake we care about.

## Know what to open

There is one contract file to start with: **`capability.json`**.

It tells you:

- What this part does and why it is needed.
- What already exists and why we chose this piece.
- Where its code lives.
- Which parts use it.
- What they may change.
- What results to expect.
- Where the tests live.

The code does the work. The contract states the promise. The tests check that they agree.

```text
Read the promise → Find the code → Make the change → Run the checks
```

If you change only the promise, the old code should fail. If you break only the code, the old promise should catch it. To make an intended change, update both and check the parts that use them.

## Keep the same steps

The toolkit has three main commands:

| Command | What it does |
|---|---|
| `inspect` | Shows the shared part, who uses it and which tests will run |
| `review` | Records what you reviewed and which files you reviewed |
| `verify` | Runs the checks and reports what passed or failed |

C#, JavaScript and Vue use the same contract shape and these same commands. Their tests use the tools for that language. You do not need a new process for each kind of code.

[Try the JavaScript example](../examples/native-stack/README.md). Then compare the [C# and Vue examples](contract-profiles.md).

## You still get to judge the rule

An AI can help write the contract and tests. That does not make them right.

You should be able to point at a rule, find its test, and see what mistake makes that test fail. A list of files is not proof. A note that says “reviewed” is not proof either.

The aim is simple: make shared rules easy to find, easy to read, and hard to break by mistake.
