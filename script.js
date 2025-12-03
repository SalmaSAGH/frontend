const form = document.getElementById('msgForm');
const chat = document.getElementById('chat');
let history = [];

let selectedModel = document.getElementById("modelSelect").value;

document.getElementById("modelSelect").addEventListener("change", e => {
  selectedModel = e.target.value;
});

function addBubble(text, cls='user') {
  const el = document.createElement('div');
  el.className = 'bubble ' + cls;
  el.innerText = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const input = document.getElementById('msg');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addBubble(text, 'user');
  history.push({ role: "user", content: text });

  
  const assistantBubble = addBubble('', 'assistant');

  const r = await fetch('/api/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, history, model: selectedModel })

  });

  const reader = r.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');

    while (parts.length > 1) {
      const raw = parts.shift();

      const jsonLine = raw
        .split('\n')
        .find(l => l.startsWith('data:'));

      if (jsonLine) {
        const jsonStr = jsonLine.replace('data: ', '').trim();

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.response) {
            assistantBubble.innerText += parsed.response;
          }
        } catch (err) {
          console.warn("JSON chunk error:", jsonStr);
        }
      }
    }
    history.push({ role: "assistant", content: assistantBubble.innerText });

    buffer = parts[0];
    chat.scrollTop = chat.scrollHeight;
  }
});
