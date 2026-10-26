namespace Shop;

// Pricing owns the shared discount. Callers choose the subtotal, not the formula.
public static class Pricing
{
    public static decimal Total(decimal subtotal) => subtotal * 0.9m;
}
