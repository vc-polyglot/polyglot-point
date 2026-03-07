import React from 'react';

export default function PaywallPreview({ onClose }: { onClose: () => void }) {
  return (
    <div className="paywall-overlay" role="dialog" aria-modal="true">
      <div className="paywall-card">
        <h2>Desbloquea Polyglot Point</h2>
        <p>Esto es un preview DEV para comprobar legibilidad del muro de pago.</p>

        <div className="plan-option featured">
          <div className="plan-badge">Recomendado</div>
          <div className="plan-header">
            <div className="plan-name">Premium</div>
            <div className="plan-price"> / mes</div>
          </div>
          <div className="plan-desc">50 mensajes/día, correcciones completas, historial.</div>
          <div className="plan-note">Ideal para práctica diaria</div>
        </div>

        <div className="plan-option">
          <div className="plan-header">
            <div className="plan-name">Pro</div>
            <div className="plan-price"> / mes</div>
          </div>
          <div className="plan-desc">4,500 mensajes/mes, prioridad, uso intensivo.</div>
          <div className="plan-note">Para power users</div>
        </div>

        <button className="btn-subscribe" onClick={() => alert('DEV preview: aquí iría Stripe')}>
          Continuar (preview)
        </button>

        <div className="paywall-footer">
          <button className="btn-later" onClick={onClose}>Ahora no</button>
        </div>
      </div>
    </div>
  );
}
