/****************************
 *  SYSTEME DE CONVERSATIONS
 ****************************/

let conversations = JSON.parse(localStorage.getItem("conversations") || "{}");
let currentConvId = null;

// Génère un ID unique
function newId() {
  return "conv_" + Math.random().toString(36).substring(2, 10);
}

// Sauvegarde globale
function save() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

// Création nouvelle conversation
function createConversation() {
  const id = newId();
  conversations[id] = {
    id,
    title: "Nouvelle conversation",
    messages: []
  };
  currentConvId = id;
  save();
  renderConversationList();
  loadConversation(id);
}

// Affichage liste conversation
function renderConversationList() {
  const list = document.getElementById("conversationList");
  list.innerHTML = "";

  for (const conv of Object.values(conversations)) {
    const div = document.createElement("div");
    div.className = "conv-item" + (conv.id === currentConvId ? " active" : "");
    div.textContent = conv.title;
    div.onclick = () => loadConversation(conv.id);
    list.appendChild(div);
  }
}

// Charger conversation dans l’UI
function loadConversation(id) {
  currentConvId = id;
  const conv = conversations[id];
  document.getElementById("convTitle").innerText = conv.title;

  const chat = document.getElementById("chat");
  chat.innerHTML = "";

  for (const msg of conv.messages) {
    addBubble(msg.content, msg.role);
  }

  renderConversationList();
}

/****************************
 *  UI CHAT
 ****************************/

const chat = document.getElementById("chat");

function addBubble(text, role) {
  const el = document.createElement("div");
  el.className = "bubble " + role;
  el.innerText = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

/****************************
 *  ENVOI MESSAGE
 ****************************/

document.getElementById("newChatBtn").addEventListener("click", () => {
  createConversation();
});

const form = document.getElementById("msgForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentConvId) createConversation();

  const conv = conversations[currentConvId];

  const input = document.getElementById("msg");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  // Ajouter message user
  addBubble(text, "user");
  conv.messages.push({ role: "user", content: text });
  conv.title = conv.messages[0]?.content.substring(0, 30) || "Conversation";
  save();
  renderConversationList();

  // Bulle assistant
  const assistantBubble = addBubble("...", "assistant");

  // Requête API
  const r = await fetch("/api/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: conv.messages,
      model: document.getElementById("modelSelect").value
    })
  });

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let finalText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const raw = line.replace("data:", "").trim();
        if (raw === "[DONE]") continue;

        try {
          const data = JSON.parse(raw);

          if (data.response) {
            finalText += data.response;
            assistantBubble.innerText = finalText;
          }

        } catch {}
      }
    }
  }

  conv.messages.push({ role: "assistant", content: finalText });
  save();
});

/****************************
 *  AU CHARGEMENT
 ****************************/

// Si aucune conversation → en créer une
if (Object.keys(conversations).length === 0) {
  createConversation();
} else {
  // Charger la première conversation existante
  const first = Object.keys(conversations)[0];
  loadConversation(first);
}
