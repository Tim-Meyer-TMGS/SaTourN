import { $ } from '../lib/browser.js';

const WEBHOOK_URL = 'https://n8n.oi.destination.one/webhook/5f0e0dce-1ce4-4fb6-b481-ad4cea3bf2e6/chat';
const ROUTE = 'general';

let widget;
let body;
let form;
let input;
let sendBtn;
let toggleBtn;

function getChatId() {
  let chatId = sessionStorage.getItem('chatId');
  if (!chatId) {
    const randomPart = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    chatId = `chat_${randomPart}`;
    sessionStorage.setItem('chatId', chatId);
  }
  return chatId;
}

function scrollToBottom() {
  if (!body) return;
  body.scrollTop = body.scrollHeight;
}

function addMessage(text, who = 'user') {
  if (!body) return;
  const message = document.createElement('div');
  message.className = `msg ${who === 'user' ? 'msg-user' : 'msg-bot'}`;
  message.textContent = text;
  body.appendChild(message);
  scrollToBottom();
  return message;
}

function extractAnswer(data) {
  if (typeof data === 'string') return data;
  return data?.output || data?.answer || data?.message || 'Sorry, das habe ich nicht verstanden.';
}

async function sendMessage(message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ chatId: getChatId(), message, route: ROUTE }),
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    addMessage(extractAnswer(data), 'bot');
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    addMessage(
      isAbort
        ? 'Die Anfrage hat zu lange gedauert.'
        : 'Gerade ist ein Fehler aufgetreten. Bitte später nochmal versuchen.',
      'bot'
    );
    console.error(error);
  } finally {
    clearTimeout(timeout);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  input.value = '';
  sendBtn.disabled = true;

  sendMessage(message).finally(() => {
    sendBtn.disabled = false;
    input.focus();
  });
}

function handleToggle() {
  if (!widget || !toggleBtn) return;
  widget.classList.toggle('is-collapsed');
  const icon = toggleBtn.querySelector('.material-icons');
  icon.textContent = widget.classList.contains('is-collapsed') ? 'unfold_more' : 'unfold_less';
  if (!widget.classList.contains('is-collapsed')) {
    input.focus();
    scrollToBottom();
  }
}

function init() {
  widget = $('chatWidget');
  body = $('chatBody');
  form = $('chatForm');
  input = $('chatInput');
  sendBtn = $('sendBtn');
  toggleBtn = $('toggleChat');

  if (!widget || !body || !form || !input || !sendBtn || !toggleBtn) return;

  form.addEventListener('submit', handleSubmit);
  toggleBtn.addEventListener('click', handleToggle);

  window.addEventListener('load', () => {
    input.focus();
    scrollToBottom();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
