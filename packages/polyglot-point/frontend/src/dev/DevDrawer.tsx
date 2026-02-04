import React, { useState } from "react";
import { PaywallModal } from "../components/PaywallModal";

async function openRealCheckout(plan: "premium" | "pro") {
  try {
    const resp = await fetch("/billing/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Checkout error");
    if (!data?.url) throw new Error("No checkout URL");

    window.location.href = data.url;
  } catch {
    alert("Checkout REAL falló");
  }
}

export default function DevDrawer() {
  // ?? NO SUBIR A PRODUCCI�N
  if (process.env.NODE_ENV !== "development") return null;
  
  const [open, setOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      {showPaywall && (
        <PaywallModal
          isOpen={true}
          onClose={() => {
            setShowPaywall(false);
            window.location.href = "/";
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 99999,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.65)",
            color: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
          }}
          title="DEV tools (solo local)"
        >
          DEV
        </button>

        {open && (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              width: 300,
              borderRadius: 14,
              background: "rgba(0,0,0,0.75)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Caja DEV
            </div>

            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Paywall
            </div>
            <button style={btn} onClick={() => {
  // Forzar que tengas 0 mensajes
  localStorage.setItem('dev_force_paywall', 'true');
  // Abrir el paywall REAL (no el preview)
  setShowPaywall(true);
}}>
  Abrir Paywall REAL
</button>

            <div style={{ height: 10 }} />

            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Checkout REAL (Stripe)
            </div>
            <button style={btn} onClick={() => openRealCheckout("premium")}>
              Abrir Checkout REAL – Premium
            </button>
            <button style={btn} onClick={() => openRealCheckout("pro")}>
              Abrir Checkout REAL – Pro
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const btn: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  marginTop: 6,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.92)",
  cursor: "pointer",
};


