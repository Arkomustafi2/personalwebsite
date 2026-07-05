(() => {
  // ===== CONFIG =====
  // Replace with your real backend endpoint when ready.
  // Must accept POST { message, history } and return JSON { reply }.
  const API_URL = "https://your-api-endpoint.example.com/chat";

  const BOT_NAME = "AI Assistant";
  const PRIMARY = "#4f46e5";
  const BG = "#0b1020";
  const CARD = "#121a2b";
  const TEXT = "#e6ecff";
  const MUTED = "#9fb0d8";

  // ===== STYLES (scoped, minimal collision) =====
  const style = document.createElement("style");
  style.textContent = `
    .pw-ai-btn {
      position: fixed; right: 20px; bottom: 20px; z-index: 9999;
      width: 56px; height: 56px; border: none; border-radius: 999px;
      background: ${PRIMARY}; color: white; font-size: 24px; cursor: pointer;
      box-shadow: 0 12px 28px rgba(0,0,0,.28);
    }
    .pw-ai-wrap {
      position: fixed; right: 20px; bottom: 86px; z-index: 9999;
      width: min(380px, calc(100vw - 24px)); height: min(560px, calc(100vh - 120px));
      background: ${CARD}; color: ${TEXT}; border-radius: 16px; overflow: hidden;
      display: none; flex-direction: column; box-shadow: 0 18px 45px rgba(0,0,0,.35);
      border: 1px solid rgba(255,255,255,.08);
    }
    .pw-ai-head {
      background: linear-gradient(135deg, ${PRIMARY}, #7c3aed);
      padding: 12px 14px; font-weight: 700; display: flex; justify-content: space-between; align-items: center;
    }
    .pw-ai-head button {
      background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer;
    }
    .pw-ai-messages {
      flex: 1; overflow: auto; padding: 12px; background: ${BG};
    }
    .pw-ai-msg {
      max-width: 86%; margin: 8px 0; padding: 10px 12px; border-radius: 12px; line-height: 1.35;
      white-space: pre-wrap; word-wrap: break-word; font-size: 14px;
    }
    .pw-ai-user { margin-left: auto; background: ${PRIMARY}; color: #fff; border-bottom-right-radius: 4px; }
    .pw-ai-bot  { margin-right: auto; background: #1b2740; color: ${TEXT}; border-bottom-left-radius: 4px; }
    .pw-ai-note { color: ${MUTED}; font-size: 12px; margin-top: 4px; }
    .pw-ai-input-wrap {
      display: flex; gap: 8px; padding: 10px; background: ${CARD}; border-top: 1px solid rgba(255,255,255,.08);
    }
    .pw-ai-input {
      flex: 1; border: 1px solid rgba(255,255,255,.14); border-radius: 10px;
      background: #0f172a; color: ${TEXT}; padding: 10px 12px; outline: none;
    }
    .pw-ai-send {
      border: none; border-radius: 10px; padding: 10px 12px; background: ${PRIMARY}; color: #fff; cursor: pointer; font-weight: 600;
    }
    .pw-ai-typing {
      display: inline-flex; gap: 4px; align-items: center;
    }
    .pw-ai-dot {
      width: 6px; height: 6px; border-radius: 999px; background: ${MUTED}; animation: pw-ai-b 1.2s infinite;
    }
    .pw-ai-dot:nth-child(2){ animation-delay: .15s; }
    .pw-ai-dot:nth-child(3){ animation-delay: .3s; }
    @keyframes pw-ai-b { 0%,80%,100% { transform: scale(.8); opacity: .5 } 40% { transform: scale(1.2); opacity: 1 } }
    @media (max-width: 520px) {
      .pw-ai-wrap { right: 12px; bottom: 78px; width: calc(100vw - 24px); height: 68vh; }
      .pw-ai-btn { right: 12px; bottom: 12px; }
    }
  `;
  document.head.appendChild(style);

  // ===== DOM =====
  const btn = document.createElement("button");
  btn.className = "pw-ai-btn";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = "💬";

  const wrap = document.createElement("section");
  wrap.className = "pw-ai-wrap";
  wrap.innerHTML = `
    <header class="pw-ai-head">
      <span>${BOT_NAME}</span>
      <button aria-label="Close chat">×</button>
    </header>
    <div class="pw-ai-messages" id="pw-ai-messages"></div>
    <form class="pw-ai-input-wrap" id="pw-ai-form">
      <input class="pw-ai-input" id="pw-ai-input" type="text" placeholder="Ask me anything..." autocomplete="off" />
      <button class="pw-ai-send" type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(wrap);

  const closeBtn = wrap.querySelector(".pw-ai-head button");
  const messagesEl = wrap.querySelector("#pw-ai-messages");
  const form = wrap.querySelector("#pw-ai-form");
  const input = wrap.querySelector("#pw-ai-input");

  const history = [];

  function addMessage(text, who = "bot") {
    const div = document.createElement("div");
    div.className = `pw-ai-msg ${who === "user" ? "pw-ai-user" : "pw-ai-bot"}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "pw-ai-msg pw-ai-bot";
    div.innerHTML = `<span class="pw-ai-typing"><span class="pw-ai-dot"></span><span class="pw-ai-dot"></span><span class="pw-ai-dot"></span></span>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function toggle(open) {
    wrap.style.display = open ? "flex" : "none";
    if (open) {
      if (!messagesEl.childElementCount) {
        addMessage("Hi! I’m your AI assistant. How can I help you today?");
        const note = document.createElement("div");
        note.className = "pw-ai-note";
        note.textContent = "Tip: connect API_URL in chatbot.js to enable AI responses.";
        messagesEl.appendChild(note);
      }
      input.focus();
    }
  }

  async function askAI(message) {
    const typingEl = addTyping();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data?.reply || "I received your message, but no reply text was returned.";
      typingEl.remove();
      addMessage(reply, "bot");
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      typingEl.remove();
      addMessage(
        "I’m connected, but the AI endpoint isn’t set yet. Update API_URL in chatbot.js and ensure it returns { reply }.",
        "bot"
      );
      console.error("Chatbot error:", err);
    }
  }

  btn.addEventListener("click", () => toggle(wrap.style.display !== "flex"));
  closeBtn.addEventListener("click", () => toggle(false));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage(text, "user");
    history.push({ role: "user", content: text });
    await askAI(text);
  });
})();
