export const paywallTranslations = {
  es: {
    paywall: {
      ariaLabel: "Paywall de suscripción",
      title: "Has usado tus 20 mensajes gratuitos",
      subtitle: "Para seguir practicando con Clara, elige un plan. O puedes cerrar sesión y volver a la página pública.",
      priceNote: "El precio se cobra a través de Google Play. Puedes cancelar cuando quieras.",
      ctaChoose: "Elegir este plan",
      loading: "Procesando…",
      close: "Cerrar",
      signOut: "Cerrar sesión",
      footerNote: "Pago seguro con Google Play. Puedes cancelar cuando quieras desde tu cuenta.",
      errors: {
        checkoutFailed: "No se pudo procesar el pago. Intenta de nuevo en unos segundos.",
      },
    },
  },
  en: {
    paywall: {
      ariaLabel: "Subscription paywall",
      title: "You've used all 20 free messages",
      subtitle: "To keep practicing with Clara, choose a plan. Or sign out to return to the public landing page.",
      priceNote: "Payment is processed through Google Play. Cancel anytime.",
      ctaChoose: "Choose this plan",
      loading: "Processing…",
      close: "Close",
      signOut: "Sign out",
      footerNote: "Secure payment with Google Play. You can cancel anytime from your account.",
      errors: {
        checkoutFailed: "Couldn't process payment. Please try again in a few seconds.",
      },
    },
  },
  fr: {
    paywall: {
      ariaLabel: "Paywall d'abonnement",
      title: "Vous avez utilisé vos 20 messages gratuits",
      subtitle: "Pour continuer à pratiquer avec Clara, choisissez un plan. Ou déconnectez-vous pour revenir à la page publique.",
      priceNote: "Le paiement est traité via Google Play. Annulation possible à tout moment.",
      ctaChoose: "Choisir ce plan",
      loading: "Traitement…",
      close: "Fermer",
      signOut: "Se déconnecter",
      footerNote: "Paiement sécurisé via Google Play. Annulation possible à tout moment.",
      errors: {
        checkoutFailed: "Impossible de traiter le paiement. Réessayez dans quelques secondes.",
      },
    },
  },
  it: {
    paywall: {
      ariaLabel: "Paywall di abbonamento",
      title: "Hai usato tutti i 20 messaggi gratuiti",
      subtitle: "Per continuare a praticare con Clara, scegli un piano. Oppure disconnettiti per tornare alla pagina pubblica.",
      priceNote: "Il pagamento viene elaborato tramite Google Play. Annulla quando vuoi.",
      ctaChoose: "Scegli questo piano",
      loading: "Elaborazione…",
      close: "Chiudi",
      signOut: "Disconnetti",
      footerNote: "Pagamento sicuro con Google Play. Puoi annullare quando vuoi.",
      errors: {
        checkoutFailed: "Impossibile elaborare il pagamento. Riprova tra qualche secondo.",
      },
    },
  },
  de: {
    paywall: {
      ariaLabel: "Abo-Paywall",
      title: "Sie haben Ihre 20 kostenlosen Nachrichten aufgebraucht",
      subtitle: "Um weiter mit Clara zu üben, wählen Sie einen Plan. Oder melden Sie sich ab.",
      priceNote: "Die Zahlung erfolgt über Google Play. Jederzeit kündbar.",
      ctaChoose: "Diesen Plan wählen",
      loading: "Verarbeitung…",
      close: "Schließen",
      signOut: "Abmelden",
      footerNote: "Sichere Zahlung über Google Play. Kündigung jederzeit möglich.",
      errors: {
        checkoutFailed: "Zahlung konnte nicht verarbeitet werden. Bitte erneut versuchen.",
      },
    },
  },
  pt: {
    paywall: {
      ariaLabel: "Paywall de subscrição",
      title: "Usaste todas as 20 mensagens gratuitas",
      subtitle: "Para continuar a praticar com a Clara, escolhe um plano. Ou termina sessão para voltares à página pública.",
      priceNote: "O pagamento é processado pelo Google Play. Cancela quando quiseres.",
      ctaChoose: "Escolher este plano",
      loading: "A processar…",
      close: "Fechar",
      signOut: "Terminar sessão",
      footerNote: "Pagamento seguro com Google Play. Podes cancelar quando quiseres.",
      errors: {
        checkoutFailed: "Não foi possível processar o pagamento. Tenta novamente em alguns segundos.",
      },
    },
  },
};

export function getBrowserLanguage(): string {
  const lang = navigator.language.split("-")[0];
  return ["es", "en", "fr", "it", "de", "pt"].includes(lang) ? lang : "en";
}