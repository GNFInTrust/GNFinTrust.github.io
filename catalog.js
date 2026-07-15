// ============================================================
// GN FinTrust — демо-каталог и демо-реквизиты.
// Показываются, пока не настроен Firebase. После настройки
// админы управляют всем в admin.html, а эти данные игнорируются.
// ============================================================
var DEMO_PRODUCTS = [
	{ id: "web-tax-basics", type: "webinar", title: "Налоги для предпринимателей", desc: "90-минутный вебинар: какие налоги платить, когда сдавать отчёты и как избежать штрафов.", price: 15, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "web-cashflow", type: "webinar", title: "Контроль денежного потока", desc: "Как отслеживать приход и расход, чтобы бизнес не остался без денег.", price: 15, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "sem-fin-planning", type: "seminar", title: "Финансовое планирование", desc: "Семинар на полдня: финансовый план вашего бизнеса на 12 месяцев.", price: 40, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "sem-credit", type: "seminar", title: "Кредиты без ошибок", desc: "Когда брать кредит, как сравнивать предложения и договариваться об условиях.", price: 40, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "course-accounting", type: "course", title: "Бухгалтер с нуля", desc: "Полный курс: учёт, план счетов КР и отчётность по единому налогу — шаг за шагом.", price: 120, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "course-fin-lit", type: "course", title: "Личные финансы", desc: "8 уроков: бюджет, накопления и первые инвестиции для начинающих.", price: 90, preview: "PASTE_VIDEO_EMBED_LINK" },
]

var DEMO_PAYMENT = {
	numbers: [
		{ label: "Перевод MBank", value: "+996 700 000 001" },
		{ label: "Карта (Visa)", value: "4169 0000 0000 0000" },
	],
	qrs: ["PASTE_QR_IMAGE_LINK"],
}

var TYPE_LABEL = { webinar: "Вебинар", seminar: "Семинар", course: "Курс" }

function productById(list, id) {
	for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]
	return null
}

function isRealLink(v) {
	return v && typeof v === "string" && v.indexOf("http") === 0
}
