export function setupPasswordToggle(root = document) {
  const input = root.querySelector('#login-password');
  const button = root.querySelector('#toggle-password');
  if (!input || !button) return;
  const slash = button.querySelector('[data-eye-slash]');
  button.hidden = false;
  button.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    const label = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', label);
    button.title = label;
    if (slash) slash.hidden = !visible;
  });
}
