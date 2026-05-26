import { useState, useEffect } from 'react';
import { getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const FEATURES = [
  'Biblioteca completa de temperamentos historicos',
  'Werckmeister · Kirnberger · Neidhardt · Young',
  'Mesotonias y temperamentos personalizados',
  'Modo Maestro: sensibilidad ultra precisa',
  'Modo pedagogico con analisis de batidos',
];

export function PaywallModal({ isOpen, onClose, onPurchaseSuccess }: Props) {
  const [offerings, setOfferings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) getOfferings().then(setOfferings);
  }, [isOpen]);

  if (!isOpen) return null;

  const packages = offerings?.current?.availablePackages ?? [];

  async function handlePurchase(pkg: any) {
    setLoading(true);
    setError(null);
    try {
      const ok = await purchasePackage(pkg);
      if (ok) onPurchaseSuccess();
    } catch (e: any) {
      const cancelled = e?.userCancelled === true || String(e?.message ?? '').toLowerCase().includes('cancel');
      if (!cancelled) setError('No se pudo completar la compra. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    const ok = await restorePurchases();
    setLoading(false);
    if (ok) onPurchaseSuccess();
    else setError('No se encontraron compras anteriores.');
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={title}>Tempera Premium</h2>
          <p style={subtitle}>Historical Tuning Studio</p>
        </div>
        <div style={featuresBox}>
          {FEATURES.map((f, i) => (
            <div key={i} style={featRow}>
              <span style={featDot}>+</span>
              <span style={featText}>{f}</span>
            </div>
          ))}
        </div>
        <div style={pkgsBox}>
          {packages.length === 0
            ? <p style={loadTxt}>Cargando opciones...</p>
            : packages.map((pkg: any) => (
              <button key={pkg.identifier} style={pkgBtn} onClick={() => handlePurchase(pkg)} disabled={loading}>
                <span style={pkgName}>{pkg.product.title}</span>
                <span style={pkgPrice}>{pkg.product.priceString}</span>
                {pkg.packageType === 'ANNUAL' && <span style={badge}>Mejor valor</span>}
              </button>
            ))
          }
        </div>
        {error && <p style={errTxt}>{error}</p>}
        <button style={restoreBtn} onClick={handleRestore} disabled={loading}>Restaurar compras</button>
        <button style={closeBtn} onClick={onClose} disabled={loading}>Ahora no</button>
        {loading && <div style={loadOverlay}>...</div>}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(30,22,14,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { background: '#F6F0E5', borderRadius: 12, padding: '28px 24px', width: 320, maxWidth: '92vw', position: 'relative', border: '1px solid #D8CCBA' };
const modalHeader: React.CSSProperties = { textAlign: 'center', marginBottom: 18 };
const title: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, letterSpacing: 4, color: '#3A2E22', fontWeight: 400, textTransform: 'uppercase', margin: '0 0 4px' };
const subtitle: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 9, letterSpacing: 2.5, color: '#9B6B1E', textTransform: 'uppercase', margin: 0 };
const featuresBox: React.CSSProperties = { background: '#EDE3D2', borderRadius: 8, padding: '12px 14px', marginBottom: 16, border: '1px solid #D8CCBA' };
const featRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 };
const featDot: React.CSSProperties = { color: '#C89B3C', fontSize: 12, flexShrink: 0 };
const featText: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 12.5, color: '#3A2E22', lineHeight: 1.4 };
const pkgsBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 };
const pkgBtn: React.CSSProperties = { background: '#C89B3C', border: 'none', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', width: '100%' };
const pkgName: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 13, color: '#F6F0E5' };
const pkgPrice: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 15, color: '#FAF7F0', fontWeight: 700 };
const badge: React.CSSProperties = { position: 'absolute', top: -8, right: 10, background: '#5A8A2A', color: '#F6F0E5', fontSize: 8, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' };
const restoreBtn: React.CSSProperties = { width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 11, color: '#9B8060', letterSpacing: 1, padding: '6px 0', marginBottom: 4, textTransform: 'uppercase' };
const closeBtn: React.CSSProperties = { width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 11, color: '#B0A08A', padding: '4px 0' };
const errTxt: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 11, color: '#9A5A4A', textAlign: 'center', margin: '8px 0 4px' };
const loadTxt: React.CSSProperties = { fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 13, color: '#9B8060', textAlign: 'center', padding: '16px 0' };
const loadOverlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(246,240,229,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, fontSize: 36, color: '#C89B3C' };
