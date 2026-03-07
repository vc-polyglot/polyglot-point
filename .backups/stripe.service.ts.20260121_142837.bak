import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Importante: NO truena al arrancar el server. Truena solo si se intenta usar Stripe sin config.
    throw new Error("STRIPE_SECRET_KEY no configurada");
  }

  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
  });
}

export class StripeService {
  private stripe: Stripe | null = null;

  private client(): Stripe {
    if (!this.stripe) this.stripe = getStripe();
    return this.stripe;
  }

  async createCheckoutSession(params: {
    userId: number;
    email: string;
    plan: "premium" | "pro";
    customerId?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const priceId = params.plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_PREMIUM;

    if (!priceId) {
      throw new Error(`No Stripe price configured for plan: ${params.plan}`);
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: String(params.userId),
        plan: params.plan,
      },
    };

    if (params.customerId) sessionConfig.customer = params.customerId;
    else sessionConfig.customer_email = params.email;

    const session = await this.client().checkout.sessions.create(sessionConfig);

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  }

  async updateSubscription(params: { subscriptionId: string; newPlan: "premium" | "pro" }): Promise<Stripe.Subscription> {
    const priceId = params.newPlan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_PREMIUM;

    if (!priceId) {
      throw new Error(`No Stripe price configured for plan: ${params.newPlan}`);
    }

    const subscription = await this.client().subscriptions.retrieve(params.subscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) throw new Error("Stripe subscription has no items");

    return this.client().subscriptions.update(params.subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { plan: params.newPlan },
    });
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET no configurada");

    return this.client().webhooks.constructEvent(payload, signature, secret);
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client().subscriptions.retrieve(subscriptionId);
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.client().customers.retrieve(customerId);
  }
}

export const stripeService = new StripeService();
