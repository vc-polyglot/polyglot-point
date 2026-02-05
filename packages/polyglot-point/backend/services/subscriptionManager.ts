import { db } from "../db";
import { users, PLAN_CONFIG } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

class SubscriptionManager {
  async getUsage(userId: number): Promise<{ bank: number; used: number; plan: string; ceiling: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { bank: 0, used: 0, plan: "freemium", ceiling: 20 };

    const config = PLAN_CONFIG[user.planType as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.freemium;
    return {
      bank: user.messagesBank,
      used: user.messagesUsedThisPeriod,
      plan: user.planType,
      ceiling: config.ceiling,
    };
  }

  async consumeMessage(userId: number): Promise<{ remaining: number; success: boolean }> {
    // ATOMICO: descuenta solo si messagesBank > 0
    const [updated] = await db
      .update(users)
      .set({
        messagesBank: sql`${users.messagesBank} - 1`,
        messagesUsedThisPeriod: sql`${users.messagesUsedThisPeriod} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), sql`${users.messagesBank} > 0`))
      .returning({ remaining: users.messagesBank });

    if (!updated) return { remaining: 0, success: false };
    return { remaining: updated.remaining, success: true };
  }
}

export const subscriptionManager = new SubscriptionManager();
