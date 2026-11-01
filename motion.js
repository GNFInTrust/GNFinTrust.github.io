// GN FinTrust — shared motion for the catalog, GN Tools and booking pages (the home page has its own copy).
// Load after catalog.js: headlines are translated (KG) before they are split into words.
;(function () {
	var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

	// Оборачиваем слова в <span class="w">. Делим только по обычным пробелам: &nbsp; держит слова вместе
	function splitWords(root) {
		if (typeof gnTranslate === "function") gnTranslate(root)
		var n = 0
		;(function walk(node) {
			Array.prototype.slice.call(node.childNodes).forEach(function (c) {
				if (c.nodeType === 3) {
					var frag = document.createDocumentFragment()
					c.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
						if (!part) return
						if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return }
						var w = document.createElement("span")
						w.className = "w"
						w.style.setProperty("--i", n++)
						w.textContent = part
						frag.appendChild(w)
					})
					c.parentNode.replaceChild(frag, c)
				} else if (c.nodeType === 1) walk(c)
			})
		})(root)
	}

	if (!reduce) document.querySelectorAll(".words").forEach(splitWords)
	var lits = Array.prototype.slice.call(document.querySelectorAll(".band-lit"))
	lits.forEach(function (l) {
		splitWords(l)
		l.querySelectorAll(".hl .w").forEach(function (w) { w.classList.add("hl") })
	})

	// Появление при прокрутке; внутри [data-stagger] — по очереди
	document.querySelectorAll("[data-stagger]").forEach(function (g) {
		var step = +g.getAttribute("data-stagger") || 110
		g.querySelectorAll(":scope > .reveal").forEach(function (c, i) { c.style.setProperty("--d", i * step + "ms") })
	})
	var items = document.querySelectorAll(".reveal")
	if (reduce || !("IntersectionObserver" in window)) {
		items.forEach(function (n) { n.classList.add("show") })
	} else {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (!e.isIntersecting) return
				var el = e.target
				el.classList.add("show")
				io.unobserve(el)
				// После появления убираем задержку, чтобы наведение откликалось сразу
				setTimeout(function () { el.style.removeProperty("--d") }, 1600)
			})
		}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
		items.forEach(function (n) { io.observe(n) })
	}

	var header = document.querySelector(".site-header")
	var bands = Array.prototype.slice.call(document.querySelectorAll(".band"))
	var litWords = lits.map(function (l) { return l.querySelectorAll(".w") })
	function onScroll() {
		// Над чёрной полосой шапка становится тёмной
		if (header && bands.length) {
			var mid = header.offsetHeight / 2, dark = false
			bands.forEach(function (b) { var r = b.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) dark = true })
			header.classList.toggle("dark", dark)
		}
		// Слова загораются, пока абзац проходит от низа экрана до его середины
		var vh = window.innerHeight
		lits.forEach(function (l, k) {
			var ws = litWords[k], r = l.getBoundingClientRect()
			var p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)))
			var on = Math.round(p * ws.length)
			for (var i = 0; i < ws.length; i++) ws[i].classList.toggle("on", i < on)
		})
	}
	var ticking = false
	window.addEventListener("scroll", function () {
		if (ticking) return
		ticking = true
		window.requestAnimationFrame(function () { onScroll(); ticking = false })
	}, { passive: true })
	window.addEventListener("resize", onScroll)
	onScroll()
})()
