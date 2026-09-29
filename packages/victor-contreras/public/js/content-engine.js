(() => {
  'use strict';

  const SOURCES = Object.freeze({
    agenda: '/data/agenda.json',
    ahora: '/data/ahora.json',
    cuaderno: '/data/cuaderno.json'
  });

  async function loadJSON(url, fallback) {
    try {
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[VictorContent] No se pudo cargar ${url}:`, error);
      return fallback;
    }
  }

  function normalizeAgenda(data) {
    const events = Array.isArray(data?.events) ? data.events : [];

    return {
      updatedAt: data?.updatedAt || null,
      events: events.map((event, index) => ({
        id: event.id || `event-${index + 1}`,
        date: event.date || null,
        endDate: event.endDate || null,
        dateLabel: event.dateLabel || null,
        title: event.title || '',
        place: event.place || '',
        city: event.city || '',
        country: event.country || '',
        role: event.role || '',
        url: event.url || null,
        status: event.status || 'confirmed'
      }))
    };
  }

  function normalizeAhora(data) {
    const items = Array.isArray(data?.items) ? data.items : [];

    return {
      updatedAt: data?.updatedAt || null,
      items: items.map((item, index) => ({
        id: item.id || `now-${index + 1}`,
        kicker: item.kicker || '',
        title: item.title || '',
        text: item.text || '',
        publishedAt: item.publishedAt || null,
        expiresAt: item.expiresAt || null
      }))
    };
  }

  function parseDate(value) {
    if (!value) return null;

    const timestamp = Date.parse(`${value}T23:59:59`);

    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function activeNowItems(items, now = new Date()) {
    const current = now.getTime();
    const maxAge = 120 * 24 * 60 * 60 * 1000;

    return items.filter(item => {
      const expires = parseDate(item.expiresAt);

      if (expires !== null) {
        return expires >= current;
      }

      const published = parseDate(item.publishedAt);

      if (published === null) {
        return false;
      }

      return (published + maxAge) >= current;
    });
  }

  function normalizeCuaderno(data) {
    return {
      updatedAt: data?.updatedAt || null,
      entries: Array.isArray(data?.entries) ? data.entries : []
    };
  }

  function eventTimestamp(event) {
    if (!event.date) return null;

    const timestamp = Date.parse(`${event.date}T23:59:59`);

    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function splitEvents(events, now = new Date()) {
    const current = now.getTime();
    const upcoming = [];
    const past = [];
    const undated = [];

    for (const event of events) {
      const timestamp = eventTimestamp(event);

      if (timestamp === null) {
        undated.push(event);
      } else if (timestamp >= current) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }

    upcoming.sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
    past.sort((a, b) => eventTimestamp(b) - eventTimestamp(a));

    return { upcoming, past, undated };
  }

  async function loadAll() {
    const [agendaRaw, ahoraRaw, cuadernoRaw] = await Promise.all([
      loadJSON(SOURCES.agenda, { updatedAt: null, events: [] }),
      loadJSON(SOURCES.ahora, { updatedAt: null, items: [] }),
      loadJSON(SOURCES.cuaderno, { updatedAt: null, entries: [] })
    ]);

    const agenda = normalizeAgenda(agendaRaw);

    return {
      agenda: {
        ...agenda,
        ...splitEvents(agenda.events)
      },
      ahora: (() => {
        const normalized = normalizeAhora(ahoraRaw);

        return {
          ...normalized,
          activeItems: activeNowItems(normalized.items)
        };
      })(),
      cuaderno: normalizeCuaderno(cuadernoRaw)
    };
  }

  window.VictorContent = Object.freeze({
    SOURCES,
    loadAll,
    splitEvents
  });
})();