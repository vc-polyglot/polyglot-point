import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const RC_API_KEY_ANDROID = 'goog_aOeVbBcRMlEwAeWfILHuAxFsOAE';
export const ENTITLEMENT_ID = 'Polyglot Point Pro';

export async function initRevenueCat(userId?: string) {
  if (!Capacitor.isNativePlatform()) return;
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({
    apiKey: RC_API_KEY_ANDROID,
    appUserID: userId ?? null,
  });
}

export async function getIsPremium(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (e) {
    console.error('[RC] getIsPremium error:', e);
    return false;
  }
}

export async function getOfferings() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { offerings } = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('[RC] getOfferings error:', e);
    return null;
  }
}

export async function purchasePackage(rcPackage: any) {
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: rcPackage });
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    return { success: isPremium, customerInfo };
  } catch (e: any) {
    if (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    console.error('[RC] purchasePackage error:', e);
    return { success: false, error: e };
  }
}

export async function restorePurchases() {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    return { success: isPremium };
  } catch (e) {
    console.error('[RC] restorePurchases error:', e);
    return { success: false };
  }
}

export async function loginRC(userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logIn({ appUserID: userId });
  } catch (e) {
    console.error('[RC] loginRC error:', e);
  }
}

export async function logoutRC() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.error('[RC] logoutRC error:', e);
  }
}