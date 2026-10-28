(() => {
  'use strict';
  const SOURCES = Object.freeze({
    agenda: '/data/agenda.json', ahora: '/data/ahora.json', cuaderno: '/data/cuaderno.json'
  });
  const ZONE = 'America/Mexico_City';
  function calendarDay(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:ZONE, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type,part.value]));
    return values.year + '-' + values.month + '-' + values.day;
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const timestamp = Date.parse(value + 'T12:00:00Z');
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value ? value : null;
  }
  function periodEnd(event) {
    const date = validDate(event.endDate) || validDate(event.date);
    if (date) return date;
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.period || '')) {
      const [year,month] = event.period.split('-').map(Number);
      return new Date(Date.UTC(year,month,0,12)).toISOString().slice(0,10);
    }
    const year = Number(event.sortYear);
    return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year + '-12-31' : null;
  }
  function eventOrder(event) {
    return validDate(event.date) || event.period || String(event.sortYear || '');
  }
  function splitEvents(events, now = new Date()) {
    const today = calendarDay(now);
    const groups = { upcoming:[], past:[], undated:[], canceled:[] };
    for (const event of events) {
      if (['canceled','cancelled'].includes(event.status)) {
        groups.canceled.push(event);
      } else if (event.status === 'archived') {
        groups.past.push(event);
      } else {
        const end = periodEnd(event);
        if (!end) groups.undated.push(event);
        else groups[end >= today ? 'upcoming' : 'past'].push(event);
      }
    }
    groups.upcoming.sort((a,b) => eventOrder(a).localeCompare(eventOrder(b)));
    groups.past.sort((a,b) => eventOrder(b).localeCompare(eventOrder(a)));
    return groups;
  }
  function activeNowItems(items, now = new Date()) {
    const today = calendarDay(now);
    return items.filter(item => {
      const published = validDate(item.publishedAt);
      if (!published || published > today) return false;
      const expires = validDate(item.expiresAt);
      if (expires) return expires >= today;
      return (Date.parse(today + 'T12:00:00Z') - Date.parse(published + 'T12:00:00Z')) <= 120 * 86400000;
    });
  }
  async function loadJSON(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),10000);
    try {
      const response = await fetch(url, { cache:'no-cache', signal:controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } catch (error) {
      console.error('[VictorContent] Could not load ' + url + ':',error);
      return null;
    } finally { clearTimeout(timer); }
  }
  async function loadAll() {
    const [agenda,ahora,cuaderno] = await Promise.all(Object.values(SOURCES).map(loadJSON));
    return {
      agenda: Array.isArray(agenda?.events) ? { ...agenda,...splitEvents(agenda.events) } : null,
      ahora: Array.isArray(ahora?.items) ? { ...ahora,activeItems:activeNowItems(ahora.items) } : null,
      cuaderno: Array.isArray(cuaderno?.entries) ? { ...cuaderno,entries:[...cuaderno.entries].sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))) } : null
    };
  }
  window.VictorContent = Object.freeze({ SOURCES,loadAll,splitEvents,activeNowItems,calendarDay });
})();
