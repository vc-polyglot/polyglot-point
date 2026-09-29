var currentLang = 'es';

  // BIO SLIDESHOW
  (function() {
    const slides = document.querySelectorAll('#bioSlideshow .bio-slide');
    if (!slides.length) return;
    let cur = 0;
    setInterval(() => {
      slides[cur].classList.remove('active');
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add('active');
    }, 4000);
  })();

  // LIGHTBOX
  const galleryImgs = ['galeria/g01.jpg','galeria/g02.jpg','galeria/g03.jpg','galeria/g04.jpg','galeria/g05.jpg','galeria/g06.jpg','galeria/g07.jpg','galeria/g08.jpg','galeria/g09.jpg','galeria/g10.jpg','galeria/g11.jpg'];
  let lbIndex = 0;
  function openLightbox(i) {
    lbIndex = i;
    document.getElementById('lb-img').src = galleryImgs[i];
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }
  function lbNav(dir) {
    lbIndex = (lbIndex + dir + galleryImgs.length) % galleryImgs.length;
    document.getElementById('lb-img').src = galleryImgs[lbIndex];
  }
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target === document.getElementById('lightbox')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') lbNav(1);
    if (e.key === 'ArrowLeft') lbNav(-1);
  });

  // PARALLAX
  const parallaxEl = document.getElementById('hero-parallax');
  window.addEventListener('scroll', () => {
    if (parallaxEl) parallaxEl.style.transform = `translateY(${window.scrollY * 0.35}px)`;
  }, { passive: true });

  // LANG
  function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('#lang-bar button').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + lang).classList.add('active');
    document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('lang-active', el.dataset.lang === lang));
    const idx = ['es','en','fr','it'].indexOf(lang);
    const parents = new Set();
    document.querySelectorAll('.inline-lang').forEach(el => parents.add(el.parentElement));
    parents.forEach(p => {
      if (!p) return;
      p.querySelectorAll(':scope > .inline-lang').forEach((s, i) => s.classList.toggle('lang-active', i === idx));
    });
    document.documentElement.lang = lang;

    document.dispatchEvent(new CustomEvent('victor:languagechange', {
      detail: { lang }
    }));
  }

  // ANIMATED COUNTERS
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const duration = 1800;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(ease * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // SCROLL REVEAL
  let countersFired = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      if (e.target.id === 'counters' && !countersFired) {
        countersFired = true;
        e.target.querySelectorAll('[data-target]').forEach(animateCounter);
      }
      observer.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // CONTACT FORM
  document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.btn-send');
    btn.disabled = true; btn.style.opacity = '0.6';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.value, email: form.email.value, subject: form.subject.value, message: form.message.value, lang: currentLang, website: form.website.value })
      });
      if (res.ok) {

        form.reset();
        const success = document.getElementById('formSuccess');
        success.style.display = 'block';
        const idx = ['es','en','fr','it'].indexOf(currentLang);
        success.querySelectorAll('.inline-lang').forEach((s, i) => s.classList.toggle('lang-active', i === idx));
      
      } else {
        const error = document.getElementById('formError');
        const success = document.getElementById('formSuccess');

        if (success) success.style.display = 'none';

        if (error) {
          error.style.display = 'block';

          const idx = ['es','en','fr','it'].indexOf(currentLang);

          error.querySelectorAll('.inline-lang').forEach((s, i) => {
            s.classList.toggle('lang-active', i === idx);
          });
        }
      }
    } catch(err) { console.error(err); }
    finally { btn.disabled = false; btn.style.opacity = '1'; }
  });

/* YOUTUBE LAZY EMBEDS */

document.addEventListener('click', (event) => {
  const button = event.target.closest('.youtube-play');

  if (!button) return;

  const facade = button.closest('.youtube-facade');

  if (!facade) return;

  const src = facade.dataset.youtubeSrc;

  if (!src) return;

  const iframe = document.createElement('iframe');

  iframe.className = 'youtube-embed';
  iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
  iframe.title = facade.dataset.youtubeTitle || 'YouTube video';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;

  facade.replaceWith(iframe);
});
