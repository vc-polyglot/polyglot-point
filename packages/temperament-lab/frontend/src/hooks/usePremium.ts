import { useEffect, useState, useCallback } from 'react';
import { isPremiumActive, restorePurchases } from '../services/revenuecat';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    const status = await isPremiumActive();
    setIsPremium(status);
    setLoading(false);
  }, []);

  const restore = useCallback(async () => {
    setLoading(true);
    const status = await restorePurchases();
    setIsPremium(status);
    setLoading(false);
    return status;
  }, []);

  useEffect(() => { check(); }, [check]);

  return { isPremium, loading, setIsPremium, restore, refresh: check };
}
