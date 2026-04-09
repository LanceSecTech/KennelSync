import express from "express";
import { Request, Response, Express } from "express";
import type Stripe from "stripe";
import * as db from "./db";
import { stripe } from "./stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

async function syncKennelFromStripeSubscription(sub: Stripe.Subscription) {
  const subId = sub.id;
  let kennelId: number | null = null;
  const metaKid = sub.metadata?.kennel_id;
  if (metaKid) {
    const parsed = parseInt(String(metaKid), 10);
    if (!Number.isNaN(parsed)) kennelId = parsed;
  }
  if (kennelId == null) {
    const row = await db.getKennelByStripeSubscriptionId(subId);
    if (row && typeof (row as { id?: number }).id === "number") {
      kennelId = (row as { id: number }).id;
    }
  }
  if (kennelId == null) return;
  const price = sub.items?.data?.[0]?.price;
  const tier = price?.nickname || price?.id || null;
  await db.updateKennel(kennelId, {
    stripe_subscription_id: subId,
    subscription_status: sub.status,
    subscription_tier: tier,
  });
}

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe || !webhookSecret) {
    console.error("[Stripe webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
    return res.status(503).send("Stripe webhook not configured");
  }

  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", msg);
    return res.status(400).send(`Webhook Error: ${msg}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.metadata?.checkout_flow === "owner_subscription") {
          const kennelId = parseInt(String(session.metadata.kennel_id || ""), 10);
          if (!Number.isNaN(kennelId) && kennelId > 0) {
            const subRef = session.subscription;
            const subId =
              typeof subRef === "string"
                ? subRef
                : subRef && typeof subRef === "object" && "id" in subRef
                  ? String((subRef as { id: string }).id)
                  : null;
            let subStatus = "incomplete";
            let tier: string | null = null;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              subStatus = sub.status;
              const price = sub.items?.data?.[0]?.price;
              tier = price?.nickname || price?.id || null;
            }
            const cust = session.customer;
            const customerId = typeof cust === "string" ? cust : null;
            const updates: Record<string, unknown> = {
              stripe_subscription_id: subId,
              subscription_status: subStatus,
              subscription_tier: tier,
            };
            if (customerId) updates.stripe_customer_id = customerId;
            await db.updateKennel(kennelId, updates);
          }
          break;
        }

        const bookingId = session.metadata?.booking_id ? parseInt(session.metadata.booking_id, 10) : null;
        const customerId = session.metadata?.customer_id;
        const kennelId = session.metadata?.kennel_id ? parseInt(session.metadata.kennel_id, 10) : null;
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        if (bookingId && customerId && kennelId) {
          await db.createPayment(bookingId, customerId, kennelId, amount, session.id);
          await db.updateBooking(bookingId, {
            payment_status: "paid",
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncKennelFromStripeSubscription(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncKennelFromStripeSubscription(sub);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
}
