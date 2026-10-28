(() => {
  'use strict';
  const LANGS = ['es', 'en', 'fr', 'it'];
  const UI = {
    es: { navigation: 'Navegación principal', close: 'Cerrar imagen', prev: 'Imagen anterior', next: 'Imagen siguiente', play: 'Reproducir interpretación', search: 'Ciudad, repertorio, festival…', all: 'Todas', organ: 'Órgano', conducting: 'Dirección', subjects: ['Concierto / Recital','Clase magistral','Festival','Prensa','Otro'], sending: 'Enviando el mensaje…', success: 'Mensaje enviado. Gracias por escribir.', error: 'No se pudo enviar el mensaje. Inténtalo de nuevo o escribe a victoropus24@yahoo.com.mx.', rate_limited: 'Has realizado varios intentos. Espera unos minutos o escribe directamente a victoropus24@yahoo.com.mx.', mail_not_configured: 'El formulario no está disponible por ahora. Escribe a victoropus24@yahoo.com.mx.', invalid_email: 'Revisa tu correo electrónico.', missing_fields: 'Completa tu nombre, correo y mensaje.', too_long: 'El mensaje es demasiado largo. El máximo es de 5000 caracteres.' },
    en: { navigation: 'Main navigation', close: 'Close image', prev: 'Previous image', next: 'Next image', play: 'Play performance', search: 'City, repertoire, festival…', all: 'All', organ: 'Organ', conducting: 'Conducting', subjects: ['Concert / Recital','Masterclass','Festival','Press','Other'], sending: 'Sending your message…', success: 'Message sent. Thank you for getting in touch.', error: 'Your message could not be sent. Try again or email victoropus24@yahoo.com.mx.', rate_limited: 'Several attempts have been made. Wait a few minutes or email victoropus24@yahoo.com.mx.', mail_not_configured: 'The form is temporarily unavailable. Email victoropus24@yahoo.com.mx.', invalid_email: 'Check your email address.', missing_fields: 'Enter your name, email and message.', too_long: 'Your message is too long. The limit is 5000 characters.' },
    fr: { navigation: 'Navigation principale', close: 'Fermer l’image', prev: 'Image précédente', next: 'Image suivante', play: 'Lire l’interprétation', search: 'Ville, répertoire, festival…', all: 'Toutes', organ: 'Orgue', conducting: 'Direction', subjects: ['Concert / Récital','Masterclasse','Festival','Presse','Autre'], sending: 'Envoi du message…', success: 'Message envoyé. Merci de votre intérêt.', error: 'Le message n’a pas pu être envoyé. Réessayez ou écrivez à victoropus24@yahoo.com.mx.', rate_limited: 'Plusieurs tentatives ont été effectuées. Patientez ou écrivez à victoropus24@yahoo.com.mx.', mail_not_configured: 'Le formulaire est momentanément indisponible. Écrivez à victoropus24@yahoo.com.mx.', invalid_email: 'Vérifiez votre adresse électronique.', missing_fields: 'Indiquez votre nom, votre courriel et votre message.', too_long: 'Votre message dépasse la limite de 5000 caractères.' },
    it: { navigation: 'Navigazione principale', close: 'Chiudi immagine', prev: 'Immagine precedente', next: 'Immagine successiva', play: 'Riproduci interpretazione', search: 'Città, repertorio, festival…', all: 'Tutte', organ: 'Organo', conducting: 'Direzione', subjects: ['Concerto / Recital','Masterclass','Festival','Stampa','Altro'], sending: 'Invio del messaggio…', success: 'Messaggio inviato. Grazie per averci scritto.', error: 'Impossibile inviare il messaggio. Riprova o scrivi a victoropus24@yahoo.com.mx.', rate_limited: 'Sono stati effettuati diversi tentativi. Attendi qualche minuto o scrivi a victoropus24@yahoo.com.mx.', mail_not_configured: 'Il modulo non è al momento disponibile. Scrivi a victoropus24@yahoo.com.mx.', invalid_email: 'Controlla il tuo indirizzo email.', missing_fields: 'Inserisci nome, email e messaggio.', too_long: 'Il messaggio supera il limite di 5000 caratteri.' }
  };
  window.currentLang = 'es';
  function setLang(language) {
    const lang = LANGS.includes(language) ? language : 'es';
    window.currentLang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('lang-active', el.dataset.lang === lang));
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const text = UI[lang];
    document.querySelector('nav')?.setAttribute('aria-label', text.navigation);
    for (const [id,key] of [['lb-close','close'],['lb-prev','prev'],['lb-next','next']]) {
      document.getElementById(id)?.setAttribute('aria-label', text[key]);
    }
    document.querySelectorAll('.youtube-facade').forEach((link,index) => link.setAttribute('aria-label', text.play + ' ' + (index + 1) + ' — YouTube'));
    document.querySelectorAll('#contact-subject option').forEach((option,index) => { option.textContent = text.subjects[index]; });
    const search = document.getElementById('archive-search');
    if (search) search.placeholder = text.search;
    document.querySelectorAll('#archive-category option').forEach(option => { option.textContent = text[option.value] || text.all; });
    const status = document.getElementById('formStatus');
    if (status?.dataset.messageKey) status.textContent = text[status.dataset.messageKey] || text.error;
    try { localStorage.setItem('victor-language', lang); } catch { /* Reading remains available without storage. */ }
    document.dispatchEvent(new CustomEvent('victor:languagechange', { detail: { lang } }));
  }
  window.setLang = setLang;
  function initLanguages() {
    document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLang(button.dataset.language)));
    let preferred = 'es';
    try { preferred = new URL(window.location.href).searchParams.get('lang') || localStorage.getItem('victor-language') || 'es'; } catch {}
    setLang(preferred);
  }
  function initGallery() {
    const dialog = document.getElementById('lightbox');
    const image = document.getElementById('lb-img');
    const caption = document.getElementById('lb-caption');
    const counter = document.getElementById('lb-counter');
    const links = [...document.querySelectorAll('[data-gallery-index]')];
    if (!dialog || !image || !caption || !links.length || typeof dialog.showModal !== 'function') return;
    let index = 0;
    let opener = null;
    function show(nextIndex) {
      index = (nextIndex + links.length) % links.length;
      image.src = links[index].href;
      image.alt = links[index].dataset.caption || '';
      caption.textContent = image.alt;
      if (counter) counter.textContent = (index + 1) + ' / ' + links.length;
    }
    links.forEach((link,i) => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(i);
      dialog.showModal();
      document.body.classList.add('lightbox-open');
    }));
    dialog.querySelector('#lb-close')?.addEventListener('click', () => dialog.close());
    dialog.querySelector('#lb-prev')?.addEventListener('click', () => show(index - 1));
    dialog.querySelector('#lb-next')?.addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('lightbox-open');
      opener?.focus();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        show(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
  }
  function initVideos() {
    document.querySelectorAll('.youtube-facade').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const id = link.dataset.youtubeId;
      if (!/^[\w-]{11}$/.test(id || '')) return;
      event.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.className = 'youtube-embed';
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
      iframe.title = link.getAttribute('aria-label') || 'Víctor Contreras — YouTube';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      link.replaceWith(iframe);
      iframe.focus();
    }));
  }
  function initContact() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    const button = form?.querySelector('[type=submit]');
    if (!form || !status || !button) return;
    function message(key,state) {
      status.dataset.messageKey = key;
      status.dataset.state = state;
      status.textContent = UI[window.currentLang][key] || UI[window.currentLang].error;
      status.hidden = false;
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (button.disabled || !form.reportValidity()) return;
      button.disabled = true;
      form.setAttribute('aria-busy','true');
      message('sending','pending');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(),15000);
      try {
        const values = new FormData(form);
        const response = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
          signal: controller.signal,
          body: JSON.stringify(Object.assign(Object.fromEntries(values),{ lang:window.currentLang }))
        });
        let data;
        try { data = await response.json(); } catch { data = {}; }
        if (!response.ok || data.success !== true) {
          message(UI[window.currentLang][data.error] ? data.error : 'error','error');
          status.focus();
        } else {
          form.reset();
          message('success','success');
        }
      } catch {
        message('error','error');
        status.focus();
      } finally {
        clearTimeout(timer);
        form.removeAttribute('aria-busy');
        button.disabled = false;
      }
    });
  }
  // One optional component must never prevent the rest of the page from working.
  for (const initialize of [initLanguages,initGallery,initVideos,initContact]) {
    try { initialize(); } catch (error) { console.error('[VictorSite] Component unavailable:',error); }
  }
})();
