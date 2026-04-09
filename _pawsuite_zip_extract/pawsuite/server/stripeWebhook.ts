import express from "express";
import { Request, Response, Express } from 'express';
import Stripe from 'stripe';
import * as db from './db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id ? parseInt(session.metadata.booking_id) : null;
        const customerId = session.metadata?.customer_id;
        const kennelId = session.metadata?.kennel_id ? parseInt(session.metadata.kennel_id) : null;
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        if (bookingId && customerId && kennelId) {
          // Create payment record
          await db.createPayment(bookingId, customerId, kennelId, amount, session.id);

          // Update booking payment status
          await db.updateBooking(bookingId, {
            payment_status: 'paid',
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export function registerStripeWebhook(app: Express) {
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
}
