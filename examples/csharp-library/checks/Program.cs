using System.Diagnostics;
using System.Globalization;
using System.Text.Json.Nodes;

// The same three modes are used in JavaScript and Vue. Only observation differs:
// here we rebuild and run a real .NET consumer instead of opening a browser.
var mode = args[0];
var contractPath = args[1];
var ownerPath = "src/Pricing.cs";
var originalOwner = File.ReadAllBytes(ownerPath);
var originalContract = File.ReadAllBytes(contractPath);

try
{
    if (mode == "behavior")
    {
        CheckBehavior();
    }
    else if (mode == "ownership")
    {
        CheckBehavior();
        ChangeOwner();
        // Rebuild the real app. An old loaded assembly is not a valid probe.
        Require(Observe() == Subtotal() * 0.8m, "Checkout did not follow the changed pricing owner.");
    }
    else if (mode == "changes")
    {
        // Contract-only disagreement must fail the same behavior assertion.
        var contract = JsonNode.Parse(File.ReadAllText(contractPath))!;
        contract["requirements"]!["total"] = 95;
        File.WriteAllText(contractPath, contract.ToJsonString());
        ExpectDisagreement(CheckBehavior);
        File.WriteAllBytes(contractPath, originalContract);

        // Implementation-only disagreement must fail too.
        ChangeOwner();
        ExpectDisagreement(CheckBehavior);
    }
    else throw new Exception($"Unknown check mode: {mode}");
}
catch (ContractViolation error)
{
    Console.Error.WriteLine(error.Message);
    Environment.ExitCode = 1;
}
catch (Exception error)
{
    Console.Error.WriteLine(error);
    Environment.ExitCode = 2; // Compiler/process errors are unresolved, not a caught copy.
}
finally
{
    File.WriteAllBytes(ownerPath, originalOwner);
    File.WriteAllBytes(contractPath, originalContract);
}

void ChangeOwner()
{
    var source = System.Text.Encoding.UTF8.GetString(originalOwner);
    if (!source.Contains("subtotal * 0.9m")) throw new Exception("Reconcile the pricing probe with the owner.");
    File.WriteAllText(ownerPath, source.Replace("subtotal * 0.9m", "subtotal * 0.8m"));
}

void CheckBehavior()
{
    var expected = JsonNode.Parse(File.ReadAllText(contractPath))!["requirements"]!["total"]!.GetValue<decimal>();
    Require(Observe() == expected, "Checkout total disagrees with capability.json.");
}

decimal Subtotal() => JsonNode.Parse(File.ReadAllText(contractPath))!["requirements"]!["subtotal"]!.GetValue<decimal>();

decimal Observe()
{
    var start = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true };
    foreach (var argument in new[] { "run", "--project", "app/App.csproj", "--verbosity", "quiet", "--", Subtotal().ToString(CultureInfo.InvariantCulture) }) start.ArgumentList.Add(argument);
    using var process = Process.Start(start) ?? throw new Exception("Could not start the consumer.");
    var outputTask = process.StandardOutput.ReadToEndAsync();
    var errorTask = process.StandardError.ReadToEndAsync();
    process.WaitForExit();
    if (process.ExitCode != 0) throw new Exception(errorTask.Result + outputTask.Result);
    var lastLine = outputTask.Result.Trim().Split('\n').Last();
    return decimal.Parse(lastLine, CultureInfo.InvariantCulture);
}

void Require(bool condition, string message)
{
    if (!condition) throw new ContractViolation(message);
}

void ExpectDisagreement(Action check)
{
    try { check(); }
    catch (ContractViolation) { return; }
    throw new Exception("The behavior assertion accepted an incompatible change.");
}

sealed class ContractViolation(string message) : Exception(message);
