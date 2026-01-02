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
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    
    const priceId = params.plan === 'pro' 
      ? process.env.STRIPE_PRICE_PRO 
      : process.env.STRIPE_PRICE_PREMIUM;
    
    if (!priceId) {
      throw new Error(`No Stripe price configured for plan: ${params.plan}`);
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.email,
      metadata: {
        userId: String(params.userId),
        plan: params.plan
      }
    });
    
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    
    return { url: session.url };
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