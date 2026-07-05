/* Unit tests for the pure compatibility engine (Node, no DOM). */
const { PARTS_DB, CATEGORY_ORDER } = require('../data.js');
const Compat = require('../compat.js');

const find = (cat, id) => PARTS_DB[cat].find((p) => p.id === id);
let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

// --- Rule 1: CPU socket vs motherboard -------------------------------------
const am5cpu = find('cpu', 'cpu-r5-7600');              // AM5
const lga1700mb = find('motherboard', 'mb-z790-strix'); // LGA1700
let r = Compat.evaluatePart(am5cpu, 'cpu', { motherboard: lga1700mb });
assert('AM5 CPU incompatible with LGA1700 board (code socket_cpu)',
  !r.compatible && r.reasons.length === 1 && r.reasons[0].code === 'socket_cpu');
assert('socket reason carries both sockets as params',
  r.reasons[0].params.a === 'AM5' && r.reasons[0].params.b === 'LGA1700');

const am5mb = find('motherboard', 'mb-b650-tuf');
r = Compat.evaluatePart(am5cpu, 'cpu', { motherboard: am5mb });
assert('AM5 CPU compatible with AM5 board', r.compatible);

// --- Rule 2: RAM type vs motherboard ----------------------------------------
const ddr4 = find('ram', 'ram-lpx-16-d4');
r = Compat.evaluatePart(ddr4, 'ram', { motherboard: am5mb }); // DDR5 board
assert('DDR4 RAM incompatible with DDR5 board (code ram_ram)',
  !r.compatible && r.reasons[0].code === 'ram_ram');

const ddr5 = find('ram', 'ram-veng-32-d5');
r = Compat.evaluatePart(ddr5, 'ram', { motherboard: am5mb });
assert('DDR5 RAM compatible with DDR5 board', r.compatible);

// --- Rule 3: PSU wattage with +20% headroom ---------------------------------
const i7 = find('cpu', 'cpu-i7-14700k');     // 253W
const gpu4080 = find('gpu', 'gpu-rtx4080s'); // 320W  -> raw 673, required 808
const psu750 = find('psu', 'psu-rm750e');
const psu850 = find('psu', 'psu-gx850');
r = Compat.evaluatePart(psu750, 'psu', { cpu: i7, gpu: gpu4080 });
assert('750W PSU rejected for i7-14700K + RTX 4080S (code power_psu)',
  !r.compatible && r.reasons[0].code === 'power_psu' && r.reasons[0].params.b === 808);
r = Compat.evaluatePart(psu850, 'psu', { cpu: i7, gpu: gpu4080 });
assert('850W PSU accepted for the same combo', r.compatible);

const { rawDraw, required } = Compat.powerBudget(i7, gpu4080);
assert(`power budget math (raw ${rawDraw} = 673, required ${required} = 808)`,
  rawDraw === 673 && required === 808);

r = Compat.evaluatePart(gpu4080, 'gpu', { cpu: i7, psu: psu750 });
assert('RTX 4080S flagged when 750W PSU already selected (code power_part)',
  !r.compatible && r.reasons[0].code === 'power_part');

// --- Rule 4: Case form factor ------------------------------------------------
const atxBoard = find('motherboard', 'mb-b550-tomahawk'); // ATX
const smallCase = find('case', 'case-q300l');             // mATX only
r = Compat.evaluatePart(smallCase, 'case', { motherboard: atxBoard });
assert('mATX-only case rejects ATX board (code case_case)',
  !r.compatible && r.reasons[0].code === 'case_case');

// --- Rule 5: Cooler TDP --------------------------------------------------------
const ak400 = find('cooler', 'cool-ak400'); // 220W
r = Compat.evaluatePart(ak400, 'cooler', { cpu: i7 }); // 253W CPU
assert('AK400 (220W) rejected for i7-14700K (code cooler_cooler)',
  !r.compatible && r.reasons[0].code === 'cooler_cooler');
const kraken = find('cooler', 'cool-kraken360');
r = Compat.evaluatePart(kraken, 'cooler', { cpu: i7 });
assert('Kraken 360 (350W) accepted for i7-14700K', r.compatible);

// --- i18n coverage: every reason code has a template in BOTH languages ------
const { I18N } = require('../i18n.js');
const codes = ['socket_cpu', 'socket_mb', 'ram_ram', 'ram_mb', 'power_psu',
  'power_part', 'case_case', 'case_mb', 'cooler_cooler', 'cooler_cpu'];
assert('all reason codes translated in ar + en',
  codes.every((c) => I18N.ar[`r.${c}`] && I18N.en[`r.${c}`]));
assert('all status codes translated in ar + en',
  ['status.empty', 'status.ok', 'status.okFull', 'status.warning', 'status.conflict']
    .every((k) => I18N.ar[k] && I18N.en[k]));

// --- Alternatives -------------------------------------------------------------
const alts = Compat.suggestAlternatives(PARTS_DB.motherboard, lga1700mb, 'motherboard', { cpu: am5cpu }, 2);
assert('alternatives for wrong-socket board are all AM5',
  alts.length === 2 && alts.every((m) => m.socket === 'AM5'));

// --- Build summary --------------------------------------------------------------
let s = Compat.buildSummary({}, CATEGORY_ORDER);
assert('empty build -> status empty', s.status === 'empty' && s.totalPrice === 0 && s.msgCode === 'status.empty');

s = Compat.buildSummary({ cpu: am5cpu, motherboard: lga1700mb }, CATEGORY_ORDER);
assert('mismatched build -> conflict with count param',
  s.status === 'conflict' && s.conflicts.length === 2 && s.msgParams.a === 2);

s = Compat.buildSummary({ cpu: am5cpu, gpu: gpu4080 }, CATEGORY_ORDER);
assert('cpu+gpu without PSU -> warning with watts param',
  s.status === 'warning' && s.msgParams.a === s.requiredWatts);

const fullOk = {
  cpu: find('cpu', 'cpu-r7-7800x3d'),
  motherboard: find('motherboard', 'mb-b650-tuf'),
  gpu: find('gpu', 'gpu-rtx4070s'),
  ram: find('ram', 'ram-veng-32-d5'),
  storage: find('storage', 'st-sn850x-1tb'),
  psu: find('psu', 'psu-rm750e'),
  case: find('case', 'case-h5-flow'),
  cooler: find('cooler', 'cool-pa120se'),
};
s = Compat.buildSummary(fullOk, CATEGORY_ORDER);
assert('full 8-part build -> ok with okFull message',
  s.status === 'ok' && s.selectedCount === 8 && s.msgCode === 'status.okFull');
assert('total price sums correctly',
  s.totalPrice === Object.values(fullOk).reduce((a, p) => a + p.price, 0));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
