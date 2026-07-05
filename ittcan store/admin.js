/**
 * =============================================================================
 * ITQAN STORE — LOCAL INVENTORY ADMIN (admin.js)
 * =============================================================================
 * A zero-backend admin panel for the store owner:
 *   - Add / edit / delete parts per category with the right spec fields.
 *   - Attach a product photo from disk.
 *   - Saves DIRECTLY into the project via the File System Access API:
 *       inventory.js  -> regenerated on every change
 *       images/<id>.<ext> -> photo copied automatically
 *   - Fallback (API unavailable / folder not connected): download inventory.js
 *     manually and copy photos by the shown filename.
 *
 * This page is local-only for the owner; it is never linked from the store.
 * =============================================================================
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ state */
  let db = structuredClone(globalThis.ITQAN_INVENTORY);
  let settings = structuredClone(globalThis.ITQAN_SETTINGS || { whatsappPhone: '' });
  let activeCat = 'cpu';
  let query = '';              // global search query ('' = browse by category)
  let dirHandle = null;        // FileSystemDirectoryHandle for the project folder
  let editingId = null;        // part id when editing, null when adding
  let pickedImageFile = null;  // File chosen in the form (not yet saved)
  let toastTimer = null;

  const $ = (s) => document.querySelector(s);
  const CAT_AR = (cat) => CATEGORY_META[cat].label.ar;

  const nf = new Intl.NumberFormat('ar-SA-u-nu-latn', { maximumFractionDigits: 0 });
  const fmtSAR = (n) => `${nf.format(n)} ر.س`;

  function esc(str) {
    return String(str)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function toast(msg) {
    clearTimeout(toastTimer);
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3200);
  }

  /* ======================================================================
   * FIELD SCHEMA — the spec inputs each category needs
   * ==================================================================== */
  const FIELDS = {
    cpu: [
      { k: 'socket', t: 'list', label: 'السوكت *', list: ['AM4', 'AM5', 'LGA1700', 'LGA1851'], req: true },
      { k: 'tdpWatts', t: 'number', label: 'استهلاك الطاقة (واط) *', req: true },
      { k: 'integratedGraphics', t: 'check', label: 'فيه رسوميات مدمجة (iGPU)' },
    ],
    motherboard: [
      { k: 'socket', t: 'list', label: 'السوكت *', list: ['AM4', 'AM5', 'LGA1700', 'LGA1851'], req: true },
      { k: 'ramType', t: 'select', label: 'نوع الذاكرة *', options: ['DDR4', 'DDR5'], req: true },
      { k: 'formFactor', t: 'select', label: 'المقاس *', options: ['ATX', 'mATX', 'Mini-ITX'], req: true },
    ],
    gpu: [
      { k: 'powerDraw', t: 'number', label: 'استهلاك الطاقة (واط) *', req: true },
      { k: 'recommendedPSU', t: 'number', label: 'المزود المقترح (واط) *', req: true },
    ],
    ram: [
      { k: 'type', t: 'select', label: 'النوع *', options: ['DDR4', 'DDR5'], req: true },
      { k: 'capacity', t: 'text', label: 'السعة *', ph: '32GB (2×16)', req: true },
      { k: 'speed', t: 'text', label: 'السرعة *', ph: 'DDR5-6000', req: true },
    ],
    storage: [
      { k: 'type', t: 'select', label: 'النوع *', options: ['NVMe', 'SATA'], req: true },
      { k: 'capacity', t: 'text', label: 'السعة *', ph: '1TB', req: true },
    ],
    psu: [
      { k: 'wattage', t: 'number', label: 'القدرة (واط) *', req: true },
      { k: 'rating', t: 'select', label: 'شهادة الكفاءة *', options: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Titanium'], req: true },
    ],
    case: [
      { k: 'formFactorSupport', t: 'checks', label: 'مقاسات اللوحات المدعومة *', options: ['ATX', 'mATX', 'Mini-ITX'], req: true },
    ],
    cooler: [
      { k: 'tdpSupport', t: 'number', label: 'أقصى تبريد (واط TDP) *', req: true },
    ],
  };

  /* ======================================================================
   * PROJECT FOLDER CONNECTION (File System Access API)
   * ==================================================================== */

  const fsSupported = 'showDirectoryPicker' in window;

  async function connectFolder() {
    if (!fsSupported) {
      toast('متصفحك لا يدعم الحفظ المباشر — استخدم زر «تنزيل inventory.js»');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      // sanity check: must be the project folder (has inventory.js)
      await handle.getFileHandle('inventory.js');
      dirHandle = handle;
      document.body.classList.add('is-connected');
      $('#connectLabel').textContent = 'المجلد مربوط — حفظ تلقائي';
      $('#adminNote').innerHTML = '<b>تمام ✓</b> كل تعديل يُحفظ الآن مباشرة في ملفات الموقع، والصور تُنسخ تلقائيًا إلى <b dir="ltr">images/</b>.';
      toast('تم ربط مجلد المشروع ✓');
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user cancelled
      toast('هذا ليس مجلد المشروع — اختر المجلد الذي فيه inventory.js');
    }
  }

  /** Serialize the inventory exactly like the generator does. */
  function serializeInventory() {
    const header = [
      '/**',
      ' * =============================================================================',
      ' * ITQAN STORE — INVENTORY (inventory.js)',
      ' * =============================================================================',
      ' * MACHINE-GENERATED by admin.html — do not hand-edit unless you must.',
      ' * To add/edit parts, open admin.html in your browser.',
      ' * This file only sets the raw inventory; all logic lives in data.js.',
      ' * =============================================================================',
      ' */',
      'globalThis.ITQAN_INVENTORY = ',
    ].join('\n');
    return header + JSON.stringify(db, null, 2) + ';\n';
  }

  /** Persist inventory.js — direct write when connected, else no-op + hint. */
  async function writeInventory() {
    if (!dirHandle) return false;
    const fh = await dirHandle.getFileHandle('inventory.js', { create: true });
    const w = await fh.createWritable();
    await w.write(serializeInventory());
    await w.close();
    return true;
  }

  /** Copy the picked photo into images/<partId>.<ext>; returns the path. */
  async function saveImage(file, partId) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `images/${partId}.${ext}`;
    if (dirHandle) {
      const imgDir = await dirHandle.getDirectoryHandle('images', { create: true });
      const fh = await imgDir.getFileHandle(`${partId}.${ext}`, { create: true });
      const w = await fh.createWritable();
      await w.write(file);
      await w.close();
    } else {
      toast(`احفظ الصورة يدويًا باسم: ${path}`);
    }
    return path;
  }

  function downloadInventory() {
    const blob = new Blob([serializeInventory()], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory.js';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('نزّل الملف واستبدل inventory.js في مجلد المشروع');
  }

  /* ======================================================================
   * STORE SETTINGS (settings.js — e.g. WhatsApp number)
   * ==================================================================== */

  function serializeSettings() {
    return [
      '/**',
      ' * =============================================================================',
      ' * ITQAN STORE — STORE SETTINGS (settings.js)',
      ' * =============================================================================',
      ' * MACHINE-GENERATED by admin.html (قسم «إعدادات المتجر») — يمكن تعديله يدويًا.',
      ' * whatsappPhone: رقم واتساب المتجر بصيغة دولية بدون + (مثال: 966512345678)',
      ' * =============================================================================',
      ' */',
      'globalThis.ITQAN_SETTINGS = ' + JSON.stringify(settings, null, 2) + ';',
      '',
    ].join('\n');
  }

  async function saveSettings() {
    const phone = $('#setWhatsapp').value.replace(/[^0-9]/g, '');
    if (phone.length < 10) { toast('اكتب رقمًا دوليًا صحيحًا، مثال: 966512345678'); return; }
    settings.whatsappPhone = phone;
    try {
      if (dirHandle) {
        const fh = await dirHandle.getFileHandle('settings.js', { create: true });
        const w = await fh.createWritable();
        await w.write(serializeSettings());
        await w.close();
        toast('تم حفظ رقم الواتساب في الموقع ✓');
      } else {
        const blob = new Blob([serializeSettings()], { type: 'text/javascript' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'settings.js';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('نزّل settings.js واستبدله في مجلد المشروع');
      }
    } catch (err) {
      console.error(err);
      toast('تعذّر حفظ الإعدادات');
    }
  }

  /* ======================================================================
   * DASHBOARD STATS
   * ==================================================================== */

  const isPlaceholder = (p, cat) => !p.image || p.image === CATEGORY_META[cat].icon;

  function renderStats() {
    const all = CATEGORY_ORDER.flatMap((c) => db[c].map((p) => ({ p, c })));
    const totalValue = all.reduce((s, { p }) => s + p.price, 0);
    const withPhoto = all.filter(({ p, c }) => !isPlaceholder(p, c)).length;
    const noBlurb = all.filter(({ p }) => !p.blurb || !p.blurb.ar).length;

    $('#statsRow').innerHTML = `
      <div class="stat"><b>${nf.format(all.length)}</b><span>إجمالي القطع</span><code>PARTS</code></div>
      <div class="stat"><b>${fmtSAR(totalValue)}</b><span>قيمة المخزون الكاملة</span><code>VALUE</code></div>
      <div class="stat"><b>${withPhoto}/${all.length}</b><span>قطع بصور حقيقية</span><code>PHOTOS</code></div>
      <div class="stat"><b>${noBlurb}</b><span>قطع بدون وصف عربي</span><code>TODO</code></div>`;
  }

  /* ======================================================================
   * ID GENERATION
   * ==================================================================== */

  function slugify(name) {
    const s = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return s || `part-${Date.now().toString(36)}`;
  }

  function uniqueId(cat, name) {
    const base = `${cat}-${slugify(name)}`;
    let id = base, n = 2;
    while (db[cat].some((p) => p.id === id)) id = `${base}-${n++}`;
    return id;
  }

  /* ======================================================================
   * RENDER — tabs + list
   * ==================================================================== */

  function renderTabs() {
    $('#adminTabs').innerHTML = CATEGORY_ORDER.map((cat) => `
      <button type="button" role="tab" class="admin-tab ${cat === activeCat ? 'is-active' : ''}"
              aria-selected="${cat === activeCat}" data-cat="${cat}">
        ${esc(CAT_AR(cat))} <b>${db[cat].length}</b>
      </button>`).join('');
  }

  /** One-line spec summary per part for the list row. */
  function specSummary(cat, p) {
    switch (cat) {
      case 'cpu': return [p.socket, `${p.tdpWatts} واط`, p.integratedGraphics ? 'iGPU' : ''];
      case 'motherboard': return [p.socket, p.ramType, p.formFactor];
      case 'gpu': return [`${p.powerDraw} واط`, `مزود ${p.recommendedPSU}`];
      case 'ram': return [p.type, p.capacity, p.speed];
      case 'storage': return [p.type, p.capacity];
      case 'psu': return [`${p.wattage} واط`, p.rating];
      case 'case': return [(p.formFactorSupport || []).join('/')];
      case 'cooler': return [`حتى ${p.tdpSupport} واط`];
      default: return [];
    }
  }

  /** Rows shown: active category, or a global name-search across everything. */
  function visibleRows() {
    if (!query) return db[activeCat].map((p) => ({ p, cat: activeCat }));
    const q = query.toLowerCase();
    return CATEGORY_ORDER.flatMap((cat) =>
      db[cat].filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q))
        .map((p) => ({ p, cat })));
  }

  function renderList() {
    $('#catTitle').textContent = query
      ? `نتائج البحث «${query}»`
      : CAT_AR(activeCat);

    const rows = visibleRows();
    if (!rows.length) {
      $('#adminList').innerHTML = query
        ? '<li class="admin-empty">لا توجد نتائج — جرّب اسمًا آخر</li>'
        : '<li class="admin-empty">لا توجد قطع في هذه الفئة بعد — اضغط «إضافة قطعة»</li>';
      return;
    }

    $('#adminList').innerHTML = rows.map(({ p, cat }) => {
      const placeholder = isPlaceholder(p, cat);
      return `
      <li class="admin-row" data-id="${p.id}">
        <img src="${esc(p.image)}" alt="" loading="lazy"
             onerror="this.onerror=null;this.src='${esc(CATEGORY_META[cat].icon)}'">
        <div class="admin-row__info">
          <span class="admin-row__name">${esc(p.name)}</span>
          ${p.blurb && p.blurb.ar ? `<span class="admin-row__blurb">${esc(p.blurb.ar)}</span>` : ''}
          <span class="admin-row__specs">
            ${query ? `<span class="badge-cat">${esc(CAT_AR(cat))}</span>` : ''}
            ${specSummary(cat, p).filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}
            <span class="badge-img" data-ok="${placeholder ? 0 : 1}">${placeholder ? 'رسمة مؤقتة' : '✓ صورة حقيقية'}</span>
          </span>
        </div>
        <div class="admin-row__info" style="justify-items:end">
          <span class="admin-row__price">${fmtSAR(p.price)}</span>
          <span class="admin-row__id">${esc(p.id)}</span>
        </div>
        <span class="admin-row__actions">
          <button type="button" class="row-btn" data-edit="${p.id}" data-cat="${cat}" aria-label="تعديل ${esc(p.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button type="button" class="row-btn row-btn--del" data-del="${p.id}" data-cat="${cat}" aria-label="حذف ${esc(p.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2m1 0-1 14H8L7 6"/></svg>
          </button>
        </span>
      </li>`;
    }).join('');
  }

  /* ======================================================================
   * FORM — dynamic per-category fields
   * ==================================================================== */

  function fieldHtml(f, value) {
    const v = value === undefined || value === null ? '' : value;
    switch (f.t) {
      case 'number':
        return `<div class="field"><label for="f_${f.k}">${f.label}</label>
          <input type="number" id="f_${f.k}" data-k="${f.k}" min="0" ${f.req ? 'required' : ''} value="${esc(v)}"></div>`;
      case 'text':
        return `<div class="field"><label for="f_${f.k}">${f.label}</label>
          <input type="text" id="f_${f.k}" data-k="${f.k}" dir="ltr" placeholder="${esc(f.ph || '')}" ${f.req ? 'required' : ''} value="${esc(v)}"></div>`;
      case 'list':
        return `<div class="field"><label for="f_${f.k}">${f.label}</label>
          <input type="text" id="f_${f.k}" data-k="${f.k}" dir="ltr" list="dl_${f.k}" ${f.req ? 'required' : ''} value="${esc(v)}">
          <datalist id="dl_${f.k}">${f.list.map((o) => `<option value="${o}">`).join('')}</datalist></div>`;
      case 'select':
        return `<div class="field"><label for="f_${f.k}">${f.label}</label>
          <select id="f_${f.k}" data-k="${f.k}">${f.options.map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
      case 'check':
        return `<div class="field"><label class="field-check"><input type="checkbox" id="f_${f.k}" data-k="${f.k}" ${v ? 'checked' : ''}> ${f.label}</label></div>`;
      case 'checks':
        return `<div class="field"><label>${f.label}</label><div class="checks">
          ${f.options.map((o) => `<label class="field-check"><input type="checkbox" data-checks="${f.k}" value="${o}" ${(v || []).includes(o) ? 'checked' : ''}> ${o}</label>`).join('')}
        </div></div>`;
      default:
        return '';
    }
  }

  function openForm(part) {
    editingId = part ? part.id : null;
    pickedImageFile = null;
    $('#pdTitle').textContent = part
      ? `تعديل: ${part.name}`
      : `إضافة قطعة — ${CAT_AR(activeCat)}`;

    $('#fName').value = part ? part.name : '';
    $('#fPrice').value = part ? part.price : '';
    $('#fBlurbAr').value = part && part.blurb ? (part.blurb.ar || '') : '';
    $('#fBlurbEn').value = part && part.blurb ? (part.blurb.en || '') : '';
    $('#fImage').value = '';
    $('#imgPreview').src = part ? part.image : CATEGORY_META[activeCat].icon;
    $('#imgHint').textContent = 'اضغط لاختيار صورة من جهازك — تُنسخ تلقائيًا لمجلد الصور';

    // dynamic spec fields: first one sits beside the price, the rest below
    const fields = FIELDS[activeCat];
    $('#dynFieldsSlot1').outerHTML = `<div class="field" id="dynFieldsSlot1">${fieldHtml(fields[0], part ? part[fields[0].k] : undefined).replace(/^<div class="field">|<\/div>$/g, '')}</div>`;
    $('#dynFields').innerHTML = fields.slice(1).map((f) => fieldHtml(f, part ? part[f.k] : undefined)).join('');

    $('#partDialog').showModal();
    $('#fName').focus();
  }

  /** Collect + validate the form into a part object. */
  function collectForm() {
    const name = $('#fName').value.trim();
    const price = Number($('#fPrice').value);
    if (!name) { toast('اكتب اسم القطعة'); return null; }
    if (!price || price < 1) { toast('اكتب سعرًا صحيحًا'); return null; }

    const part = editingId
      ? structuredClone(db[activeCat].find((p) => p.id === editingId))
      : { id: uniqueId(activeCat, name), image: CATEGORY_META[activeCat].icon, blurb: { ar: '', en: '' } };

    part.name = name;
    part.price = price;
    part.blurb = { ar: $('#fBlurbAr').value.trim(), en: $('#fBlurbEn').value.trim() };

    for (const f of FIELDS[activeCat]) {
      if (f.t === 'checks') {
        const vals = [...document.querySelectorAll(`[data-checks="${f.k}"]:checked`)].map((c) => c.value);
        if (f.req && vals.length === 0) { toast(`اختر ${f.label.replace(' *', '')}`); return null; }
        part[f.k] = vals;
      } else if (f.t === 'check') {
        part[f.k] = $(`#f_${f.k}`).checked;
      } else if (f.t === 'number') {
        const n = Number($(`#f_${f.k}`).value);
        if (f.req && (!n || n < 0)) { toast(`أدخل ${f.label.replace(' *', '')}`); return null; }
        part[f.k] = n;
      } else {
        const val = $(`#f_${f.k}`).value.trim();
        if (f.req && !val) { toast(`أدخل ${f.label.replace(' *', '')}`); return null; }
        part[f.k] = val;
      }
    }
    return part;
  }

  async function saveForm() {
    const part = collectForm();
    if (!part) return;

    try {
      if (pickedImageFile) {
        part.image = await saveImage(pickedImageFile, part.id);
      }
      if (editingId) {
        const i = db[activeCat].findIndex((p) => p.id === editingId);
        db[activeCat][i] = part;
      } else {
        db[activeCat].push(part);
      }
      const saved = await writeInventory();
      $('#partDialog').close();
      renderTabs();
      renderList();
      renderStats();
      toast(saved ? `تم الحفظ في ملفات الموقع ✓ — ${part.name}` : `أُضيفت بالذاكرة — نزّل inventory.js لحفظها`);
    } catch (err) {
      console.error(err);
      toast('تعذّر الحفظ — تأكد من ربط مجلد المشروع الصحيح');
    }
  }

  async function deletePart(cat, id) {
    const part = db[cat].find((p) => p.id === id);
    if (!part) return;
    if (!confirm(`حذف «${part.name}» نهائيًا؟`)) return;
    db[cat] = db[cat].filter((p) => p.id !== id);
    const saved = await writeInventory().catch(() => false);
    renderTabs();
    renderList();
    renderStats();
    toast(saved ? 'تم الحذف والحفظ ✓' : 'حُذفت بالذاكرة — نزّل inventory.js لحفظها');
  }

  /* ======================================================================
   * EVENTS + BOOT
   * ==================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    renderTabs();
    renderList();
    renderStats();
    $('#setWhatsapp').value = settings.whatsappPhone || '';

    if (!fsSupported) {
      $('#adminNote').innerHTML = '<b>ملاحظة:</b> متصفحك لا يدعم الحفظ المباشر — بعد كل تعديل اضغط «تنزيل inventory.js» واستبدل الملف في مجلد المشروع.';
      $('#connectBtn').disabled = true;
    }

    $('#connectBtn').addEventListener('click', connectFolder);
    $('#exportBtn2').addEventListener('click', downloadInventory);
    $('#saveSettingsBtn').addEventListener('click', saveSettings);
    $('#addBtn').addEventListener('click', () => { query = ''; $('#searchInput').value = ''; openForm(null); });

    $('#searchInput').addEventListener('input', (e) => {
      query = e.target.value.trim();
      renderList();
    });

    $('#adminTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      activeCat = b.dataset.cat;
      query = '';
      $('#searchInput').value = '';
      renderTabs();
      renderList();
    });

    $('#adminList').addEventListener('click', (e) => {
      const edit = e.target.closest('[data-edit]');
      if (edit) {
        // Search results may come from another category — switch context first.
        activeCat = edit.dataset.cat;
        renderTabs();
        openForm(db[activeCat].find((p) => p.id === edit.dataset.edit));
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) deletePart(del.dataset.cat, del.dataset.del);
    });

    $('#partForm').addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });
    $('#pdCancel').addEventListener('click', () => $('#partDialog').close());
    $('#pdClose').addEventListener('click', () => $('#partDialog').close());

    $('#fImage').addEventListener('change', () => {
      const f = $('#fImage').files[0];
      if (!f) return;
      pickedImageFile = f;
      $('#imgPreview').src = URL.createObjectURL(f);
      $('#imgHint').textContent = `تم اختيار: ${f.name}`;
    });
  });
})();
