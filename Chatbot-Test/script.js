(() => {
  const WEBHOOK_URL = 'https://n8n.oi.destination.one/webhook/5f0e0dce-1ce4-4fb6-b481-ad4cea3bf2e6/chat';
  const ROUTE = 'general';

  const widget = document.getElementById('chatWidget');
  const body = document.getElementById('chatBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const toggleBtn = document.getElementById('toggleChat');

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
    body.scrollTop = body.scrollHeight;
  }

  function addMessage(text, who = 'user') {
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
        body: JSON.stringify({
          chatId: getChatId(),
          message,
          route: ROUTE
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addMessage(extractAnswer(data), 'bot');
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      addMessage(isAbort ? 'Die Anfrage hat zu lange gedauert.' : 'Gerade ist ein Fehler aufgetreten. Bitte später nochmal versuchen.', 'bot');
      console.error(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';
    sendBtn.disabled = true;

    await sendMessage(message);

    sendBtn.disabled = false;
    input.focus();
  });

  toggleBtn.addEventListener('click', () => {
    widget.classList.toggle('is-collapsed');
    const icon = toggleBtn.querySelector('.material-icons');
    icon.textContent = widget.classList.contains('is-collapsed') ? 'unfold_more' : 'unfold_less';
    if (!widget.classList.contains('is-collapsed')) {
      input.focus();
      scrollToBottom();
    }
  });

  window.addEventListener('load', () => {
    input.focus();
    scrollToBottom();
  });
})();
