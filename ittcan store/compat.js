/**
 * =============================================================================
 * ITQAN STORE — COMPATIBILITY ENGINE (compat.js)
 * =============================================================================
 * A PURE, framework-free, testable module. No DOM access, no globals mutated,
 * and — importantly — LANGUAGE-AGNOSTIC: every incompatibility is returned as
 * a structured {code, params} object; the UI layer formats it via i18n.js.
 *
 * Enforced rules:
 *   1. CPU socket        <-> Motherboard socket must match.
 *   2. RAM type          <-> Motherboard ramType must match (DDR4/DDR5).
 *   3. PSU wattage       >=  (CPU tdp + GPU draw + 100W base) * 1.2 headroom.
 *   4. Case              must support the motherboard form factor.
 *   5. Cooler tdpSupport >=  CPU tdpWatts.
 *
 * Attached to `window.Compat` in the browser; CommonJS export for Node tests.
 * =============================================================================
 */
(function (root) {
  'use strict';

  /** Watts consumed by the rest of the system (fans, drives, board...). */
  const BASE_SYSTEM_WATTS = 100;
  /** Safety headroom multiplier applied on top of the raw draw. */
  const HEADROOM = 1.2;

  /* ------------------------------------------------------------------ */
  /* Power budget                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * @param {Object|null} cpu selected CPU part (or null)
   * @param {Object|null} gpu selected GPU part (or null)
   * @returns {{rawDraw:number, required:number}} raw watts + watts required
   *          after the +20% safety headroom.
   */
  function powerBudget(cpu, gpu) {
    const rawDraw = (cpu ? cpu.tdpWatts : 0) + (gpu ? gpu.powerDraw : 0) + BASE_SYSTEM_WATTS;
    return { rawDraw, required: Math.ceil(rawDraw * HEADROOM) };
  }

  /* ------------------------------------------------------------------ */
  /* Single-card evaluation                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Evaluate ONE candidate part against the rest of the current selection
   * (the candidate replaces whatever occupies its own category slot).
   *
   * @param {Object} part      candidate part object
   * @param {string} category  candidate category key
   * @param {Object} selection map of category -> selected part (or undefined)
   * @returns {{compatible:boolean, reasons:Array<{code:string, params:Object}>}}
   */
  function evaluatePart(part, category, selection) {
    const reasons = [];
    const sel = Object.assign({}, selection, { [category]: part });
    const { cpu, motherboard, gpu, ram, psu, case: pcCase, cooler } = sel;

    // Rule 1 — CPU socket <-> Motherboard socket.
    if ((category === 'cpu' || category === 'motherboard') && cpu && motherboard) {
      if (cpu.socket !== motherboard.socket) {
        reasons.push(category === 'cpu'
          ? { code: 'socket_cpu', params: { a: part.socket, b: motherboard.socket } }
          : { code: 'socket_mb', params: { a: part.socket, b: cpu.socket } });
      }
    }

    // Rule 2 — RAM type <-> Motherboard ramType.
    if ((category === 'ram' || category === 'motherboard') && ram && motherboard) {
      if (ram.type !== motherboard.ramType) {
        reasons.push(category === 'ram'
          ? { code: 'ram_ram', params: { a: part.type, b: motherboard.ramType } }
          : { code: 'ram_mb', params: { a: part.ramType, b: ram.type } });
      }
    }

    // Rule 3 — PSU wattage with +20% headroom (involves cpu, gpu, psu).
    if ((category === 'psu' || category === 'cpu' || category === 'gpu') && psu && (cpu || gpu)) {
      const { rawDraw, required } = powerBudget(cpu, gpu);
      if (psu.wattage < required) {
        reasons.push(category === 'psu'
          ? { code: 'power_psu', params: { a: part.wattage, b: required, c: rawDraw } }
          : { code: 'power_part', params: { a: rawDraw, b: psu.wattage, c: required } });
      }
    }

    // Rule 4 — Case must support the motherboard form factor.
    if ((category === 'case' || category === 'motherboard') && pcCase && motherboard) {
      if (!pcCase.formFactorSupport.includes(motherboard.formFactor)) {
        reasons.push(category === 'case'
          ? { code: 'case_case', params: { a: motherboard.formFactor } }
          : { code: 'case_mb', params: { a: part.formFactor } });
      }
    }

    // Rule 5 — Cooler must handle the CPU heat output.
    if ((category === 'cooler' || category === 'cpu') && cooler && cpu) {
      if (cooler.tdpSupport < cpu.tdpWatts) {
        reasons.push(category === 'cooler'
          ? { code: 'cooler_cooler', params: { a: part.tdpSupport, b: cpu.tdpWatts } }
          : { code: 'cooler_cpu', params: { a: part.tdpWatts, b: cooler.tdpSupport } });
      }
    }

    return { compatible: reasons.length === 0, reasons };
  }

  /* ------------------------------------------------------------------ */
  /* Whole-inventory evaluation                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Evaluate every part in a category against the current selection.
   * @returns {Map<string, {compatible:boolean, reasons:Array}>} keyed by part id
   */
  function evaluateCategory(parts, category, selection) {
    const map = new Map();
    for (const part of parts) {
      map.set(part.id, evaluatePart(part, category, selection));
    }
    return map;
  }

  /**
   * Suggest the best compatible alternatives for an incompatible part.
   * "Best" = closest in price to the rejected part, ties broken by lower price.
   */
  function suggestAlternatives(parts, rejectedPart, category, selection, limit = 2) {
    return parts
      .filter((p) => p.id !== rejectedPart.id)
      .filter((p) => evaluatePart(p, category, selection).compatible)
      .sort((a, b) => {
        const da = Math.abs(a.price - rejectedPart.price);
        const db = Math.abs(b.price - rejectedPart.price);
        return da - db || a.price - b.price;
      })
      .slice(0, limit);
  }

  /* ------------------------------------------------------------------ */
  /* Overall build health                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Summarize the whole build. The human message is returned as a
   * {msgCode, msgParams} pair — formatted by the UI in the active language.
   *
   * @returns {{
   *   status: 'empty'|'ok'|'warning'|'conflict',
   *   msgCode: string, msgParams: Object,
   *   selectedCount: number, totalCategories: number,
   *   totalPrice: number, requiredWatts: number,
   *   conflicts: Array<{category:string, part:Object, reasons:Array}>
   * }}
   */
  function buildSummary(selection, categoryOrder) {
    const selected = categoryOrder.filter((c) => selection[c]);
    const totalPrice = selected.reduce((sum, c) => sum + selection[c].price, 0);
    const { required } = powerBudget(selection.cpu, selection.gpu);

    const conflicts = [];
    for (const c of selected) {
      const res = evaluatePart(selection[c], c, selection);
      if (!res.compatible) conflicts.push({ category: c, part: selection[c], reasons: res.reasons });
    }

    let status, msgCode, msgParams = {};
    if (selected.length === 0) {
      status = 'empty';
      msgCode = 'status.empty';
    } else if (conflicts.length > 0) {
      status = 'conflict';
      msgCode = 'status.conflict';
      msgParams = { a: conflicts.length };
    } else if (selection.cpu && selection.gpu && !selection.psu) {
      status = 'warning';
      msgCode = 'status.warning';
      msgParams = { a: required };
    } else {
      status = 'ok';
      msgCode = selected.length === categoryOrder.length ? 'status.okFull' : 'status.ok';
    }

    return {
      status,
      msgCode,
      msgParams,
      selectedCount: selected.length,
      totalCategories: categoryOrder.length,
      totalPrice,
      requiredWatts: required,
      conflicts,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Exports                                                             */
  /* ------------------------------------------------------------------ */

  const Compat = {
    BASE_SYSTEM_WATTS,
    HEADROOM,
    powerBudget,
    evaluatePart,
    evaluateCategory,
    suggestAlternatives,
    buildSummary,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Compat;          // Node (unit tests)
  }
  root.Compat = Compat;               // Browser
})(typeof window !== 'undefined' ? window : globalThis);
