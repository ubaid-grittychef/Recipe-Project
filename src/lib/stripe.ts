import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});

export const PLANS = {
  pro: {
    name: "Recipe Factory Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    monthlyRecipeQuota: 200,
    price: "$29/month",
  },
} as const;
