/**
 * =============================================================================
 * ITQAN STORE — AI BUILD ASSISTANT (chat.js)
 * =============================================================================
 * Floating chat widget powered by Google Gemini (gemini-2.0-flash, free tier)
 * via direct REST fetch — no SDK, no backend. Fully bilingual (ar/en): UI
 * strings come from i18n.js via window.ItqanApp, and the system prompt tells
 * the model which language to reply in.
 *
 * API key policy: NEVER hardcoded. The user pastes their own key on first
 * open; it is stored ONLY in localStorage ("change key" any time).
 *
 * The full store inventory (from data.js) is injected into the system prompt
 * of every call. Complete-build proposals arrive as a machine-readable JSON
 * block, get validated against the compatibility engine, and render as an
 * "apply this build" card.
 * =============================================================================
 */
(function () {
  'use strict';

  const GEMINI_MODEL = 'gemini-2.0-flash';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const KEY_STORAGE = 'itqan-gemini-key';
  const MAX_HISTORY = 12;

  /* ---------------------------------------------------------------- state */
  let history = [];        // [{role:'user'|'model', text}]
  let busy = false;
  let screen = 'none';     // 'none' | 'setup' | 'chat'

  /* ------------------------------------------------------------------ DOM */
  const $ = (sel) => document.querySelector(sel);
  let els = {};

  function cacheDom() {
    els = {
      toggle: $('#chatToggle'),
      panel: $('#chatPanel'),
      close: $('#chatClose'),
      settings: $('#chatSettings'),
      messages: $('#chatMessages'),
      form: $('#chatForm'),
      input: $('#chatInput'),
      send: $('#chatSend'),
    };
  }

  /* i18n shortcuts (ItqanApp is set up before chat's DOMContentLoaded runs) */
  const L = (k) => window.ItqanApp.L(k);
  const fmt = (k, p) => window.ItqanApp.fmt(k, p);
  const fmtSAR = (n) => window.ItqanApp.fmtSAR(n);
  const getLang = () => window.ItqanApp.getLang();

  function esc(str) {
    return String(str)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  /* ======================================================================
   * SYSTEM PROMPT — inventory injected on EVERY call
   * ==================================================================== */

  /** Compact inventory (ids + specs only) to keep the prompt lean. */
  function compactInventory(db) {
    const pick = {
      cpu: (p) => ({ id: p.id, name: p.name, price: p.price, socket: p.socket, tdpWatts: p.tdpWatts, integratedGraphics: p.integratedGraphics }),
      motherboard: (p) => ({ id: p.id, name: p.name, price: p.price, socket: p.socket, ramType: p.ramType, formFactor: p.formFactor }),
      gpu: (p) => ({ id: p.id, name: p.name, price: p.price, powerDraw: p.powerDraw, recommendedPSU: p.recommendedPSU }),
      ram: (p) => ({ id: p.id, name: p.name, price: p.price, type: p.type, capacity: p.capacity, speed: p.speed }),
      storage: (p) => ({ id: p.id, name: p.name, price: p.price, type: p.type, capacity: p.capacity }),
      psu: (p) => ({ id: p.id, name: p.name, price: p.price, wattage: p.wattage, rating: p.rating }),
      case: (p) => ({ id: p.id, name: p.name, price: p.price, formFactorSupport: p.formFactorSupport }),
      cooler: (p) => ({ id: p.id, name: p.name, price: p.price, tdpSupport: p.tdpSupport }),
    };
    const out = {};
    for (const cat of Object.keys(db)) out[cat] = db[cat].map(pick[cat]);
    return out;
  }

  function buildSystemPrompt() {
    const db = window.ItqanApp.getDb();
    const inventory = JSON.stringify(compactInventory(db));
    const replyLang = getLang() === 'en'
      ? 'Reply in English.'
      : 'أجب باللغة العربية دائمًا.';
    return [
      'أنت «مساعد اتقان» — خبير تجميع أجهزة كمبيوتر في متجر اتقان السعودي. أسلوبك ودود ومحترف وموجز. ' + replyLang,
      '',
      'قواعد صارمة لا يجوز كسرها:',
      '1) رشِّح القطع حصريًا من مخزون المتجر المرفق أدناه، ولا تذكر أي منتج خارجه أبدًا.',
      '2) إذا لم تعرف بعد: الميزانية بالريال، الاستخدام (ألعاب/مونتاج/مكتبي)، والدقة المستهدفة (1080p/1440p/4K) — فاسأل عنها أولًا (سؤال واحد قصير في كل رسالة).',
      '3) تحقق من التوافق قبل أي ترشيح: سوكِت المعالج يطابق اللوحة، نوع الذاكرة يطابق اللوحة، وقدرة المزود ≥ (استهلاك المعالج + كرت الشاشة + 100 واط) × 1.2، والصندوق يدعم مقاس اللوحة، والمبرد يغطي حرارة المعالج.',
      '4) عند اقتراح تجميعة كاملة: اذكر لكل قطعة سطرًا واحدًا (الاسم — السعر — مبرر قصير)، ثم الإجمالي بالريال، ثم أنهِ رسالتك بكتلة JSON بهذا الشكل حرفيًا:',
      '```json',
      '{"build": {"cpu": "id", "motherboard": "id", "gpu": "id", "ram": "id", "storage": "id", "psu": "id", "case": "id", "cooler": "id"}}',
      '```',
      '5) استخدم قيم id الحقيقية من المخزون فقط داخل كتلة JSON.',
      '6) الأسعار كلها بالريال السعودي (SAR).',
      '',
      `مخزون المتجر الحالي (JSON): ${inventory}`,
    ].join('\n');
  }

  /* ======================================================================
   * KEY MANAGEMENT
   * ==================================================================== */

  const getKey = () => localStorage.getItem(KEY_STORAGE) || '';

  function renderKeySetup(isChange) {
    screen = 'setup';
    els.messages.innerHTML = `
      <div class="chat-setup">
        <p class="chat-setup__title">${isChange ? L('chat.setupChangeTitle') : L('chat.setupTitle')}</p>
        <p class="chat-setup__text">
          ${L('chat.setupText')}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>.
        </p>
        <form class="chat-setup__form" id="chatKeyForm">
          <label class="sr-only" for="chatKeyInput">${L('chat.keyLabel')}</label>
          <input id="chatKeyInput" type="password" dir="ltr" autocomplete="off"
                 placeholder="AIza..." required>
          <button type="submit" class="btn btn--primary btn--small">${L('chat.saveKey')}</button>
        </form>
      </div>`;

    $('#chatKeyForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = $('#chatKeyInput').value.trim();
      if (!val) return;
      localStorage.setItem(KEY_STORAGE, val);
      history = [];
      renderWelcome();
    });
    $('#chatKeyInput').focus();
    setFormEnabled(false);
  }

  /* ======================================================================
   * MESSAGE RENDERING
   * ==================================================================== */

  function setFormEnabled(on) {
    els.input.disabled = !on;
    els.send.disabled = !on;
  }

  function scrollToBottom() {
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function appendBubble(role, html) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.innerHTML = html;
    els.messages.appendChild(div);
    scrollToBottom();
    return div;
  }

  /** Tiny markdown-ish formatter: **bold**, bullets, line breaks. */
  function formatModelText(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-•]\s?(.+)$/gm, '<span class="chat-bullet">$1</span>')
      .replace(/\n/g, '<br>');
  }

  function renderWelcome() {
    screen = 'chat';
    els.messages.innerHTML = '';
    appendBubble('model', `${L('chat.welcome1')}<br>${L('chat.welcome2')}`);

    const chips = document.createElement('div');
    chips.className = 'chat-chips';
    [L('chat.chip1'), L('chat.chip2')].forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat-chip';
      b.textContent = q;
      b.addEventListener('click', () => sendMessage(q));
      chips.appendChild(b);
    });
    els.messages.appendChild(chips);
    setFormEnabled(true);
    els.input.focus();
  }

  /* ======================================================================
   * BUILD PARSING & APPLY CARD
   * ==================================================================== */

  /** Extract a {"build": {...}} JSON block from the model reply. */
  function extractBuild(text) {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (!match) return { cleanText: text, build: null };
    let build = null;
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed.build === 'object' && parsed.build !== null) build = parsed.build;
    } catch { /* malformed JSON from the model — just show the text */ }
    return { cleanText: text.replace(match[0], '').trim(), build };
  }

  /** Validate a proposed build against inventory + compatibility engine. */
  function renderBuildCard(build) {
    const db = window.ItqanApp.getDb();
    const resolved = {};
    let total = 0;

    for (const cat of CATEGORY_ORDER) {
      const id = build[cat];
      if (!id) continue;
      const part = (db[cat] || []).find((p) => p.id === id);
      if (part) { resolved[cat] = part; total += part.price; }
    }
    const count = Object.keys(resolved).length;
    if (count === 0) return; // hallucinated ids — skip the card silently

    const summary = Compat.buildSummary(resolved, CATEGORY_ORDER);
    const ok = summary.status === 'ok';

    const card = document.createElement('div');
    card.className = 'chat-build-card';
    card.innerHTML = `
      <p class="chat-build-card__title">${esc(fmt('chat.buildTitle', { a: count, b: fmtSAR(total) }))}</p>
      <p class="chat-build-card__status" data-status="${ok ? 'ok' : 'warn'}">
        ${ok ? esc(L('chat.buildOk')) : esc(fmt('chat.buildWarn', { a: fmt(summary.msgCode, summary.msgParams) }))}
      </p>
      <button type="button" class="btn btn--primary chat-build-card__apply">${esc(L('chat.apply'))}</button>`;

    card.querySelector('.chat-build-card__apply').addEventListener('click', () => {
      window.ItqanApp.applyBuild(build);
      closeChat();
    });
    els.messages.appendChild(card);
    scrollToBottom();
  }

  /* ======================================================================
   * GEMINI REST CALL
   * ==================================================================== */

  function friendlyError(status) {
    if (status === 400 || status === 403) return L('chat.errKey');
    if (status === 429) return L('chat.errQuota');
    if (status === 0) return L('chat.errNet');
    return L('chat.errGeneric');
  }

  async function callGemini() {
    const body = {
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: history.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    };

    let res;
    try {
      res = await fetch(`${API_URL}?key=${encodeURIComponent(getKey())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(friendlyError(0)); // network failure
    }

    if (!res.ok) throw new Error(friendlyError(res.status));

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '').join('').trim();
    if (!text) throw new Error(L('chat.errEmpty'));
    return text;
  }

  /* ======================================================================
   * SEND FLOW
   * ==================================================================== */

  async function sendMessage(text) {
    if (busy || !text.trim()) return;
    busy = true;
    setFormEnabled(false);

    const chips = els.messages.querySelector('.chat-chips');
    if (chips) chips.remove();

    history.push({ role: 'user', text: text.trim() });
    appendBubble('user', esc(text.trim()));
    els.input.value = '';

    const typing = appendBubble('model',
      `<span class="chat-typing" aria-label="${esc(L('chat.typing'))}"><i></i><i></i><i></i></span>`);

    try {
      const reply = await callGemini();
      history.push({ role: 'model', text: reply });

      const { cleanText, build } = extractBuild(reply);
      typing.innerHTML = formatModelText(cleanText || L('chat.fallback'));
      if (build) renderBuildCard(build);
    } catch (err) {
      typing.classList.add('chat-msg--error');
      typing.innerHTML = esc(err.message);
    } finally {
      busy = false;
      setFormEnabled(true);
      els.input.focus();
      scrollToBottom();
    }
  }

  /* ======================================================================
   * OPEN / CLOSE
   * ==================================================================== */

  function openChat() {
    els.panel.classList.add('is-open');
    els.toggle.setAttribute('aria-expanded', 'true');
    if (!getKey()) {
      renderKeySetup(false);
    } else if (history.length === 0 && screen !== 'chat') {
      renderWelcome();
    } else {
      els.input.focus();
    }
  }

  function closeChat() {
    els.panel.classList.remove('is-open');
    els.toggle.setAttribute('aria-expanded', 'false');
    els.toggle.focus();
  }

  /* ======================================================================
   * BOOT
   * ==================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();

    els.toggle.addEventListener('click', () => {
      els.panel.classList.contains('is-open') ? closeChat() : openChat();
    });
    els.close.addEventListener('click', closeChat);
    els.settings.addEventListener('click', () => renderKeySetup(true));

    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(els.input.value);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.panel.classList.contains('is-open')) closeChat();
    });

    // When the site language flips, refresh setup/welcome screens (only if
    // no conversation is in progress — past messages keep their language).
    document.addEventListener('itqan:lang', () => {
      if (screen === 'setup') renderKeySetup(false);
      else if (screen === 'chat' && history.length === 0) renderWelcome();
    });
  });
})();
