(() => {
  'use strict';

  const TEXT = {
    es: {
      label: 'Agenda',
      upcoming: '<em>Próximos</em> conciertos',
      past: 'Conciertos <em>anteriores</em>',
      empty: 'Agenda en actualización'
    },
    en: {
      label: 'Schedule',
      upcoming: '<em>Upcoming</em> concerts',
      past: 'Past <em>concerts</em>',
      empty: 'Schedule being updated'
    },
    fr: {
      label: 'Agenda',
      upcoming: '<em>Prochains</em> concerts',
      past: 'Concerts <em>passés</em>',
      empty: 'Agenda en cours de mise à jour'
    },
    it: {
      label: 'Agenda',
      upcoming: '<em>Prossimi</em> concerti',
      past: 'Concerti <em>passati</em>',
      empty: 'Agenda in aggiornamento'
    }
  };

  function currentLanguage() {
    return window.currentLang || 'es';
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(event, lang) {
    if (event.dateLabel) return escapeHTML(event.dateLabel);

    if (!event.date) return '';

    const date = new Date(`${event.date}T12:00:00`);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(lang, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function eventHTML(event, lang) {
    const location = [
      event.place,
      event.city,
      event.country
    ].filter(Boolean).join(' · ');

    return `
      <div class="concert-item">
        <div class="concert-date">${formatDate(event, lang)}</div>
        <div class="concert-info">
          <h4>${escapeHTML(event.title)}</h4>
          ${location ? `<p>${escapeHTML(location)}</p>` : ''}
          ${event.role ? `<p>${escapeHTML(event.role)}</p>` : ''}
        </div>
      </div>
    `;
  }

  function renderAgenda(data) {
    const root = document.getElementById('agendaDynamic');
    if (!root) return;

    const lang = currentLanguage();
    const text = TEXT[lang] || TEXT.es;

    const upcoming = Array.isArray(data?.agenda?.upcoming)
      ? data.agenda.upcoming
      : [];

    const past = Array.isArray(data?.agenda?.past)
      ? data.agenda.past
      : [];

    let body = '';

    if (upcoming.length) {
      body += `
        <h2 class="section-title">${text.upcoming}</h2>
        <div class="concerts-list">
          ${upcoming.map(event => eventHTML(event, lang)).join('')}
        </div>
      `;
    }

    if (past.length) {
      body += `
        <h2 class="section-title agenda-past-title">${text.past}</h2>
        <div class="concerts-list">
          ${past.map(event => eventHTML(event, lang)).join('')}
        </div>
      `;
    }

    if (!upcoming.length && !past.length) {
      body = `
        <h2 class="section-title">${text.label}</h2>
        <p class="agenda-empty">${text.empty}</p>
      `;
    }

    root.innerHTML = `
      <div class="reveal visible">
        <p class="section-label">${text.label}</p>
        ${body}
      </div>
    `;
  }

  function renderAhora(data) {
    const root = document.getElementById('ahoraDynamic');
    if (!root) return;

    const items = Array.isArray(data?.ahora?.activeItems)
      ? data.ahora.activeItems
      : [];

    if (!items.length) {
      root.innerHTML = '';
      root.closest('#ahora')?.setAttribute('hidden', '');
      return;
    }

    root.closest('#ahora')?.removeAttribute('hidden');

    root.innerHTML = `
      <div class="reveal visible">
        <p class="section-label">Ahora</p>
        <div class="now-grid">
          ${items.map(item => `
            <article class="now-item">
              ${item.kicker ? `<p class="section-label">${escapeHTML(item.kicker)}</p>` : ''}
              ${item.title ? `<h2 class="section-title">${escapeHTML(item.title)}</h2>` : ''}
              ${item.text ? `<p>${escapeHTML(item.text)}</p>` : ''}
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderCuaderno(data) {
    const root = document.getElementById('cuadernoDynamic');
    if (!root) return;

    const entries = Array.isArray(data?.cuaderno?.entries)
      ? data.cuaderno.entries
      : [];

    if (!entries.length) {
      root.innerHTML = '';
      root.closest('#cuaderno')?.setAttribute('hidden', '');
      return;
    }

    root.closest('#cuaderno')?.removeAttribute('hidden');

    root.innerHTML = `
      <div class="reveal visible">
        <p class="section-label">Cuaderno</p>
        <div class="journal-grid">
          ${entries.map(entry => `
            <article class="journal-entry">
              ${entry.date ? `<p class="section-label">${escapeHTML(entry.date)}</p>` : ''}
              ${entry.title ? `<h2 class="section-title">${escapeHTML(entry.title)}</h2>` : ''}
              ${entry.text ? `<p>${escapeHTML(entry.text)}</p>` : ''}
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function renderAll() {
    if (!window.VictorContent) {
      console.error('[VictorContent] Motor no disponible.');
      return;
    }

    const data = await window.VictorContent.loadAll();
    window.VictorSiteData = data;

    renderAgenda(data);
    renderAhora(data);
    renderCuaderno(data);
  }

  window.VictorRenderer = Object.freeze({
    renderAll,
    renderAgenda
  });

  document.addEventListener('DOMContentLoaded', renderAll);

  document.addEventListener('victor:languagechange', () => {
    if (!window.VictorSiteData) return;

    renderAgenda(window.VictorSiteData);
    renderAhora(window.VictorSiteData);
    renderCuaderno(window.VictorSiteData);
  });
})();