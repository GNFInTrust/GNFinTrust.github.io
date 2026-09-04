// ============================================================
// GN FinTrust — каталог, валюта и язык.
// Пока Firebase не настроен, данные берутся отсюда. После
// настройки каталогом управляют из admin.html.
// ВАЖНО: все цены вводятся в СОМАХ. Курс рубля — ниже (RUB_PER_KGS).
// ============================================================
var DEMO_PRODUCTS = []
	var DEMO_IDS = { "web-tax-basics": 1, "web-cashflow": 1, "course-accounting": 1, "course-fin-lit": 1 }

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
	return typeof v === "string" && (v.indexOf("https://") === 0 || v.indexOf("http://") === 0)
}

// Безопасная вставка видео-плеера: iframe создаётся через DOM, а не через innerHTML — защита от XSS
function safeEmbed(mount, url, title) {
	mount.textContent = ""
	var f = document.createElement("iframe")
	f.src = url
	f.loading = "lazy"
	f.setAttribute("allow", "autoplay; fullscreen")
	f.setAttribute("allowfullscreen", "")
	f.title = title || "Видео"
	mount.appendChild(f)
}

// Заголовок и описание материала с учётом выбранного языка (RU / KY).
// Если кыргызская версия не заполнена — показывается русская.
function locTitle(p) {
	return GN_LANG === "ky" && p.titleKy ? p.titleKy : p.title
}
function locDesc(p) {
	return GN_LANG === "ky" && p.descKy ? p.descKy : (p.desc || "")
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
	"Вход": "Кирүү",
	"Войти": "Кирүү",
	"Регистрация": "Каттоо",
	"Выйти": "Чыгуу",
		"Мой кабинет": "Менин кабинетим",
		"Кабинет": "Кабинет",
	"← На сайт": "← Сайтка",
	"← Назад в каталог": "← Каталогго кайтуу",
		"© 2026 GN FinTrust · Все права защищены": "© 2026 GN FinTrust · Бардык укуктар корголгон",
		"made by losdek": "made by losdek",
	"Вебинары · Семинары · Курсы": "Вебинарлар · Семинарлар · Курстар",
	"Финансовые навыки, которые": "Каржылык көндүмдөр —",
	"окупаются": "өз үзүрүн берет",
	"У каждого материала есть бесплатный анонс — смотрите прямо на сайте. Понравилось? Жмите «Купить» и оставляйте заявку — логин пришлём в WhatsApp, на почту или в Telegram.": "Ар бир материалдын акысыз анонсу бар — сайттан эле көрүңүз. Жактыбы? «Сатып алуу» баскычын басып, өтүнмө калтырыңыз — логинди WhatsApp, почта же Telegram аркылуу жөнөтөбүз.",
	"Что внутри": "Ичинде эмне бар",
	"Заплатили один раз — смотрите сколько хотите": "Бир жолу төлөдүңүз — каалаганча көрө бериңиз",
		"Новые материалы появляются здесь сразу после публикации.": "Жаңы материалдар жарыялангандан кийин дароо ушул жерде пайда болот.",
		"Пока вебинаров нет — загляните позже.": "Азырынча вебинарлар жок — кийин кирип көрүңүз.",
		"Пока курсов нет — загляните позже.": "Азырынча курстар жок — кийин кирип көрүңүз.",
		"Каталог пока пуст — скоро добавим материалы.": "Каталог азырынча бош — жакында материалдарды кошобуз.",
		"Кубатова Гулзат": "Кубатова Гулзат",
		"Чолпонбек кызы Назима": "Чолпонбек кызы Назима",
		"Болчурова Алия": "Болчурова Алия",
		"Основатель, главный эксперт": "Негиздөөчү, башкы эксперт",
		"Эксперт": "Эксперт",
		"Ведёт программу GN FinTrust: налоги, учёт и деньги в бизнесе — на практике, без теории ради теории.": "GN FinTrust программасын жүргүзөт: салыктар, эсеп жана бизнестеги акча — практикада, бош теориясыз.",
		"Отвечает предпринимателям на вебинарах и живых встречах — разбирает реальные кейсы.": "Вебинарларда жана жандуу жолугушууларда ишкерлерге жооп берет — чыныгы мисалдарды талдайт.",
		"Разбирает с вами материалы курсов и помогает дойти от просмотра до результата.": "Курстардын материалдарын сиз менен талдап, көрүүдөн жыйынтыкка жетүүгө жардам берет.",
	"Вебинары": "Вебинарлар",
	"Семинары": "Семинарлар",
	"Курсы": "Курстар",
	"Купить": "Сатып алуу",
	"Видео-анонс": "Видео-анонс",
	"Смотреть анонс": "Анонсту көрүү",
	"Видео-анонс появится позже": "Видео-анонс кийинчерээк чыгат",
	"Заявка на покупку": "Сатып алууга өтүнмө",
	"Без подписок: заплатили один раз — доступ ваш навсегда.": "Жазылуусуз: бир жолу төлөдүңүз — мүмкүнчүлүк түбөлүк сиздики.",
	"Способы оплаты": "Төлөм ыкмалары",
	"Способов оплаты пока нет": "Төлөм ыкмалары азырынча жок",
	"Мы ещё не подключили оплату на сайте. Оставьте заявку ниже — как только оплата заработает, сразу напишем вам и всё оформим.": "Сайтка төлөмдү али кошо элекпиз. Төмөндө өтүнмө калтырыңыз — төлөм иштей баштайт, дароо сизге жазып, баарын тариздеп беребиз.",
	"Оставьте заявку": "Өтүнмө калтырыңыз",
	"Напишите, куда с вами связаться, — ответим лично и расскажем, как получить материал.": "Кайсыл жерден байланышабыз деп жазыңыз — жеке жооп берип, материалды кантип аларыңызды айтып беребиз.",
	"Отправить заявку": "Өтүнмө жөнөтүү",
	"Заявка у нас!": "Өтүнмө бизде!",
	"Скоро напишем вам сюда:": "Жакында сизге ушул жерге жазабыз:",
	"Оставьте контакт": "Байланышыңызды калтырыңыз",
	"— иначе мы не сможем вам написать.": "— болбосо сизге жаза албай калабыз.",
	"Не получилось отправить заявку:": "Өтүнмөнү жөнөтүү ишке ашкан жок:",
	"Способ связи": "Байланыш ыкмасы",
	"Почта": "Почта",
	"Ваш номер WhatsApp": "WhatsApp номериңиз",
	"Ваша почта": "Почтаңыз",
	"Ваш Telegram": "Сиздин Telegram",
	"Ваше имя": "Атыңыз",
	"Вебинар": "Вебинар",
	"Семинар": "Семинар",
	"Курс": "Курс",
	"Войдите с логином и паролем из письма, которое мы прислали после покупки.": "Сатып алгандан кийин жөнөткөн каттагы логин жана сырсөз менен кириңиз.",
	"Войти через Google": "Google аркылуу кирүү",
	"или по почте": "же почта аркылуу",
	"Пароль": "Сырсөз",
	"Не менее 6 символов": "Кеминде 6 белги",
	"Купили, а логин не пришёл? Проверьте WhatsApp, почту и Telegram — мы отправляем доступ туда после подтверждения оплаты.": "Сатып алдыңыз, бирок логин келген жокпу? WhatsApp, почта жана Telegram'ды караңыз — төлөм тастыкталгандан кийин кирүү маалыматын ошол жакка жөнөтөбүз.",
	"Пока пусто": "Азырынча бош",
	"Здесь пока ничего нет. Если уже оплатили, а покупки не видно — напишите нам, добавим вручную.": "Бул жерде азырынча эч нерсе жок. Төлөгөн болсоңуз, бирок сатып алуу көрүнбөсө — бизге жазыңыз, кол менен кошуп коёбуз.",
	"Открыть каталог": "Каталогду ачуу",
	"Мои покупки": "Менин сатып алууларым",
	"← Мои покупки": "← Менин сатып алууларым",
	"С возвращением! Вот всё, что вы уже купили:": "Кайра келишиңиз менен! Мына сиз сатып алгандардын баары:",
	"Нажмите на материал, чтобы открыть его.": "Материалды ачуу үчүн басыңыз.",
	"Купите": "Сатып алыңыз",
	"Панель админа": "Админ панели",
	"Закрыть": "Жабуу",
	"Админ": "Админ",
	"Только для админов": "Админдер үчүн гана",
	"Наша команда": "Биздин команда",
	"Кто ведёт вебинары и отвечает на ваши вопросы.": "Вебинарларды ким жүргүзөт жана суроолоруңузга ким жооп берет.",
	"Вебинары. Семинары. Курсы.": "Вебинарлар. Семинарлар. Курстар.",
	"GN FinTrust — практические финансы": "GN FinTrust — практикалык финансы",
		"Живые встречи с экспертами. Выбирайте дату в календаре и записывайтесь.": "Эксперттер менен жандуу жолугушуулар. Календардан күндү тандап, жазылыңыз.",
		"Выберите свободное время — запись прямо на этой странице.": "Бош убакытты тандаңыз — жазылуу ушул баракта.",
		"Расписание ведёт Cal.com · часовой пояс Asia/Bishkek": "Ырааттаманы Cal.com жүргүзөт · убакыт алкагы Asia/Bishkek",
	"Подпишитесь на наш Instagram — подарим одно видео бесплатно.": "Биздин Instagram'га жазылыңыз — бир видеону акысыз белекке беребиз.",
	"Получить": "Алуу",
	"Бесплатное видео за подписку": "Жазылуу үчүн акысыз видео",
	"Подпишитесь на": "Жазылыңыз:",
	"наш Instagram": "биздин Instagram",
	"и укажите свой ник — как только проверим подписку, добавим видео в ваш кабинет.": "жана нигиңизди жазыңыз — жазылууну текшергенден кийин видеону кабинетиңизге кошобуз.",
	"Ваш ник в Instagram, например @user": "Instagram'дагы нигиңиз, мисалы @user",
	"Привязать и получить": "Байлап, алуу",
	"Заявка отправлена — проверим подписку и добавим видео в ваш кабинет.": "Өтүнмө жөнөтүлдү — жазылууну текшерип, видеону кабинетиңизге кошобуз.",
	"Люди за курсами": "Курстардын артындагы адамдар",
	"Живые встречи": "Жандуу жолугушуулар",
	"Вебинары, семинары и курсы по финансам и бухгалтерии — берите и применяйте в работе.": "Каржы жана бухгалтерия боюнча вебинарлар, семинарлар жана курстар — алып, ишиңизде колдонуңуз.",
	"К каталогу": "Каталогго",
	"Не передавайте аккаунт другим — с каждой покупки мы делаем новые материалы.": "Аккаунтуңузду башкаларга бербеңиз — ар бир сатып алуу жаңы материалдарга жардам берет.",
	"Скоро покажем видео — админ ещё не прикрепил его.": "Видеону жакында көрсөтөбүз — админ аны али тиркей элек.",
	"Что-то пошло не так": "Бир нерсе туура болбой калды",
	"Не удалось загрузить ваши покупки. Обновите страницу или попробуйте позже.": "Сатып алууларыңыз жүктөлгөн жок. Баракты жаңылап же кийинчерээк аракет кылып көрүңүз.",
	"К странице входа": "Кирүү барагына",
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
		var maxRight = 34 // ход ползунка: дорожка 64px внутри, ползунок 28px, отступы по 1px
		knob.textContent = GN_LANG === "ky" ? "KG" : "RU"
		if (GN_LANG === "ky") knob.style.transform = "translateX(" + maxRight + "px)"
		var dragging = false
		var moved = false
		var startX = 0
		var startPos = 0
		function getCurPos() {
			var m = (knob.style.transform || "").match(/translateX\((\-?\d+)/)
			return m ? parseInt(m[1]) : 0
		}
		function setPos(p) {
			knob.style.transform = "translateX(" + Math.max(0, Math.min(maxRight, p)) + "px)"
		}
		function toggleLang() {
			var newLang = GN_LANG === "ru" ? "ky" : "ru"
			GN_LANG = newLang
			try { localStorage.setItem("gn_lang", GN_LANG) } catch (e) {}
			knob.textContent = newLang === "ky" ? "KG" : "RU"
			setPos(newLang === "ky" ? maxRight : 0)
			setTimeout(function(){ location.reload() }, 300)
		}
		function commit() {
			var p = getCurPos()
			var newLang = p > maxRight / 2 ? "ky" : "ru"
			if (newLang !== GN_LANG) {
				GN_LANG = newLang
				try { localStorage.setItem("gn_lang", GN_LANG) } catch (e) {}
				knob.textContent = newLang === "ky" ? "KG" : "RU"
				setPos(newLang === "ky" ? maxRight : 0)
				setTimeout(function(){ location.reload() }, 300)
			} else {
				setPos(newLang === "ky" ? maxRight : 0)
			}
		}
		knob.addEventListener("mousedown", function (e) {
			e.preventDefault()
			dragging = true
			moved = false
			startX = e.clientX
			startPos = getCurPos()
			knob.classList.add("dragging")
		})
		document.addEventListener("mousemove", function (e) {
			if (!dragging) return
			if (Math.abs(e.clientX - startX) > 2) moved = true
			setPos(startPos + (e.clientX - startX))
		})
		document.addEventListener("mouseup", function () {
			if (!dragging) return
			dragging = false
			knob.classList.remove("dragging")
			if (!moved) { toggleLang(); return }
			commit()
		})
		slider.addEventListener("click", function (e) {
			if (e.target === knob) return
			toggleLang()
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
		try {
			if (localStorage.getItem("gn_auth") === "1") {
				var acc = document.querySelector(".nav-account")
				if (acc && acc.getAttribute("href") === "login.html") {
					acc.textContent = "Кабинет"
					acc.href = "members.html"
				}
			}
		} catch (e) {}
		var toggle = document.getElementById("navToggle")
		var nav = document.getElementById("siteNav")
		if (toggle && nav && !toggle.dataset.bound) {
			toggle.dataset.bound = "1"
			toggle.addEventListener("click", function () {
				var open = nav.classList.toggle("open")
				toggle.setAttribute("aria-expanded", open ? "true" : "false")
			})
			nav.addEventListener("click", function (e) {
				if (e.target.closest("a")) {
					nav.classList.remove("open")
					toggle.setAttribute("aria-expanded", "false")
				}
			})
		}
	})
