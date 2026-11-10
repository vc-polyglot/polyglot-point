// The public agenda and the office use the same dates in Mexico City.
export function eventEndTime(event) {
  if (event.endsAt) return Date.parse(event.endsAt);
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start)) return NaN;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(start).map(part => [part.type, part.value]));
  return Date.parse(`${parts.year}-${parts.month}-${parts.day}T23:59:59.999-06:00`);
}

export function eventHasEnded(event, now = Date.now()) {
  const end = eventEndTime(event);
  return !Number.isFinite(end) || end < now;
}

export function upcomingEvents(documents, now = Date.now(), limit = Infinity) {
  return documents.filter(doc => doc.type === 'event' && !eventHasEnded(doc, now))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, limit);
}
