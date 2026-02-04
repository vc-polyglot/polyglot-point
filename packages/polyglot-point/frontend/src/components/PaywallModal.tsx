import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { paywallTranslations, getBrowserLanguage } from '../i18n/paywall';
import '../styles/paywall-modal.css';

type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type PlanKey = 'premium_monthly' | 'premium_yearly' | 'pro_monthly';

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const auth = useAuth();
  const lang = getBrowserLanguage();
  const t = paywallTranslations[lang as keyof typeof paywallTranslations].paywall;
  
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('premium_monthly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(t.errors.checkoutFailed);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      if (auth?.logout) {
        await auth.logout();
      } else {
        window.location.href = '/';
      }
    }
  };

  if (!isOpen) return null;

  const getPlanName = (plan: PlanKey) => {
    switch (plan) {
      case 'premium_monthly': return t.plans.premiumMonthly.name;
      case 'premium_yearly': return t.plans.premiumYearly.name;
      case 'pro_monthly': return t.plans.proMonthly.name;
      default: return '';
    }
  };

  const getPlanDescription = (plan: PlanKey) => {
    switch (plan) {
      case 'premium_monthly': return t.plans.premiumMonthly.desc;
      case 'premium_yearly': return t.plans.premiumYearly.desc;
      case 'pro_monthly': return t.plans.proMonthly.desc;
      default: return '';
    }
  };

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
          <div
            className={`plan-card ${selectedPlan === 'premium_monthly' ? 'selected' : ''} popular`}
            onClick={() => setSelectedPlan('premium_monthly')}
          >
            <span className="popular-badge">Más popular</span>
            <div className="plan-header">
              <h3>{getPlanName('premium_monthly')}</h3>
              <p>{getPlanDescription('premium_monthly')}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">14.99</span>
              <span className="period">/mes</span>
            </div>
            <ul className="plan-features">
              <li>
                <span className="checkmark">✓</span>
                <span className="highlight">50 mensajes diarios</span>
              </li>
              <li>
                <span className="checkmark">✓</span>
                <span>6 idiomas completos</span>
              </li>
              <li>
                <span className="checkmark">✓</span>
                <span>Correcciones detalladas</span>
              </li>
            </ul>
          </div>

          <div
            className={`plan-card ${selectedPlan === 'premium_yearly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('premium_yearly')}
          >
            <div className="plan-header">
              <h3>{getPlanName('premium_yearly')}</h3>
              <p>{getPlanDescription('premium_yearly')}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">149.99</span>
              <span className="period">/año</span>
              <span className="savings">(≈ $12.50/mes)</span>
            </div>
            <ul className="plan-features">
              <li>
                <span className="checkmark">✓</span>
                <span>Todo lo de Premium</span>
              </li>
              <li>
                <span className="checkmark">✓</span>
                <span className="highlight">2 meses gratis</span>
              </li>
              <li>
                <span className="checkmark">✓</span>
                <span>Ahorras $30 al año</span>
              </li>
            </ul>
          </div>

          <div
            className={`plan-card ${selectedPlan === 'pro_monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('pro_monthly')}
          >
            <div className="plan-header">
              <h3>{getPlanName('pro_monthly')}</h3>
              <p>{getPlanDescription('pro_monthly')}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">27.99</span>
              <span className="period">/mes</span>
            </div>
            <ul className="plan-features">
              <li>
                <span className="checkmark">✓</span>
                <span className="highlight">150 mensajes diarios</span>
              </li>
              <li>
                <span className="checkmark">✓</span>
                <span>Modelos IA avanzados</span>
              </li>
              <li>
                <span className="checkmark">✓</span>
                <span>Soporte prioritario</span>
              </li>
            </ul>
          </div>
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
