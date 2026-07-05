/**
 * =============================================================================
 * ITQAN STORE — APP / UI LAYER (app.js)
 * =============================================================================
 * Responsibilities: theme + language handling, scroll-reveal motion, builder
 * rendering, selection state, incompatibility explanations, cart panel,
 * WhatsApp export, toasts.
 *
 * Data comes ONLY from data.js -> getParts().
 * Compatibility logic comes ONLY from compat.js -> window.Compat
 * (language-agnostic {code, params} reasons, formatted here via i18n.js).
 * =============================================================================
 */
(function () {
  'use strict';

  /* ======================================================================
   * CONFIG
   * ==================================================================== */

  // رقم واتساب المتجر يُدار من لوحة التحكم admin.html (قسم إعدادات المتجر)
  // ويُقرأ من settings.js — القيمة هنا مجرد احتياط أخير.
  const WHATSAPP_PHONE =
    (globalThis.ITQAN_SETTINGS && globalThis.ITQAN_SETTINGS.whatsappPhone) || '9665XXXXXXXX';

  const THEME_STORAGE_KEY = 'itqan-theme';   // 'dark' (default) | 'light'
  const LANG_STORAGE_KEY = 'itqan-lang';     // 'ar' (default)   | 'en'

  /* ======================================================================
   * STATE
   * ==================================================================== */

  let db = null;
  let selection = {};
  let activeCategory = 'cpu';
  let openReasonId = null;
  let toastTimer = null;
  let lang = 'ar';

  /* ======================================================================
   * DOM SHORTCUTS
   * ==================================================================== */

  const $ = (sel) => document.querySelector(sel);
  const els = {};

  function cacheDom() {
    els.themeToggle = $('#themeToggle');
    els.langToggle = $('#langToggle');
    els.cartToggle = $('#cartToggle');
    els.cartCount = $('#cartCount');
    els.statusBar = $('#statusBar');
    els.categoryNav = $('#categoryNav');
    els.partsHeading = $('#partsHeading');
    els.partsGrid = $('#partsGrid');
    els.cartPanel = $('#cartPanel');
    els.cartOverlay = $('#cartOverlay');
    els.cartClose = $('#cartClose');
    els.cartItems = $('#cartItems');
    els.cartTotalRow = $('#cartTotalRow');
    els.cartTotal = $('#cartTotal');
    els.cartCompat = $('#cartCompat');
    els.exportBtn = $('#exportBtn');
    els.toast = $('#toast');
  }

  /* ======================================================================
   * I18N HELPERS
   * ==================================================================== */

  /** Raw string lookup in the active language. */
  function L(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.ar[key] || key;
  }

  /** Template lookup: replaces {a} {b} {c} {name} {price} placeholders. */
  function fmt(key, params = {}) {
    let out = L(key);
    for (const [k, v] of Object.entries(params)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
    return out;
  }

  /** Bilingual category label. */
  const catLabel = (cat) => CATEGORY_META[cat].label[lang] || CATEGORY_META[cat].label.ar;

  const nfmt = () => new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en', { maximumFractionDigits: 0 });

  /** Format a number as localized currency ("1,234 ر.س" / "SAR 1,234"). */
  function fmtSAR(n) {
    return fmt('currency', { a: nfmt().format(n) });
  }

  /** Escape a string for safe interpolation into innerHTML templates. */
  function esc(str) {
    return String(str)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  /** Format an engine reason {code, params} in the active language. */
  function reasonText(reason) {
    return fmt(`r.${reason.code}`, reason.params);
  }

  /* ======================================================================
   * LANGUAGE
   * ==================================================================== */

  /** Translate all static DOM nodes + flip document direction. */
  function applyLang(next) {
    lang = next;
    const dict = I18N[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = dict.dir;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = L(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = L(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', L(el.dataset.i18nAria));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.setAttribute('placeholder', L(el.dataset.i18nPh));
    });

    els.langToggle.textContent = L('lang.switch');
    els.langToggle.setAttribute('aria-label', L('lang.switchAria'));
    syncThemeAria();

    if (db) renderAll();
    // Let the chat widget refresh its own dynamic screens.
    document.dispatchEvent(new CustomEvent('itqan:lang', { detail: { lang } }));
  }

  function initLang() {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    applyLang(saved === 'en' ? 'en' : 'ar');
  }

  function toggleLang() {
    const next = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem(LANG_STORAGE_KEY, next);
    applyLang(next);
  }

  /* ======================================================================
   * THEME (warm white is the flagship default; espresso dark via toggle)
   * ==================================================================== */

  function syncThemeAria() {
    const isLight = document.documentElement.dataset.theme === 'light';
    els.themeToggle.setAttribute('aria-pressed', String(!isLight));
    els.themeToggle.setAttribute('aria-label', isLight ? L('theme.toDark') : L('theme.toLight'));
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    syncThemeAria();
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(saved === 'dark' ? 'dark' : 'light');
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }

  /* ======================================================================
   * SCROLL REVEAL (IntersectionObserver — transform/opacity only)
   * ==================================================================== */

  function initReveal() {
    const nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach((n) => io.observe(n));
  }

  /* ======================================================================
   * SMALL UI HELPERS
   * ==================================================================== */

  /** Spec chips per category, localized. */
  function specChips(category, p) {
    switch (category) {
      case 'cpu':
        return [p.socket, fmt('chip.watts', { a: p.tdpWatts }), p.integratedGraphics ? L('chip.igpu') : L('chip.noIgpu')];
      case 'motherboard':
        return [p.socket, p.ramType, p.formFactor];
      case 'gpu':
        return [fmt('chip.watts', { a: p.powerDraw }), fmt('chip.recPsu', { a: p.recommendedPSU })];
      case 'ram':
        return [p.type, p.capacity, p.speed];
      case 'storage':
        return [p.type, p.capacity];
      case 'psu':
        return [fmt('chip.watts', { a: p.wattage }), fmt('chip.rating', { a: p.rating })];
      case 'case':
        return [fmt('chip.supports', { a: p.formFactorSupport.join(' / ') })];
      case 'cooler':
        return [fmt('chip.upTo', { a: p.tdpSupport })];
      default:
        return [];
    }
  }

  function showToast(text) {
    clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.classList.add('is-visible');
    toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
  }

  /* ======================================================================
   * RENDER — CATEGORY RAIL
   * ==================================================================== */

  function renderCategoryNav() {
    els.categoryNav.innerHTML = CATEGORY_ORDER.map((cat, i) => {
      const part = selection[cat];
      const isActive = cat === activeCategory;
      const conflicted = part && !Compat.evaluatePart(part, cat, selection).compatible;

      const stateClass = [
        'cat-item',
        isActive ? 'is-active' : '',
        part ? 'has-selection' : '',
        conflicted ? 'has-conflict' : '',
      ].join(' ').trim();

      const sub = part
        ? `<span class="cat-item__part">${esc(part.name)}</span>
           <span class="cat-item__price">${fmtSAR(part.price)}</span>`
        : `<span class="cat-item__part cat-item__part--empty">${L('builder.pick')}</span>`;

      const idx = String(i + 1).padStart(2, '0');
      const stateIcon = conflicted
        ? '<span class="cat-item__state cat-item__state--conflict" aria-hidden="true">!</span>'
        : part
          ? '<span class="cat-item__state cat-item__state--done" aria-hidden="true"><svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 6.5 4.8 9 10 3.5"/></svg></span>'
          : `<span class="cat-item__state" aria-hidden="true">${idx}</span>`;

      return `
        <button type="button" class="${stateClass}" data-cat="${cat}"
                aria-current="${isActive ? 'true' : 'false'}">
          ${stateIcon}
          <span class="cat-item__body">
            <span class="cat-item__label">${esc(catLabel(cat))}</span>
            ${sub}
          </span>
        </button>`;
    }).join('');
  }

  /* ======================================================================
   * RENDER — PARTS GRID
   * ==================================================================== */

  function renderPartsGrid() {
    const parts = db[activeCategory];
    const results = Compat.evaluateCategory(parts, activeCategory, selection);

    els.partsHeading.textContent = catLabel(activeCategory);

    els.partsGrid.innerHTML = parts.map((part, i) => {
      const res = results.get(part.id);
      const isSelected = selection[activeCategory] && selection[activeCategory].id === part.id;
      const chips = specChips(activeCategory, part)
        .map((c) => `<span class="chip">${esc(c)}</span>`).join('');

      const cardClass = [
        'part-card',
        isSelected ? 'is-selected' : '',
        !res.compatible ? 'is-incompatible' : '',
      ].join(' ').trim();

      const badge = !res.compatible
        ? `<span class="part-card__badge" aria-hidden="true">${L('card.incompatible')}</span>`
        : isSelected
          ? `<span class="part-card__badge part-card__badge--selected" aria-hidden="true">✓ ${L('card.selected')}</span>`
          : '';

      const ariaKey = !res.compatible ? 'card.ariaIncompatible' : isSelected ? 'card.ariaSelected' : 'card.ariaPick';
      const aria = fmt(ariaKey, { name: part.name, price: fmtSAR(part.price) });

      const reasonPanel = (openReasonId === part.id && !res.compatible)
        ? renderReasonPanel(part, res)
        : '';

      return `
        <article class="${cardClass}" style="--i:${i}">
          <button type="button" class="part-card__btn" data-part="${part.id}"
                  aria-expanded="${openReasonId === part.id ? 'true' : 'false'}"
                  aria-label="${esc(aria)}">
            <span class="part-card__media">
              <img src="${esc(part.image)}" alt="" loading="lazy" width="400" height="300"
                   onerror="this.onerror=null;this.src='${esc(CATEGORY_META[activeCategory].icon)}'">
              ${badge}
            </span>
            <span class="part-card__info">
              <span class="part-card__name">${esc(part.name)}</span>
              <span class="part-card__blurb">${esc(part.blurb[lang] || part.blurb.ar)}</span>
              <span class="part-card__chips">${chips}</span>
              <span class="part-card__price">${fmtSAR(part.price)}</span>
            </span>
          </button>
        </article>
        ${reasonPanel}`;
    }).join('');

    if (openReasonId) {
      const panel = els.partsGrid.querySelector('.reason-panel');
      if (panel) panel.focus();
    }
  }

  /** Inline "why incompatible?" panel: localized reasons + one-click swaps. */
  function renderReasonPanel(part, res) {
    const alts = Compat.suggestAlternatives(db[activeCategory], part, activeCategory, selection, 2);

    const reasonList = res.reasons
      .map((r) => `<li>${esc(reasonText(r))}</li>`).join('');

    const altsHtml = alts.length
      ? `<p class="reason-panel__alt-title">${L('reason.alts')}</p>
         <div class="reason-panel__alts">
           ${alts.map((a) => `
             <div class="alt-card">
               <div class="alt-card__info">
                 <span class="alt-card__name">${esc(a.name)}</span>
                 <span class="alt-card__price">${fmtSAR(a.price)}</span>
               </div>
               <button type="button" class="btn btn--small btn--primary" data-replace="${a.id}">
                 ${L('reason.replace')}
               </button>
             </div>`).join('')}
         </div>`
      : `<p class="reason-panel__alt-title">${L('reason.noAlts')}</p>`;

    return `
      <div class="reason-panel" tabindex="-1" role="region" aria-label="${esc(L('reason.region'))}">
        <div class="reason-panel__head">
          <strong>${esc(fmt('reason.title', { name: part.name }))}</strong>
          <button type="button" class="reason-panel__close" data-close-reason aria-label="${esc(L('reason.close'))}">✕</button>
        </div>
        <ul class="reason-panel__list">${reasonList}</ul>
        ${altsHtml}
      </div>`;
  }

  /* ======================================================================
   * RENDER — STATUS BAR (with 8-segment build progress)
   * ==================================================================== */

  function renderStatusBar() {
    const s = Compat.buildSummary(selection, CATEGORY_ORDER);
    const conflictCats = new Set(s.conflicts.map((c) => c.category));

    const segments = CATEGORY_ORDER.map((cat) => {
      const cls = conflictCats.has(cat) ? 'is-bad' : selection[cat] ? 'is-on' : '';
      return `<i class="${cls}"></i>`;
    }).join('');

    const icons = {
      empty: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7" stroke-dasharray="3 3"/></svg>',
      ok: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M6.5 10.5 9 13l4.5-5.5"/></svg>',
      warning: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 3 2.5 16h15Z" stroke-linejoin="round"/><path d="M10 8.5v3.5M10 14.5v.1"/></svg>',
      conflict: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M7.5 7.5l5 5M12.5 7.5l-5 5"/></svg>',
    };

    els.statusBar.dataset.status = s.status;
    els.statusBar.innerHTML = `
      <span class="status-bar__icon" aria-hidden="true">${icons[s.status]}</span>
      <span class="status-bar__msg">${esc(fmt(s.msgCode, s.msgParams))}</span>
      <span class="status-bar__meta">
        <span class="status-bar__segments" aria-hidden="true">${segments}</span>
        <span class="status-bar__count">${s.selectedCount}/${s.totalCategories}</span>
        ${s.totalPrice ? `<span class="status-bar__total">${fmtSAR(s.totalPrice)}</span>` : ''}
      </span>`;
  }

  /* ======================================================================
   * RENDER — CART
   * ==================================================================== */

  function renderCart() {
    const s = Compat.buildSummary(selection, CATEGORY_ORDER);
    const chosen = CATEGORY_ORDER.filter((c) => selection[c]);

    els.cartCount.textContent = String(chosen.length);
    els.cartCount.hidden = chosen.length === 0;

    if (chosen.length === 0) {
      els.cartItems.innerHTML = `
        <li class="cart-empty">
          <p>${L('cart.empty')}</p>
          <p class="cart-empty__hint">${L('cart.emptyHint')}</p>
        </li>`;
    } else {
      els.cartItems.innerHTML = chosen.map((cat) => {
        const p = selection[cat];
        return `
          <li class="cart-item">
            <span class="cart-item__cat">${esc(catLabel(cat))}</span>
            <span class="cart-item__name">${esc(p.name)}</span>
            <span class="cart-item__price">${fmtSAR(p.price)}</span>
            <button type="button" class="cart-item__remove" data-remove="${cat}"
                    aria-label="${esc(fmt('cart.remove', { name: p.name }))}">✕</button>
          </li>`;
      }).join('');
    }

    els.cartTotalRow.hidden = chosen.length === 0;
    els.cartTotal.textContent = fmtSAR(s.totalPrice);

    const compatLine = {
      empty: '',
      ok: L('cart.ok'),
      warning: `⚠ ${fmt(s.msgCode, s.msgParams)}`,
      conflict: `✕ ${fmt(s.msgCode, s.msgParams)}`,
    }[s.status];
    els.cartCompat.textContent = compatLine;
    els.cartCompat.dataset.status = s.status;

    els.exportBtn.disabled = chosen.length === 0 || s.status === 'conflict';
  }

  function renderAll() {
    renderCategoryNav();
    renderPartsGrid();
    renderStatusBar();
    renderCart();
  }

  /* ======================================================================
   * ACTIONS
   * ==================================================================== */

  function selectPart(part) {
    selection[activeCategory] = part;
    openReasonId = null;

    const next = CATEGORY_ORDER.find((c) => !selection[c]);
    const label = catLabel(activeCategory);
    if (next && next !== activeCategory) {
      activeCategory = next;
      showToast(fmt('toast.picked', { a: label, b: catLabel(next) }));
    } else {
      showToast(fmt('toast.pickedLast', { a: label }));
    }
    renderAll();
  }

  function deselectPart(cat) {
    delete selection[cat];
    openReasonId = null;
    renderAll();
  }

  function onCardClick(partId) {
    const part = db[activeCategory].find((p) => p.id === partId);
    if (!part) return;

    const res = Compat.evaluatePart(part, activeCategory, selection);

    if (!res.compatible) {
      openReasonId = openReasonId === partId ? null : partId;
      renderPartsGrid();
      return;
    }

    if (selection[activeCategory] && selection[activeCategory].id === partId) {
      deselectPart(activeCategory);
    } else {
      selectPart(part);
    }
  }

  function onReplace(partId) {
    const part = db[activeCategory].find((p) => p.id === partId);
    if (!part) return;
    selectPart(part);
  }

  /* ======================================================================
   * CART PANEL OPEN/CLOSE
   * ==================================================================== */

  function openCart() {
    els.cartPanel.classList.add('is-open');
    els.cartOverlay.classList.add('is-visible');
    els.cartToggle.setAttribute('aria-expanded', 'true');
    els.cartClose.focus();
  }

  function closeCart() {
    els.cartPanel.classList.remove('is-open');
    els.cartOverlay.classList.remove('is-visible');
    els.cartToggle.setAttribute('aria-expanded', 'false');
    els.cartToggle.focus();
  }

  /* ======================================================================
   * WHATSAPP EXPORT
   * ==================================================================== */

  function buildWhatsAppMessage() {
    const s = Compat.buildSummary(selection, CATEGORY_ORDER);
    const chosen = CATEGORY_ORDER.filter((c) => selection[c]);

    const lines = [
      L('wa.header'),
      '',
      L('wa.greeting'),
      '',
      ...chosen.map((c) => `• ${catLabel(c)}: ${selection[c].name} — ${fmtSAR(selection[c].price)}`),
      '',
      '─────────────',
      fmt('wa.total', { a: fmtSAR(s.totalPrice) }),
      s.status === 'ok' ? L('wa.ok') : fmt('wa.note', { a: fmt(s.msgCode, s.msgParams) }),
    ];
    return lines.join('\n');
  }

  function exportToWhatsApp() {
    const text = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${text}`, '_blank', 'noopener');
  }

  /* ======================================================================
   * PUBLIC API (used by chat.js)
   * ==================================================================== */

  function applyBuild(buildIds) {
    const newSelection = {};
    for (const cat of CATEGORY_ORDER) {
      const id = buildIds[cat];
      if (!id) continue;
      const part = db[cat].find((p) => p.id === id);
      if (part) newSelection[cat] = part;
    }
    if (Object.keys(newSelection).length === 0) return false;

    selection = newSelection;
    openReasonId = null;
    activeCategory = CATEGORY_ORDER.find((c) => !selection[c]) || 'cpu';
    renderAll();
    showToast(L('toast.applied'));
    document.getElementById('builder').scrollIntoView({ behavior: 'smooth' });
    return true;
  }

  window.ItqanApp = {
    applyBuild,
    getDb: () => db,
    getSelection: () => selection,
    getLang: () => lang,
    L,
    fmt,
    fmtSAR,
  };

  /* ======================================================================
   * EVENTS
   * ==================================================================== */

  function bindEvents() {
    els.themeToggle.addEventListener('click', toggleTheme);
    els.langToggle.addEventListener('click', toggleLang);

    els.categoryNav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      openReasonId = null;
      renderCategoryNav();
      renderPartsGrid();
    });

    els.partsGrid.addEventListener('click', (e) => {
      const replaceBtn = e.target.closest('[data-replace]');
      if (replaceBtn) { onReplace(replaceBtn.dataset.replace); return; }

      const closeBtn = e.target.closest('[data-close-reason]');
      if (closeBtn) { openReasonId = null; renderPartsGrid(); return; }

      const card = e.target.closest('[data-part]');
      if (card) onCardClick(card.dataset.part);
    });

    els.cartToggle.addEventListener('click', openCart);
    els.cartClose.addEventListener('click', closeCart);
    els.cartOverlay.addEventListener('click', closeCart);
    els.cartItems.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (btn) deselectPart(btn.dataset.remove);
    });
    els.exportBtn.addEventListener('click', exportToWhatsApp);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (els.cartPanel.classList.contains('is-open')) { closeCart(); return; }
      if (openReasonId) { openReasonId = null; renderPartsGrid(); }
    });
  }

  /* ======================================================================
   * BOOT
   * ==================================================================== */

  document.addEventListener('DOMContentLoaded', async () => {
    cacheDom();
    initTheme();
    initLang();
    initReveal();
    db = await getParts();     // <— the single data-layer entry point
    renderAll();
    bindEvents();
  });
})();
