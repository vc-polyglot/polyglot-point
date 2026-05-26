import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../auth/AuthContext';
import { paywallTranslations, getBrowserLanguage } from '../i18n/paywall';
import { getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat';
import '../styles/paywall-modal.css';

type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type PlanKey = 'monthly' | 'yearly';

const PLANS: { key: PlanKey; label: string; price: string; period: string; badge?: string; features: string[] }[] = [
  {
    key: 'monthly',
    label: 'Premium Monthly',
    price: '4.99',
    period: '/mes',
    badge: 'Más popular',
    features: ['50 mensajes diarios', '6 idiomas completos', 'Correcciones detalladas'],
  },
  {
    key: 'yearly',
    label: 'Premium Yearly',
    price: '29.99',
    period: '/año',
    features: ['Todo lo de Premium', '2 meses gratis', 'Ahorras $30 al año'],
  },
];

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const auth = useAuth();
  const lang = getBrowserLanguage();
  const t = paywallTranslations[lang as keyof typeof paywallTranslations].paywall;

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [rcPackages, setRcPackages] = useState<Record<string, any>>({});
  const [restoreMsg, setRestoreMsg] = useState('');

  // Cargar offerings de RevenueCat al abrir
  useEffect(() => {
    if (!isOpen || !Capacitor.isNativePlatform()) return;
    (async () => {
      const offering = await getOfferings();
      if (!offering) return;
      const map: Record<string, any> = {};
      for (const pkg of offering.availablePackages) {
        // pkg.identifier es '$rc_monthly', '$rc_annual', etc.
        const id = pkg.identifier.replace('$rc_', '').replace('annual', 'yearly');$1console.log(`[RevenueCat] ID: ${id} | Precio: ${pkg.product.priceString} | Original ID: ${pkg.product.identifier}`);$1console.log(`[RevenueCat] ID: ${id} | Precio: ${pkg.product.priceString} | Original ID: ${pkg.product.identifier}`);
        if (['monthly', 'yearly'].includes(id)) {
          map[id] = pkg;
        }
      }
      setRcPackages(map);
    })();
  }, [isOpen]);

  // -- Android: flujo RevenueCat --------------------------------------------
  const handleAndroidPurchase = async () => {
    const pkg = rcPackages[selectedPlan];
    if (!pkg) {
      console.error('[PaywallModal] Paquete no encontrado:', selectedPlan, rcPackages);
      setIsLoading(false);
      return;
    }
    const result = await purchasePackage(pkg);
    setIsLoading(false);
    if (result.success) {
      onClose();
    } else if (!result.cancelled) {
      alert('Error al procesar el pago. Intenta de nuevo.');
    }
  };

  // -- Web: flujo Stripe ----------------------------------------------------
  const handleWebCheckout = async () => {
    try {
      const response = await fetch('/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedPlan }),
      });
      if (!response.ok) throw new Error('Failed to create checkout session');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(t.errors?.checkoutFailed ?? 'Error al procesar el pago.');
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    if (Capacitor.isNativePlatform()) {
      await handleAndroidPurchase();
      return;
    }
    await handleWebCheckout();
  };

  const handleRestore = async () => {
    setIsLoading(true);
    const result = await restorePurchases();
    setIsLoading(false);
    if (result.success) {
      setRestoreMsg('? Compra restaurada correctamente.');
      onClose();
    } else {
      setRestoreMsg('No se encontraron compras anteriores.');
    }
  };

  const handleLogout = async () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      if (auth?.logout) await auth.logout();
      else window.location.href = '/';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="paywall-backdrop">
      <div className="paywall-container">
        <button className="paywall-logout-btn" onClick={handleLogout}>
          {t.signOut}
        </button>

        <div className="paywall-header">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="paywall-benefits">
          <div className="benefit-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span>Práctica sin límites</span>
          </div>
          <div className="benefit-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>6 idiomas completos</span>
          </div>
          <div className="benefit-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>Correcciones detalladas</span>
          </div>
        </div>

        <div className="paywall-plans">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`plan-card ${selectedPlan === plan.key ? 'selected' : ''} ${plan.badge ? 'popular' : ''}`}
              onClick={() => setSelectedPlan(plan.key)}
            >
              {plan.badge && <span className="popular-badge">{plan.badge}</span>}
              <div className="plan-header">
                <h3>{plan.label}</h3>
              </div>
              <div className="plan-price">
                <span className="currency">$</span>
                <span className="amount">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <span className="checkmark">?</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="paywall-cta">
          <button
            className="paywall-btn-primary"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? t.loading : t.ctaChoose}
          </button>
          <p className="price-note">{t.priceNote}</p>
          {Capacitor.isNativePlatform() && (
            <button
              className="paywall-btn-restore"
              onClick={handleRestore}
              disabled={isLoading}
            >
              Restaurar compra
            </button>
          )}
          {restoreMsg && <p className="restore-msg">{restoreMsg}</p>}
        </div>

        <div className="paywall-guarantee">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>{t.footerNote}</span>
        </div>
      </div>
    </div>
  );
}



