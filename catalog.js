// ============================================================
// GN FinTrust — демо-каталог, демо-реквизиты, валюта и язык.
// Демо-данные показываются, пока не настроен Firebase. После
// настройки админы управляют каталогом в admin.html.
// ВАЖНО: все цены вводятся в СОМАХ. Курс рубля — ниже (RUB_PER_KGS).
// ============================================================
var DEMO_PRODUCTS = [
	{ id: "web-tax-basics", type: "webinar", title: "Налоги для предпринимателей", desc: "90-минутный вебинар: какие налоги платить, когда сдавать отчёты и как избежать штрафов.", price: 1300, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "web-cashflow", type: "webinar", title: "Контроль денежного потока", desc: "Как отслеживать приход и расход, чтобы бизнес не остался без денег.", price: 1300, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "sem-fin-planning", type: "seminar", title: "Финансовое планирование", desc: "Семинар на полдня: финансовый план вашего бизнеса на 12 месяцев.", price: 3500, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "sem-credit", type: "seminar", title: "Кредиты без ошибок", desc: "Когда брать кредит, как сравнивать предложения и договариваться об условиях.", price: 3500, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "course-accounting", type: "course", title: "Бухгалтер с нуля", desc: "Полный курс: учёт, план счетов КР и отчётность по единому налогу — шаг за шагом.", price: 10500, preview: "PASTE_VIDEO_EMBED_LINK" },
	{ id: "course-fin-lit", type: "course", title: "Личные финансы", desc: "8 уроков: бюджет, накопления и первые инвестиции для начинающих.", price: 8000, preview: "PASTE_VIDEO_EMBED_LINK" },
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

// ============================================================
// Валюта: основная — сомы, под ней мелко — рубли.
// Нажатие на рубли меняет их местами: рубли становятся основными.
// ============================================================
var RUB_PER_KGS = 0.92 // курс: сколько рублей стоит 1 сом
var GN_CUR = "kgs"
try { GN_CUR = localStorage.getItem("gn_cur") || "kgs" } catch (e) {}

function formatPrice(p) {
	var n = Number(p) || 0
	if (GN_CUR === "rub") return Math.round(n * RUB_PER_KGS).toLocaleString("ru-RU") + " ₽"
	return n.toLocaleString("ru-RU") + " сом"
}

function formatPriceSub(p) {
	var n = Number(p) || 0
	if (GN_CUR === "rub") return "≈ " + n.toLocaleString("ru-RU") + " сом"
	return "≈ " + Math.round(n * RUB_PER_KGS).toLocaleString("ru-RU") + " ₽"
}

// ============================================================
// Язык: русский / кыргызча
// ============================================================
var GN_LANG = "ru"
try { GN_LANG = localStorage.getItem("gn_lang") || "ru" } catch (e) {}

var KY_DICT = {
	"Каталог": "Каталог",
	"Как купить": "Кантип сатып алуу",
	"Вход": "Кирүү",
	"Войти": "Кирүү",
	"Регистрация": "Каттоо",
	"Выйти": "Чыгуу",
	"Мой кабинет": "Менин кабинетим",
	"← На сайт": "← Сайтка",
	"← Назад в каталог": "← Каталогго кайтуу",
	"© 2026 GN FinTrust · Все права защищены": "© 2026 GN FinTrust · Бардык укуктар корголгон",
	"Вебинары · Семинары · Курсы": "Вебинарлар · Семинарлар · Курстар",
	"Финансовые навыки, которые": "Каржылык көндүмдөр —",
	"окупаются": "өз үзүрүн берет",
	"Смотрите бесплатный анонс каждого вебинара, семинара и курса. Оплата переводом по номеру или по QR-коду — логин и доступ придут в WhatsApp, на почту или в Telegram.": "Ар бир вебинардын, семинардын жана курстун акысыз анонсун көрүңүз. Төлөм — номер аркылуу же QR-код менен, логин жана кирүү мүмкүнчүлүгү WhatsApp, почта же Telegram аркылуу келет.",
	"Что внутри": "Ичинде эмне бар",
	"У каждого материала есть короткий видео-анонс. Понравилось — нажимайте «Купить».": "Ар бир материалдын кыска видео-анонсу бар. Жакса — «Сатып алуу» баскычын басыңыз.",
	"Вебинары": "Вебинарлар",
	"Семинары": "Семинарлар",
	"Курсы": "Курстар",
	"Купить": "Сатып алуу",
	"Видео-анонс": "Видео-анонс",
	"Без карт на сайте и без подписок — одна оплата, доступ навсегда.": "Сайтта карта маалыматы сакталбайт, жазылуу жок — бир жолку төлөм, түбөлүк кирүү.",
	"Выберите и оплатите": "Тандап, төлөңүз",
	"Нажмите «Купить», переведите деньги по номеру или отсканируйте QR-код — как удобнее.": "«Сатып алуу» баскычын басып, номерге акча которуңуз же QR-кодду скандаңыз.",
	"Скажите, куда написать": "Кайда жазарыбызды айтыңыз",
	"Выберите WhatsApp, почту или Telegram и оставьте контакт.": "WhatsApp, почта же Telegram тандап, байланышыңызды калтырыңыз.",
	"Получите логин": "Логин алыңыз",
	"Мы пришлём личный логин и пароль. Войдите — покупка уже в вашем кабинете.": "Жеке логин менен сырсөздү жөнөтөбүз. Кириңиз — сатып алууңуз кабинетиңизде.",
	"Оформление покупки": "Сатып алууну тариздөө",
	"Одна оплата — доступ навсегда. Без подписок.": "Бир жолку төлөм — түбөлүк кирүү. Жазылуу жок.",
	"Выберите способ оплаты": "Төлөм ыкмасын тандаңыз",
	"Карта Visa": "Visa картасы",
	"Или отсканируйте QR-код:": "Же QR-кодду скандаңыз:",
	"Копировать": "Көчүрүү",
	"Скопировано": "Көчүрүлдү",
	"Номера МБанк скоро появятся.": "МБанк номерлери жакында кошулат.",
	"Оплата картой Visa пока недоступна — оплатите через МБанк.": "Visa картасы менен төлөм азырынча жеткиликсиз — МБанк аркылуу төлөңүз.",
	"Переведите ровно ту сумму, что указана выше. Оплату проверяет живой человек.": "Жогоруда көрсөтүлгөн сумманы так которуңуз. Төлөмдү адам текшерет.",
	"QR-код скоро появится — оплатите по номеру": "QR-код жакында кошулат — номер аркылуу төлөңүз",
	"Куда прислать ваш логин?": "Логиниңизди кайда жөнөтөлү?",
	"Когда мы подтвердим оплату, пришлём личный логин, пароль и вашу покупку.": "Төлөм тастыкталганда, жеке логин, сырсөз жана сатып алууңузду жөнөтөбүз.",
	"Способ связи": "Байланыш ыкмасы",
	"Почта": "Почта",
	"Ваш номер WhatsApp": "WhatsApp номериңиз",
	"Ваша почта": "Почтаңыз",
	"Ваш Telegram": "Сиздин Telegram",
	"Ваше имя": "Атыңыз",
	"Я оплатил(а) — пришлите логин": "Мен төлөдүм — логин жөнөтүңүз",
	"Вебинар": "Вебинар",
	"Семинар": "Семинар",
	"Курс": "Курс",
	"Войдите с логином и паролем, которые мы прислали после покупки.": "Сатып алуудан кийин жөнөткөн логин жана сырсөз менен кириңиз.",
	"Войти через Google": "Google аркылуу кирүү",
	"или по почте": "же почта аркылуу",
	"Пароль": "Сырсөз",
	"Не менее 6 символов": "Кеминде 6 белги",
	"Купили, но не получили логин? Мы отправляем доступ в WhatsApp, на почту или в Telegram после подтверждения оплаты.": "Сатып алдыңыз, бирок логин келген жокпу? Төлөм тастыкталгандан кийин кирүү маалыматын WhatsApp, почта же Telegram аркылуу жөнөтөбүз.",
	"Пока пусто": "Азырынча бош",
	"В вашем аккаунте ещё нет покупок. Если вы уже оплатили — мы добавим доступ сразу после проверки оплаты.": "Аккаунтуңузда азырынча сатып алуулар жок. Эгер төлөгөн болсоңуз — төлөмдү текшергенден кийин кирүү мүмкүнчүлүгүн кошобуз.",
	"Открыть каталог": "Каталогду ачуу",
	"Мои покупки": "Менин сатып алууларым",
	"← Мои покупки": "← Менин сатып алууларым",
	"С возвращением! Всё, что вы купили, — ниже.": "Кайра келишиңиз менен! Сатып алгандарыңыз төмөндө.",
	"Нажмите на материал, чтобы открыть его.": "Материалды ачуу үчүн басыңыз.",
	"Купите": "Сатып алыңыз",
}

function gnTranslate(root) {
	if (GN_LANG !== "ky" || !root) return
	if (root.nodeType === 3) {
		var k = root.nodeValue.trim()
		if (KY_DICT[k]) root.nodeValue = root.nodeValue.replace(k, KY_DICT[k])
		return
	}
	if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return
	var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
	var nodes = []
	while (walker.nextNode()) nodes.push(walker.currentNode)
	nodes.forEach(function (n) {
		var key = n.nodeValue.trim()
		if (KY_DICT[key]) n.nodeValue = n.nodeValue.replace(key, KY_DICT[key])
	})
	if (root.querySelectorAll) {
		root.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(function (el) {
			if (KY_DICT[el.placeholder]) el.placeholder = KY_DICT[el.placeholder]
		})
	}
}

document.addEventListener("DOMContentLoaded", function () {
	gnTranslate(document.body)
	if (GN_LANG === "ky" && window.MutationObserver) {
		new MutationObserver(function (muts) {
			muts.forEach(function (m) {
				for (var i = 0; i < m.addedNodes.length; i++) gnTranslate(m.addedNodes[i])
			})
		}).observe(document.body, { childList: true, subtree: true })
	}
	// Слайдер языка: перетаскивание мышью + клик
	var slider = document.getElementById("langSlider")
	var knob = document.getElementById("langKnob")
	if (slider && knob) {
		var maxRight = 30 // ширина дорожки = knob 28px + padding 1px*2 = 30px хода
		if (GN_LANG === "ky") knob.style.transform = "translateX(" + maxRight + "px)"
		var dragging = false
		var startX = 0
		var startPos = 0
		function getCurPos() {
			var m = (knob.style.transform || "").match(/translateX\((\-?\d+)/)
			return m ? parseInt(m[1]) : 0
		}
		function setPos(p) {
			knob.style.transform = "translateX(" + Math.max(0, Math.min(maxRight, p)) + "px)"
		}
		function commit() {
			var p = getCurPos()
			var newLang = p > maxRight / 2 ? "ky" : "ru"
			if (newLang !== GN_LANG) {
				GN_LANG = newLang
				try { localStorage.setItem("gn_lang", GN_LANG) } catch (e) {}
				location.reload()
			} else {
				setPos(newLang === "ky" ? maxRight : 0)
			}
		}
		knob.addEventListener("mousedown", function (e) {
			e.preventDefault()
			dragging = true
			startX = e.clientX
			startPos = getCurPos()
		})
		document.addEventListener("mousemove", function (e) {
			if (!dragging) return
			setPos(startPos + (e.clientX - startX))
		})
		document.addEventListener("mouseup", function () {
			if (!dragging) return
			dragging = false
			commit()
		})
		slider.addEventListener("click", function (e) {
			if (e.target === knob) return
			GN_LANG = GN_LANG === "ru" ? "ky" : "ru"
			try { localStorage.setItem("gn_lang", GN_LANG) } catch (e) {}
			location.reload()
		})
	}
	// Логотип-картинка: если админ загрузил, показываем вместо букв GN
	try {
		var logo = localStorage.getItem("gn_logo")
		if (logo) {
			var mark = document.querySelector(".brand-mark")
			if (mark) { mark.innerHTML = ""; mark.style.backgroundImage = "url(" + logo + ")"; mark.style.backgroundSize = "cover"; mark.style.backgroundPosition = "center" }
		}
	} catch (e) {}
})
