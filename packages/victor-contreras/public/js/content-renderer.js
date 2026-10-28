(() => {
  'use strict';
  const TEXT = {
    es: { concerts:'Conciertos', recent:'Conciertos recientes.', upcoming:'Próximos conciertos', canceled:'Cambios de programación', archive:'Explorar el archivo', contact:'Contacto', enquiry:'Para próximas presentaciones y colaboraciones, escríbeme.', organ:'Órgano', conducting:'Dirección', canceledEvent:'Cancelado', details:'Más información', unknown:'Fecha por confirmar', references:'referencias', noResults:'No hay coincidencias. Prueba otra búsqueda.', now:'Ahora', journal:'Cuaderno' },
    en: { concerts:'Concerts', recent:'Recent concerts.', upcoming:'Upcoming concerts', canceled:'Schedule updates', archive:'Explore the archive', contact:'Contact', enquiry:'For upcoming appearances and collaborations, get in touch.', organ:'Organ', conducting:'Conducting', canceledEvent:'Canceled', details:'More information', unknown:'Date to be confirmed', references:'references', noResults:'No matches. Try another search.', now:'Now', journal:'Journal' },
    fr: { concerts:'Concerts', recent:'Concerts récents.', upcoming:'Prochains concerts', canceled:'Changements de programme', archive:'Explorer les archives', contact:'Contact', enquiry:'Pour les prochaines invitations et collaborations, contactez-moi.', organ:'Orgue', conducting:'Direction', canceledEvent:'Annulé', details:'En savoir plus', unknown:'Date à confirmer', references:'références', noResults:'Aucun résultat. Essayez une autre recherche.', now:'Actualités', journal:'Carnet' },
    it: { concerts:'Concerti', recent:'Concerti recenti.', upcoming:'Prossimi concerti', canceled:'Aggiornamenti del programma', archive:'Esplora l’archivio', contact:'Contatto', enquiry:'Per prossimi concerti e collaborazioni, contattami.', organ:'Organo', conducting:'Direzione', canceledEvent:'Annullato', details:'Informazioni', unknown:'Data da confermare', references:'riferimenti', noResults:'Nessun risultato. Prova un’altra ricerca.', now:'Attualità', journal:'Taccuino' }
  };
  const language = () => TEXT[window.currentLang] ? window.currentLang : 'es';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const localized = (value,lang) => typeof value === 'object' && value ? value[lang] || value.es || '' : value || '';
  function safeURL(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value),window.location.origin);
      return ['https:','http:'].includes(url.protocol) ? escapeHTML(url.href) : '';
    } catch { return ''; }
  }
  function formatDate(event,lang) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) {
      const date = new Date(event.date + 'T12:00:00Z');
      if (Number.isFinite(date.getTime())) return new Intl.DateTimeFormat(lang,{ day:'numeric',month:'short',year:'numeric',timeZone:'UTC' }).format(date);
    }
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.period || '')) {
      return new Intl.DateTimeFormat(lang,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(event.period + '-01T12:00:00Z'));
    }
    return event.dateLabel || String(event.sortYear || TEXT[lang].unknown);
  }
  function eventHTML(event,lang) {
    const text = TEXT[lang];
    const date = event.date || event.period;
    const when = date ? '<time datetime="' + escapeHTML(date) + '">' + escapeHTML(formatDate(event,lang)) + '</time>' : escapeHTML(formatDate(event,lang));
    const location = [event.place,event.city,event.country].filter(Boolean).join(' · ');
    const category = text[event.category] || localized(event.role,lang);
    const url = safeURL(event.url);
    const canceled = ['canceled','cancelled'].includes(event.status);
    return '<li class="concert-item"><p class="concert-date">' + when + '</p><div>' +
      (category ? '<p class="event-category">' + escapeHTML(category) + '</p>' : '') +
      '<h3 lang="' + (typeof event.title === 'object' ? lang : 'es') + '">' + escapeHTML(localized(event.title,lang)) + '</h3>' +
      (location ? '<p>' + escapeHTML(location) + '</p>' : '') +
      (canceled ? '<p class="event-category">' + text.canceledEvent + '</p>' : '') +
      (url ? '<a class="text-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' + text.details + ' ↗</a>' : '') + '</div></li>';
  }
  function renderAgenda(data) {
    const root = document.getElementById('agendaDynamic');
    if (!root || !data?.agenda) return; // Keep the complete HTML fallback on network errors.
    const lang = language(), text = TEXT[lang], agenda = data.agenda;
    const upcoming = agenda.upcoming || [], recent = (agenda.past || []).slice(0,3);
    const today = window.VictorContent.calendarDay();
    const canceled = (agenda.canceled || []).filter(event => !event.date || event.date >= today);
    let html = '';
    if (upcoming.length) html += '<div class="agenda-upcoming"><p class="eyebrow">' + text.concerts + '</p><h2>' + text.upcoming + '</h2><ul class="concerts-list">' + upcoming.map(event => eventHTML(event,lang)).join('') + '</ul></div>';
    html += '<div class="section-heading"><div><p class="eyebrow">' + text.concerts + '</p><h2>' + text.recent + '</h2></div><a class="text-link" href="#archivo">' + text.archive + ' →</a></div>' +
      '<ul class="concerts-list">' + recent.map(event => eventHTML(event,lang)).join('') + '</ul>';
    if (canceled.length) html += '<h3>' + text.canceled + '</h3><ul class="concerts-list">' + canceled.map(event => eventHTML(event,lang)).join('') + '</ul>';
    html += '<p class="agenda-note">' + text.enquiry + ' <a href="#contact">' + text.contact + ' →</a></p>';
    root.innerHTML = html;
  }
  function fold(value) {
    return String(value).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/ø/g,'o');
  }
  function renderArchive(data) {
    const root = document.getElementById('archiveDynamic');
    if (!root || !data?.agenda) return;
    const lang = language(), text = TEXT[lang];
    const query = fold(document.getElementById('archive-search')?.value || '').trim();
    const category = document.getElementById('archive-category')?.value || 'all';
    const today = window.VictorContent.calendarDay();
    const archived = [...data.agenda.past,...data.agenda.undated,...data.agenda.canceled.filter(event => !event.date || event.date < today)];
    const filtered = archived.filter(event => (category === 'all' || event.category === category) && fold([localized(event.title,lang),event.description,event.place,event.city,event.country,event.dateLabel,event.sortYear].filter(Boolean).join(' ')).includes(query));
    const groups = new Map();
    for (const event of filtered.sort((a,b) => String(b.date || b.period || b.sortYear || '').localeCompare(String(a.date || a.period || a.sortYear || '')))) {
      const year = event.sortYear || (event.date || event.period || '').slice(0,4) || text.unknown;
      if (!groups.has(year)) groups.set(year,[]);
      groups.get(year).push(event);
    }
    const expanded = new Set([...root.querySelectorAll('details[open]')].map(detail => detail.dataset.year));
    root.innerHTML = [...groups.entries()].map(([year,events],index) => '<details class="archive-year" data-year="' + escapeHTML(year) + '"' +
      (query || category !== 'all' || expanded.has(String(year)) || (!expanded.size && index === 0) ? ' open' : '') +
      '><summary>' + escapeHTML(year) + '<span>' + events.length + '</span></summary><ul class="concerts-list">' + events.map(event => eventHTML(event,lang)).join('') + '</ul></details>').join('') ||
      '<p>' + text.noResults + '</p>';
    const count = document.getElementById('archive-count');
    if (count) count.textContent = new Intl.NumberFormat(lang).format(filtered.length) + ' ' + text.references;
  }
  function renderAhora(data) {
    const root = document.getElementById('ahoraDynamic');
    if (!root || !data?.ahora) return;
    const lang = language(), items = data.ahora.activeItems;
    root.closest('section').hidden = !items.length;
    root.innerHTML = items.length ? '<p class="eyebrow">' + TEXT[lang].now + '</p><div class="now-grid">' + items.map(item => '<article>' +
      (item.kicker ? '<p class="eyebrow">' + escapeHTML(localized(item.kicker,lang)) + '</p>' : '') +
      '<h2>' + escapeHTML(localized(item.title,lang)) + '</h2><p>' + escapeHTML(localized(item.text,lang)) + '</p></article>').join('') + '</div>' : '';
  }
  function renderCuaderno(data) {
    const root = document.getElementById('cuadernoDynamic');
    if (!root || !data?.cuaderno) return;
    const lang = language(), entries = data.cuaderno.entries;
    root.closest('section').hidden = !entries.length;
    root.innerHTML = entries.length ? '<p class="eyebrow">' + TEXT[lang].journal + '</p><div class="journal-grid">' + entries.map(entry => {
      const image = safeURL(entry.image);
      return '<article>' + (image ? '<figure class="journal-image"><img src="' + image + '" alt="' + escapeHTML(localized(entry.alt,lang)) + '" loading="lazy"></figure>' : '') +
        '<p class="eyebrow">' + escapeHTML([entry.date,entry.place].filter(Boolean).join(' · ')) + '</p><h2>' + escapeHTML(localized(entry.title,lang)) +
        '</h2><p>' + escapeHTML(localized(entry.text,lang)) + '</p></article>';
    }).join('') + '</div>' : '';
  }
  function renderData(data) {
    for (const render of [renderAgenda,renderArchive,renderAhora,renderCuaderno]) {
      try { render(data); } catch (error) { console.error('[VictorContent] Component unavailable:',error); }
    }
  }
  async function renderAll() {
    if (!window.VictorContent) return;
    const data = await window.VictorContent.loadAll();
    window.VictorSiteData = data;
    renderData(data);
    if (data.agenda) document.querySelector('.archive-controls')?.removeAttribute('hidden');
  }
  document.addEventListener('DOMContentLoaded',() => {
    renderAll();
    for (const [id,event] of [['archive-search','input'],['archive-category','change']]) {
      document.getElementById(id)?.addEventListener(event,() => { if (window.VictorSiteData) renderArchive(window.VictorSiteData); });
    }
  });
  document.addEventListener('victor:languagechange',() => { if (window.VictorSiteData) renderData(window.VictorSiteData); });
  window.VictorRenderer = Object.freeze({renderAll,renderAgenda,renderArchive});
})();
