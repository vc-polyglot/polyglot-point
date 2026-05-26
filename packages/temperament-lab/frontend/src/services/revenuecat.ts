import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

// PLACEHOLDER — reemplazar cuando se cree el proyecto Tempera en RevenueCat
const RC_API_KEY = 'goog_aOeVbBcRMlEwAeWfILHuAxFsOAE';
// PLACEHOLDER — crear entitlement "Tempera Premium" en RevenueCat dashboard
const ENTITLEMENT_ID = 'Tempera Premium';

export async function initRevenueCat(): Promise<void> {
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: RC_API_KEY });
  } catch (e) {
    console.error('[RevenueCat] init:', e);
  }
}

export async function isPremiumActive(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export async function getOfferings() {
  try {
    const { offerings } = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}
