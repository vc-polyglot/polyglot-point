import {esc, photo, formatDate, arrow} from './html.js';
import {publicationPhotos} from '../../assets/publication-photos.js';
import {upcomingEvents} from '../../assets/agenda-events.js';

export function agendaPreview(docs, now = Date.now()) {
  const events = upcomingEvents(docs, now, 5);
  if (!events.length) return '';
  return `<section class="wrap agenda-preview" aria-labelledby="home-agenda-title" data-agenda-carousel ${events.length > 1 ? 'aria-roledescription="carrusel"' : ''}>
    <div class="section-heading"><div><p class="eyebrow">La comunidad se encuentra</p><h2 id="home-agenda-title">Agenda</h2></div><a class="text-link" href="/agenda">Ver toda la agenda ${arrow}</a></div>
    <div class="agenda-slides">${events.map((event, index) => {
      const image = publicationPhotos(event)[0];
      const href = '/agenda/' + esc(event.id);
      return `<article class="agenda-card${image ? '' : ' agenda-card-text'}" data-agenda-slide data-event-id="${esc(event.id)}" ${index ? 'hidden' : ''} ${events.length > 1 ? `role="group" aria-roledescription="actividad" aria-label="${index + 1} de ${events.length}"` : ''}>
        ${image ? `<button type="button" class="agenda-visual" data-image="${esc(image.image)}" data-caption="${esc(event.title)}" data-photo-collection="agenda-${esc(event.id)}" data-close-on-image-click="true" aria-haspopup="dialog" aria-controls="lightbox" aria-label="Ampliar imagen de ${esc(event.title)}">${photo(image.image, image.alt || event.title, {sizes: '(max-width: 720px) calc(100vw - 40px), 55vw'})}</button>` : ''}
        <div class="agenda-copy"><p class="eyebrow">${esc(event.category || 'Próximo encuentro')}</p><time datetime="${esc(event.startsAt)}">${esc(formatDate(event.startsAt))}</time><h3><a href="${href}">${esc(event.title)}</a></h3>${event.location ? `<p class="agenda-location">${esc(event.location)}</p>` : ''}${event.summary ? `<p class="agenda-summary">${esc(event.summary)}</p>` : ''}<a class="text-link" href="${href}">Ver actividad ${arrow}</a></div>
      </article>`;
    }).join('')}</div>
    ${events.length > 1 ? `<div class="agenda-controls" data-agenda-controls hidden><div class="agenda-dots" role="group" aria-label="Elegir actividad">${events.map((event, index) => `<button class="agenda-dot" type="button" data-agenda-index="${index}" aria-label="${index + 1}. ${esc(event.title)}" ${index === 0 ? 'aria-current="true"' : ''}><span></span></button>`).join('')}</div><div class="agenda-navigation"><span class="agenda-counter" data-agenda-counter aria-hidden="true">01 / ${String(events.length).padStart(2, '0')}</span><button type="button" class="agenda-play" data-agenda-play aria-label="Pausar cambio automático" aria-pressed="false">Pausar</button><button type="button" data-agenda-prev aria-label="Actividad anterior">←</button><button type="button" data-agenda-next aria-label="Actividad siguiente">→</button></div></div><p class="agenda-status" data-agenda-status role="status" aria-live="polite" aria-atomic="true"></p>` : ''}
  </section>`;
}
