export const $ = (id) => document.getElementById(id);
export const q = (selector) => document.querySelector(selector);
export const qa = (selector) => Array.from(document.querySelectorAll(selector));

export function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class' || key === 'className') {
      el.className = value;
    } else if (key === 'text') {
      el.textContent = value;
    } else if (key === 'html') {
      el.innerHTML = value;
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(el.dataset, value);
    } else if (key in el && key !== 'dataset') {
      el[key] = value;
    } else {
      el.setAttribute(key, String(value));
    }
  });

  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return el;
}

export function clear(el) {
  if (el) el.textContent = '';
  return el;
}

export function setText(el, text = '') {
  if (el) el.textContent = text;
  return el;
}
