export function createSelect({ id, container, placeholder, values = [], onChange, disabled = false }) {
  if (!container) return null;

  const select = document.createElement('select');
  if (id) select.id = id;
  select.disabled = disabled;

  select.appendChild(new Option(placeholder || 'Bitte wählen', ''));
  for (const value of values) {
    const option = new Option(String(value), String(value));
    select.appendChild(option);
  }

  if (typeof onChange === 'function') {
    select.addEventListener('change', () => onChange(select.value || null, select));
  }

  container.replaceChildren(select);
  return select;
}

export function setPill(pill, text, state = 'idle', options = {}) {
  if (!pill) return;
  pill.className = `pill ${state}`;

  const selector = options.textSelector ?? 'span:last-child';
  const target = selector ? pill.querySelector(selector) : null;
  if (target) {
    target.textContent = String(text || '');
  } else {
    pill.textContent = String(text || '');
  }

  return pill;
}

export function createStatusSetter(pill, options = {}) {
  return (text, state = 'idle') => setPill(pill, text, state, options);
}
