import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";

// Required: webhook must run on Node.js runtime for crypto support
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("API:Webhooks:Stripe");

// Must use service role key to update profiles from webhook (no user session)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    log.error("Webhook signature verification failed", {}, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        // Get subscription details
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
        let periodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }

        // Also initialize quota_reset_at to start of next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

        await supabase.from("profiles").update({
          subscription_status: "active",
          subscription_plan: "pro",
          stripe_subscription_id: subscriptionId,
          current_period_end: periodEnd,
          recipes_generated_this_month: 0,
          quota_reset_at: nextMonth,
        }).eq("id", userId);

        log.info("Subscription activated", { userId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        // Look up user by stripe_customer_id
        const customerId = String(sub.customer);
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (!profile) break;

        const isActive = sub.status === "active" || sub.status === "trialing";
        await supabase.from("profiles").update({
          subscription_status: isActive ? "active" : "inactive",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", profile.id);

        log.info("Subscription updated", { userId: profile.id, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = String(sub.customer);
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (!profile) break;

        await supabase.from("profiles").update({
          subscription_status: "inactive",
          subscription_plan: "free",
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq("id", profile.id);

        log.info("Subscription cancelled", { userId: profile.id });
        break;
      }

      default:
        log.info("Unhandled webhook event", { type: event.type });
    }
  } catch (err) {
    log.error("Webhook handler error", { eventType: event.type }, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
