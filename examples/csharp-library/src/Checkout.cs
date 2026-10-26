namespace Shop;

public static class Checkout
{
    public static decimal Total(decimal subtotal) => Pricing.Total(subtotal);
}
