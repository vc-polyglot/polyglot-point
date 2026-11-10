export function setupAgendaCarousel(doc = document, win = window) {
  const root = doc.querySelector('[data-agenda-carousel]');
  if (!root) return;
  const slides = [...root.querySelectorAll('[data-agenda-slide]')];
  if (slides.length < 2) return;
  const dots = [...root.querySelectorAll('[data-agenda-index]')];
  const controls = root.querySelector('[data-agenda-controls]');
  const play = root.querySelector('[data-agenda-play]');
  const counter = root.querySelector('[data-agenda-counter]');
  const status = root.querySelector('[data-agenda-status]');
  const mobile = win.matchMedia('(max-width: 720px)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer = null, paused = false, hovered = false;
  let visible = !win.IntersectionObserver, ended = false, touch, suppressClick = false;

  function sync() {
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
    const automatic = !mobile.matches && !reduced.matches;
    play.hidden = !automatic;
    play.textContent = paused ? 'Reproducir' : 'Pausar';
    play.setAttribute('aria-label', paused ? 'Reanudar cambio automático' : 'Pausar cambio automático');
    play.setAttribute('aria-pressed', String(paused));
    const running = automatic && !paused && !hovered && visible && !doc.hidden && !ended;
    root.classList.toggle('is-playing', running);
    if (running) timer = win.setTimeout(() => show(index + 1), 8000);
  }
  function show(next, manual = false) {
    const previous = index;
    const moveFocus = manual && slides[previous].contains?.(doc.activeElement);
    index = (next + slides.length) % slides.length;
    if (manual) paused = true;
    slides.forEach((slide, i) => {slide.hidden = i !== index;});
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    if (manual) status.textContent = `Actividad ${index + 1} de ${slides.length}: ${dots[index].getAttribute('aria-label').replace(/^\d+\. /, '')}`;
    if (previous !== index && !reduced.matches) slides[index].animate?.([{opacity: 0}, {opacity: 1}], {duration: 450, easing: 'ease-out'});
    if (moveFocus) slides[index].querySelector('h3 a')?.focus({preventScroll: true});
    sync();
  }
  controls.hidden = false;
  root.querySelector('[data-agenda-prev]').addEventListener('click', () => show(index - 1, true));
  root.querySelector('[data-agenda-next]').addEventListener('click', () => show(index + 1, true));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
  play.addEventListener('click', () => {
    paused = !paused;
    // An explicit play request resumes even while the pointer is on this button.
    if (!paused) hovered = false;
    sync();
  });
  root.addEventListener('mouseenter', () => {hovered = true; sync();});
  root.addEventListener('mouseleave', () => {hovered = false; sync();});
  root.addEventListener('focusin', event => {if (event.target !== play) {paused = true; sync();}});
  root.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    show(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : index + (event.key === 'ArrowLeft' ? -1 : 1), true);
  });
  root.addEventListener('pointerdown', event => {suppressClick = false; touch = event.pointerType === 'touch' ? {x: event.clientX, y: event.clientY, id: event.pointerId} : null;});
  root.addEventListener('click', event => {if (suppressClick) {event.preventDefault(); suppressClick = false;}}, true);
  root.addEventListener('pointercancel', () => {touch = null;});
  root.addEventListener('pointerup', event => {
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {suppressClick = true; show(index + (dx < 0 ? 1 : -1), true);}
  });
  mobile.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  doc.addEventListener('visibilitychange', sync);
  win.addEventListener('pagehide', () => {ended = true; sync();});
  win.addEventListener('pageshow', () => {ended = false; sync();});
  if (win.IntersectionObserver) new win.IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, {threshold: 0.25}).observe(root);
  sync();
  return {show, pause() {paused = true; sync();}};
}
