/**
 * =============================================================================
 * ITQAN STORE — INTERNATIONALIZATION (i18n.js)
 * =============================================================================
 * Full Arabic (RTL, default) + English (LTR) dictionaries.
 * - Static DOM nodes are translated via [data-i18n] / [data-i18n-html].
 * - Dynamic renderers (app.js / chat.js) call L('key') and fmt('key', params).
 * - Compatibility reasons come from compat.js as {code, params} and are
 *   formatted here, so the engine itself stays language-agnostic.
 * =============================================================================
 */
const I18N = {
  /* ========================================================== ARABIC (RTL) */
  ar: {
    dir: 'rtl',
    name: 'العربية',

    /* header / brand */
    'brand.tag': 'تجميعات احترافية',
    'nav.builder': 'البنّاء',
    'theme.toLight': 'التبديل إلى الوضع الفاتح',
    'theme.toDark': 'التبديل إلى الوضع الداكن',
    'lang.switch': 'English',
    'lang.switchAria': 'Switch to English',
    'cart.open': 'فتح سلة التجميعة',

    /* hero */
    'hero.kicker': 'متجر سعودي متخصص — قطع أصلية بضمان',
    'hero.title': 'الإتقان ليس خيارًا،<br>إنه <em>معيارنا</em>.',
    'hero.sub': 'ابنِ جهازك قطعةً قطعة بثقة تامة — محرك التوافق في اتقان يفحص كل اختيار لحظيًا: السوكِت، الذاكرة، والطاقة. لا مفاجآت، لا تعارضات.',
    'hero.cta': 'ابنِ جهازك الآن',
    'hero.cta2': 'اسأل المساعد الذكي',
    'hero.stat1b': '+40', 'hero.stat1t': 'قطعة أصلية بضمان',
    'hero.stat2b': 'لحظي', 'hero.stat2t': 'فحص توافق ذكي',
    'hero.stat3b': 'واتساب', 'hero.stat3t': 'اطلب تجميعتك مباشرة',

    /* features */
    'feat.eyebrow': 'لماذا اتقان؟',
    'feat.title': 'صُمم ليمنعك من الخطأ',
    'feat.1t': 'محرك توافق حي',
    'feat.1d': 'كل قطعة تُفحص ضد اختياراتك لحظيًا — السوكِت والذاكرة والطاقة والمقاسات.',
    'feat.2t': 'شفافية كاملة',
    'feat.2d': 'القطعة غير المتوافقة تخبرك بالسبب الدقيق، وتقترح البديل الأنسب بضغطة.',
    'feat.3t': 'مساعد ذكي',
    'feat.3d': 'أخبره بميزانيتك واستخدامك، ويرشّح تجميعة متكاملة من مخزوننا فقط.',
    'feat.4t': 'طلب عبر واتساب',
    'feat.4d': 'تجميعتك تتحول لرسالة منسّقة بضغطة واحدة — نراجعها ونجهزها لك.',

    /* steps */
    'steps.eyebrow': 'كيف تعمل؟',
    'steps.title': 'ثلاث خطوات، جهاز متكامل',
    'steps.1t': 'اختر قطعك',
    'steps.1d': 'ثمان فئات، بأي ترتيب تريده — أو دع المساعد الذكي يقترح عليك.',
    'steps.2t': 'تحقق لحظيًا',
    'steps.2d': 'الأخضر متوافق، والأحمر يشرح السبب ويقترح البديل.',
    'steps.3t': 'اطلب بضغطة',
    'steps.3d': 'صدّر تجميعتك كرسالة واتساب منسّقة مع الإجمالي.',

    /* builder */
    'builder.title': 'بنّاء التجميعات',
    'builder.sub': 'اختر قطعة واحدة من كل فئة — بأي ترتيب. القطع غير المتوافقة ستظهر بالأحمر مع السبب والبدائل.',
    'builder.hint': 'اضغط على أي قطعة غير متوافقة لمعرفة السبب',
    'builder.categories': 'فئات القطع',
    'builder.pick': 'اختر قطعة',
    'builder.parts': 'قطع',

    /* status */
    'status.empty': 'ابدأ باختيار قطعك — سيتحقق محرك التوافق من كل اختيار لحظيًا',
    'status.ok': 'كل القطع المختارة متوافقة',
    'status.okFull': 'تجميعة متكاملة ومتوافقة 100% — جاهزة للتصدير',
    'status.warning': 'تحقق من الباور — نظامك يحتاج مزودًا بقدرة {a} واط على الأقل',
    'status.conflict': 'يوجد تعارض في التجميعة ({a}) — راجع القطع المحددة باللون الأحمر',

    /* part cards */
    'card.incompatible': 'غير متوافقة',
    'card.selected': 'مختارة',
    'card.ariaIncompatible': '{name}، {price}، غير متوافقة — اضغط لمعرفة السبب والبدائل',
    'card.ariaSelected': '{name}، {price}، مختارة — اضغط لإلغاء الاختيار',
    'card.ariaPick': '{name}، {price} — اضغط للاختيار',

    /* reason panel */
    'reason.title': 'لماذا لا تتوافق «{name}»؟',
    'reason.close': 'إغلاق التوضيح',
    'reason.region': 'سبب عدم التوافق',
    'reason.alts': 'بدائل متوافقة مقترحة:',
    'reason.noAlts': 'لا توجد بدائل متوافقة في هذه الفئة مع اختياراتك الحالية — جرّب تعديل قطعة أخرى.',
    'reason.replace': 'استبدال',

    /* compatibility reasons (from engine codes) */
    'r.socket_cpu': 'سوكِت المعالج ({a}) لا يتوافق مع اللوحة الأم المختارة ({b})',
    'r.socket_mb': 'سوكِت اللوحة ({a}) لا يتوافق مع المعالج المختار ({b})',
    'r.ram_ram': 'نوع الذاكرة {a} غير مدعوم — اللوحة المختارة تدعم {b} فقط',
    'r.ram_mb': 'هذه اللوحة تدعم {a} بينما الذاكرة المختارة من نوع {b}',
    'r.power_psu': 'قدرة المزود {a} واط أقل من المطلوب {b} واط (استهلاك النظام {c} واط + هامش أمان 20%)',
    'r.power_part': 'هذه القطعة ترفع استهلاك النظام إلى {a} واط — المزود المختار ({b} واط) أقل من المطلوب {c} واط',
    'r.case_case': 'الصندوق لا يدعم مقاس اللوحة المختارة ({a})',
    'r.case_mb': 'مقاس هذه اللوحة ({a}) أكبر مما يدعمه الصندوق المختار',
    'r.cooler_cooler': 'هذا المبرد يدعم حتى {a} واط بينما المعالج المختار يصدر {b} واط',
    'r.cooler_cpu': 'حرارة هذا المعالج ({a} واط) تتجاوز قدرة المبرد المختار ({b} واط)',

    /* spec chips */
    'chip.watts': '{a} واط',
    'chip.igpu': 'رسوميات مدمجة',
    'chip.noIgpu': 'بدون رسوميات',
    'chip.recPsu': 'مزود مقترح {a} واط',
    'chip.rating': 'كفاءة {a}',
    'chip.supports': 'يدعم: {a}',
    'chip.upTo': 'حتى {a} واط',

    /* cart */
    'cart.title': 'تجميعتك',
    'cart.close': 'إغلاق السلة',
    'cart.empty': 'سلتك فارغة',
    'cart.emptyHint': 'اختر قطعك من البنّاء وستظهر هنا',
    'cart.total': 'الإجمالي',
    'cart.remove': 'إزالة {name} من السلة',
    'cart.ok': '✓ التجميعة متوافقة — تم الفحص عبر محرك اتقان',
    'cart.export': 'تصدير التجميعة عبر واتساب',

    /* toasts */
    'toast.picked': 'تم اختيار {a} — التالي: {b}',
    'toast.pickedLast': 'تم اختيار {a}',
    'toast.applied': 'تم تطبيق التجميعة المقترحة في البنّاء ✓',

    /* whatsapp export */
    'wa.header': '🖥️ *متجر اتقان — طلب تجميعة*',
    'wa.greeting': 'السلام عليكم، أرغب بطلب التجميعة التالية:',
    'wa.total': '💰 *الإجمالي: {a}*',
    'wa.ok': '✅ التجميعة متوافقة (تم الفحص عبر محرك توافق اتقان)',
    'wa.note': '⚠️ ملاحظة: {a}',

    /* footer */
    'footer.tag': 'متجر سعودي متخصص في قطع الكمبيوتر والتجميعات الاحترافية — نجمّع، نفحص، ونشحن لكل مناطق المملكة.',
    'footer.linksT': 'روابط',
    'footer.l1': 'البنّاء',
    'footer.l2': 'المميزات',
    'footer.l3': 'طريقة الطلب',
    'footer.contactT': 'تواصل',
    'footer.wa': 'واتساب المتجر',
    'footer.credit': 'صُنع بإتقان — اتقان © 2026',

    /* chat */
    'chat.open': 'فتح مساعد اتقان الذكي',
    'chat.title': 'مساعد اتقان الذكي',
    'chat.subtitle': 'مدعوم بـ Gemini — يرشّح من مخزون المتجر فقط',
    'chat.changeKey': 'تغيير المفتاح',
    'chat.close': 'إغلاق المحادثة',
    'chat.inputPh': 'اكتب ميزانيتك واستخدامك...',
    'chat.inputLabel': 'اكتب رسالتك',
    'chat.send': 'إرسال',
    'chat.setupTitle': 'مرحبًا بك في مساعد اتقان 👋',
    'chat.setupChangeTitle': 'تغيير مفتاح Gemini',
    'chat.setupText': 'لتفعيل المساعد الذكي، الصق مفتاح Google Gemini API الخاص بك. المفتاح يُحفظ على جهازك فقط (localStorage) ولا يُرسل لأي جهة غير Google. احصل على مفتاح مجاني من',
    'chat.keyLabel': 'مفتاح Gemini API',
    'chat.saveKey': 'حفظ وبدء المحادثة',
    'chat.welcome1': 'أهلًا بك في <strong>متجر اتقان</strong> 🖥️',
    'chat.welcome2': 'أنا مساعدك الذكي للتجميعات. أخبرني بميزانيتك واستخدامك وسأقترح لك تجميعة متوافقة 100% من مخزوننا.',
    'chat.chip1': 'أبغى تجميعة ألعاب بميزانية 5000 ريال لدقة 1440p',
    'chat.chip2': 'ساعدني — ما أعرف كيف أبدأ',
    'chat.typing': 'يكتب الآن',
    'chat.buildTitle': 'تجميعة مقترحة ({a} قطع) — {b}',
    'chat.buildOk': '✓ اجتازت فحص محرك التوافق',
    'chat.buildWarn': '⚠ {a}',
    'chat.apply': 'تطبيق هذه التجميعة',
    'chat.errKey': 'يبدو أن مفتاح API غير صالح 🔑 — اضغط «تغيير المفتاح» بالأعلى وجرّب مفتاحًا جديدًا من Google AI Studio.',
    'chat.errQuota': 'وصلنا حد الاستخدام المجاني مؤقتًا ⏳ — انتظر دقيقة ثم أعد المحاولة.',
    'chat.errNet': 'تعذّر الاتصال بالشبكة 📡 — تأكد من اتصالك بالإنترنت ثم حاول مجددًا.',
    'chat.errGeneric': 'حدث خطأ غير متوقع من الخدمة — حاول مرة أخرى بعد قليل.',
    'chat.errEmpty': 'لم يصلنا رد مفهوم من المساعد — أعد صياغة سؤالك.',
    'chat.fallback': 'تفضل التجميعة المقترحة:',

    /* misc */
    'skip': 'تخطّي إلى البنّاء',
    'currency': '{a} ر.س',
  },

  /* ========================================================= ENGLISH (LTR) */
  en: {
    dir: 'ltr',
    name: 'English',

    'brand.tag': 'PRO PC BUILDS',
    'nav.builder': 'Builder',
    'theme.toLight': 'Switch to light theme',
    'theme.toDark': 'Switch to dark theme',
    'lang.switch': 'عربي',
    'lang.switchAria': 'التبديل إلى العربية',
    'cart.open': 'Open build cart',

    'hero.kicker': 'Saudi specialist store — genuine parts, full warranty',
    'hero.title': 'Perfection isn’t optional.<br>It’s <em>our standard</em>.',
    'hero.sub': 'Build your PC part by part with total confidence — Itqan’s compatibility engine checks every choice in real time: socket, memory, and power. No surprises, no conflicts.',
    'hero.cta': 'Start Your Build',
    'hero.cta2': 'Ask the AI Assistant',
    'hero.stat1b': '40+', 'hero.stat1t': 'genuine parts in stock',
    'hero.stat2b': 'Live', 'hero.stat2t': 'compatibility checks',
    'hero.stat3b': 'WhatsApp', 'hero.stat3t': 'order in one tap',

    'feat.eyebrow': 'Why Itqan?',
    'feat.title': 'Engineered to prevent mistakes',
    'feat.1t': 'Live compatibility engine',
    'feat.1d': 'Every part is validated against your picks instantly — socket, memory, power and fit.',
    'feat.2t': 'Full transparency',
    'feat.2d': 'Incompatible parts tell you exactly why, and suggest the best swap in one click.',
    'feat.3t': 'AI build assistant',
    'feat.3d': 'Tell it your budget and use case — it composes a complete build from our stock only.',
    'feat.4t': 'Order via WhatsApp',
    'feat.4d': 'Your build becomes a formatted message in one tap — we review and prepare it.',

    'steps.eyebrow': 'How it works',
    'steps.title': 'Three steps to a complete rig',
    'steps.1t': 'Pick your parts',
    'steps.1d': 'Eight categories, any order — or let the AI assistant propose a build.',
    'steps.2t': 'Verify instantly',
    'steps.2d': 'Green means compatible. Red explains why and offers the fix.',
    'steps.3t': 'Order in one tap',
    'steps.3d': 'Export your build as a formatted WhatsApp message with the total.',

    'builder.title': 'Build Configurator',
    'builder.sub': 'Pick one part per category — in any order. Incompatible parts turn red with the reason and alternatives.',
    'builder.hint': 'Click any incompatible part to see why',
    'builder.categories': 'Part categories',
    'builder.pick': 'Choose a part',
    'builder.parts': 'parts',

    'status.empty': 'Start picking parts — the compatibility engine validates every choice live',
    'status.ok': 'All selected parts are compatible',
    'status.okFull': 'Complete build, 100% compatible — ready to export',
    'status.warning': 'Check your PSU — this system needs at least {a}W',
    'status.conflict': 'Build has conflicts ({a}) — review the parts marked in red',

    'card.incompatible': 'Incompatible',
    'card.selected': 'Selected',
    'card.ariaIncompatible': '{name}, {price}, incompatible — press to see why and get alternatives',
    'card.ariaSelected': '{name}, {price}, selected — press to deselect',
    'card.ariaPick': '{name}, {price} — press to select',

    'reason.title': 'Why doesn’t “{name}” fit?',
    'reason.close': 'Close explanation',
    'reason.region': 'Incompatibility reason',
    'reason.alts': 'Suggested compatible alternatives:',
    'reason.noAlts': 'No compatible alternatives in this category with your current picks — try adjusting another part.',
    'reason.replace': 'Swap in',

    'r.socket_cpu': 'CPU socket ({a}) doesn’t match the selected motherboard ({b})',
    'r.socket_mb': 'Board socket ({a}) doesn’t match the selected CPU ({b})',
    'r.ram_ram': '{a} memory isn’t supported — the selected board takes {b} only',
    'r.ram_mb': 'This board supports {a}, but the selected memory is {b}',
    'r.power_psu': '{a}W is below the required {b}W (system draw {c}W + 20% headroom)',
    'r.power_part': 'This part raises system draw to {a}W — your {b}W PSU is below the required {c}W',
    'r.case_case': 'This case doesn’t fit the selected {a} motherboard',
    'r.case_mb': 'This {a} board is larger than the selected case supports',
    'r.cooler_cooler': 'This cooler handles up to {a}W, but the selected CPU outputs {b}W',
    'r.cooler_cpu': 'This CPU’s {a}W heat output exceeds the selected cooler’s {b}W rating',

    'chip.watts': '{a}W',
    'chip.igpu': 'Integrated graphics',
    'chip.noIgpu': 'No iGPU',
    'chip.recPsu': 'Rec. PSU {a}W',
    'chip.rating': '{a} rated',
    'chip.supports': 'Fits: {a}',
    'chip.upTo': 'Up to {a}W',

    'cart.title': 'Your Build',
    'cart.close': 'Close cart',
    'cart.empty': 'Your cart is empty',
    'cart.emptyHint': 'Pick parts in the builder and they’ll appear here',
    'cart.total': 'Total',
    'cart.remove': 'Remove {name} from cart',
    'cart.ok': '✓ Build verified compatible by the Itqan engine',
    'cart.export': 'Export build via WhatsApp',

    'toast.picked': '{a} selected — next: {b}',
    'toast.pickedLast': '{a} selected',
    'toast.applied': 'Suggested build applied to the configurator ✓',

    'wa.header': '🖥️ *Itqan Store — Build Order*',
    'wa.greeting': 'Hello! I’d like to order the following build:',
    'wa.total': '💰 *Total: {a}*',
    'wa.ok': '✅ Build verified compatible (Itqan compatibility engine)',
    'wa.note': '⚠️ Note: {a}',

    'footer.tag': 'A Saudi specialist store for PC parts and professional custom builds — we assemble, test, and ship kingdom-wide.',
    'footer.linksT': 'Links',
    'footer.l1': 'Builder',
    'footer.l2': 'Features',
    'footer.l3': 'How to order',
    'footer.contactT': 'Contact',
    'footer.wa': 'Store WhatsApp',
    'footer.credit': 'Crafted with precision — Itqan © 2026',

    'chat.open': 'Open Itqan AI assistant',
    'chat.title': 'Itqan AI Assistant',
    'chat.subtitle': 'Powered by Gemini — recommends from store stock only',
    'chat.changeKey': 'Change key',
    'chat.close': 'Close chat',
    'chat.inputPh': 'Type your budget and use case...',
    'chat.inputLabel': 'Type your message',
    'chat.send': 'Send',
    'chat.setupTitle': 'Welcome to the Itqan assistant 👋',
    'chat.setupChangeTitle': 'Change Gemini key',
    'chat.setupText': 'To enable the AI assistant, paste your Google Gemini API key. It is stored only on your device (localStorage) and sent to no one but Google. Get a free key from',
    'chat.keyLabel': 'Gemini API key',
    'chat.saveKey': 'Save & start chatting',
    'chat.welcome1': 'Welcome to <strong>Itqan Store</strong> 🖥️',
    'chat.welcome2': 'I’m your build assistant. Tell me your budget and use case and I’ll compose a 100% compatible build from our stock.',
    'chat.chip1': 'I want a 1440p gaming build for around 5,000 SAR',
    'chat.chip2': 'Help me — I don’t know where to start',
    'chat.typing': 'Typing',
    'chat.buildTitle': 'Suggested build ({a} parts) — {b}',
    'chat.buildOk': '✓ Passed the compatibility engine check',
    'chat.buildWarn': '⚠ {a}',
    'chat.apply': 'Apply this build',
    'chat.errKey': 'That API key looks invalid 🔑 — hit “Change key” above and try a fresh one from Google AI Studio.',
    'chat.errQuota': 'Free-tier limit reached for now ⏳ — wait a minute and try again.',
    'chat.errNet': 'Network unreachable 📡 — check your connection and retry.',
    'chat.errGeneric': 'Unexpected service error — please try again shortly.',
    'chat.errEmpty': 'No readable reply came back — try rephrasing your question.',
    'chat.fallback': 'Here’s the suggested build:',

    'skip': 'Skip to builder',
    'currency': 'SAR {a}',
  },
};

/* Allow import in Node for testing. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18N };
}
