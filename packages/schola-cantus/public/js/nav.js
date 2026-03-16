// nav.js — navegación compartida de Cantus Aeternus
// Incluir con: <script src="/js/nav.js"></script>
// El elemento <nav id="main-nav"></nav> debe existir en el HTML

(function () {
  const LANGS = [
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
  ];

  const currentLang = localStorage.getItem('ca_lang') || 'es';

  function renderNav() {
    const target = document.getElementById('main-nav');
    if (!target) return;

    const currentPath = location.pathname;

    const langOptions = LANGS.map(l => `
      <li>
        <button class="lang-option ${l.code === currentLang ? 'lang-option--active' : ''}"
          data-lang="${l.code}">${l.label}</button>
      </li>`).join('');

    const currentLabel = LANGS.find(l => l.code === currentLang)?.label || 'Español';

    target.className = 'nav';
    target.innerHTML = `
      <a href="/" class="nav__logo">Cantus Aeternus</a>
      <ul class="nav__links">
        <li><a href="/cursos"     ${currentPath.startsWith('/cursos')     ? 'class="active"' : ''}>cursos</a></li>
        <li><a href="/profesores" ${currentPath.startsWith('/profesores') ? 'class="active"' : ''}>profesores</a></li>
        <li><a href="/recursos"   ${currentPath.startsWith('/recursos')   ? 'class="active"' : ''}>recursos</a></li>
        <li class="lang-switcher">
          <button class="lang-btn" id="lang-btn" aria-label="Idioma">
            <span class="lang-btn__label" id="lang-label">${currentLabel}</span>
            <span class="lang-btn__arrow">▾</span>
          </button>
          <ul class="lang-dropdown" id="lang-dropdown">${langOptions}</ul>
        </li>
        <li><a href="#" id="nav-auth-link" class="nav__cta">entrar</a></li>
      </ul>
    `;

    // Auth
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const link = document.getElementById('nav-auth-link');
      if (d.loggedIn) { link.textContent = 'mi cuenta'; link.href = '/dashboard'; }
      else            { link.textContent = 'entrar';     link.href = '/entrar'; }
    }).catch(() => {});

    // Lang dropdown toggle
    const btn      = document.getElementById('lang-btn');
    const dropdown = document.getElementById('lang-dropdown');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('lang-dropdown--open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('lang-dropdown--open'));

    dropdown.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const lang = opt.dataset.lang;
        localStorage.setItem('ca_lang', lang);
        document.getElementById('lang-label').textContent = opt.textContent;
        dropdown.querySelectorAll('.lang-option').forEach(o => o.classList.remove('lang-option--active'));
        opt.classList.add('lang-option--active');
        dropdown.classList.remove('lang-dropdown--open');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNav);
  } else {
    renderNav();
  }
})();
