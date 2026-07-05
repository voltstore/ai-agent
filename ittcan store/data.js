/**
 * =============================================================================
 * ITQAN STORE — DATA LAYER (data.js)
 * =============================================================================
 * This file is the ONLY place that knows where product data comes from.
 *
 * PHASE 1 (current): realistic hardcoded demo inventory (bilingual copy).
 * PHASE 2 (later):   swap the body of `getParts()` with a Firebase Realtime
 *                    Database read. Nothing else in the app needs to change,
 *                    because every consumer calls the async `getParts()`
 *                    abstraction and never touches PARTS_DB directly.
 *
 * Example Firebase drop-in replacement:
 *
 *   async function getParts() {
 *     const snapshot = await firebase.database().ref('parts').get();
 *     return snapshot.val();
 *   }
 *
 * Prices are in Saudi Riyal (SAR). Images point to elegant SVG placeholders
 * in /images — replace each file with a real product photo later (keep the
 * same path, or set per-product paths like "images/cpu-ryzen-5-7600.jpg").
 * =============================================================================
 */

/** Display metadata per category — bilingual labels + placeholder image. */
const CATEGORY_META = {
  cpu:         { label: { ar: 'المعالج',     en: 'Processor' },    icon: 'images/cpu.svg' },
  motherboard: { label: { ar: 'اللوحة الأم', en: 'Motherboard' },  icon: 'images/motherboard.svg' },
  gpu:         { label: { ar: 'كرت الشاشة',  en: 'Graphics Card' },icon: 'images/gpu.svg' },
  ram:         { label: { ar: 'الذاكرة',     en: 'Memory' },       icon: 'images/ram.svg' },
  storage:     { label: { ar: 'التخزين',     en: 'Storage' },      icon: 'images/storage.svg' },
  psu:         { label: { ar: 'مزود الطاقة', en: 'Power Supply' }, icon: 'images/psu.svg' },
  case:        { label: { ar: 'الصندوق',     en: 'Case' },         icon: 'images/case.svg' },
  cooler:      { label: { ar: 'المبرد',      en: 'CPU Cooler' },   icon: 'images/cooler.svg' },
};

/** Render / selection order of categories in the builder. */
const CATEGORY_ORDER = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case', 'cooler'];

/**
 * The raw inventory now lives in inventory.js (machine-written by the local
 * admin panel admin.html). It sets globalThis.ITQAN_INVENTORY before this
 * file runs. In Node (unit tests) we require it explicitly.
 */
if (typeof window === 'undefined' && typeof require !== 'undefined') {
  require('./inventory.js');
}
const PARTS_DB = globalThis.ITQAN_INVENTORY;

/**
 * THE data access abstraction.
 * Always async so the Firebase swap (Phase 2) is a drop-in replacement.
 * Returns a deep clone so callers can never mutate the source of truth.
 *
 * @returns {Promise<Object>} map of category -> array of parts
 */
async function getParts() {
  return structuredClone(PARTS_DB);
}

/* Allow the pure-data module to be imported in Node for testing. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PARTS_DB, CATEGORY_META, CATEGORY_ORDER, getParts };
}
