using System.Globalization;
using Shop;

// This is the real caller path observed by the contract checks.
Console.WriteLine(Checkout.Total(decimal.Parse(args[0], CultureInfo.InvariantCulture)).ToString(CultureInfo.InvariantCulture));
