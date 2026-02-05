import Stripe from 'stripe';
import { PLAN_CONFIG } from '../../shared/schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export class StripeService {

  async createCheckoutSession(params: {
    userId: number;
    email: string;
    plan: 'premium' | 'pro';
    customerId?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {

    const priceId = params.plan === 'pro'
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_PREMIUM;

    if (!priceId) {
      throw new Error(`No Stripe price configured for plan: ${params.plan}`);
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: String(params.userId),
        plan: params.plan
      }
    };

    // Si ya tiene customerId, usarlo. Si no, usar email.
    if (params.customerId) {
      sessionConfig.customer = params.customerId;
    } else {
      sessionConfig.customer_email = params.email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return { url: session.url };
  }

  async updateSubscription(params: {
    subscriptionId: string;
    newPlan: 'premium' | 'pro';
  }): Promise<Stripe.Subscription> {

    const priceId = params.newPlan === 'pro'
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_PREMIUM;

    if (!priceId) {
      throw new Error(`No Stripe price configured for plan: ${params.newPlan}`);
    }

    // Obtener la suscripción actual
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    const itemId = subscription.items.data[0].id;

    // Actualizar al nuevo precio (con prorrateo automático)
    const updated = await stripe.subscriptions.update(params.subscriptionId, {
      items: [{
        id: itemId,
        price: priceId,
      }],
      proration_behavior: 'create_prorations', // Stripe calcula diferencia automáticamente
      metadata: {
        plan: params.newPlan
      }
    });

    return updated;
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return stripe.customers.retrieve(customerId);
  }
}

export const stripeService = new StripeService();