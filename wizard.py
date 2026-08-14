# GN Tools Wizard — installer + in-place updater
# Build: pyinstaller --noconfirm --onefile --windowed --name GNTools wizard.py
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import zipfile
from datetime import datetime

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

APP_NAME = "GN Tools"
VERSION = "4.3.0"
GITHUB_RELEASES = "https://github.com/GNFinTrust/GNFinTrust.github.io/releases/download/gntools"
APP_FILES_URL = GITHUB_RELEASES + "/GNTools-client.zip"
NODE_URL = "https://nodejs.org/dist/v18.20.8/win-x64/node.exe"

INSTALL_DIR = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "GNFinTrust", "GNTools")
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")

RED = "#C8102E"
RED_DARK = "#A00E24"
RED_SOFT = "#FBE9EC"
WHITE = "#FFFFFF"
TEXT = "#211D1D"
TEXT2 = "#6E6867"
SOFT = "#FAF7F6"
BORDER = "#E8E2E1"
GREEN = "#2F7351"
BG = SOFT

KEEP_ON_UPDATE = {
    "config.txt",
    "license_session.json",
    "processed_cache.json",
    "wizard_config.json",
    "node.exe",
    "GN Tools.bat",
}
KEEP_DIRS = {".wwebjs_auth", "node_modules"}


def _exists_install(folder):
    return bool(folder) and os.path.isfile(os.path.join(folder, "index.js"))


def _read_version(folder):
    cfg = os.path.join(folder, "wizard_config.json")
    if os.path.isfile(cfg):
        try:
            with open(cfg, "r", encoding="utf-8") as f:
                return str(json.load(f).get("version") or "")
        except Exception:
            pass
    pkg = os.path.join(folder, "package.json")
    if os.path.isfile(pkg):
        try:
            with open(pkg, "r", encoding="utf-8") as f:
                return str(json.load(f).get("version") or "")
        except Exception:
            pass
    return ""


def find_existing_install():
    seen = []
    cfg_candidates = [
        os.path.join(INSTALL_DIR, "wizard_config.json"),
        os.path.join(os.path.dirname(sys.executable), "wizard_config.json"),
    ]
    for cfg in cfg_candidates:
        if not os.path.isfile(cfg):
            continue
        try:
            with open(cfg, "r", encoding="utf-8") as f:
                data = json.load(f)
            folder = data.get("install_dir") or os.path.dirname(cfg)
            if _exists_install(folder) and folder not in seen:
                seen.append(folder)
                return folder, data.get("version") or _read_version(folder)
        except Exception:
            pass
    for folder in (INSTALL_DIR, os.path.dirname(sys.executable)):
        if _exists_install(folder):
            return folder, _read_version(folder)
    return "", ""


def flatten_zip_prefix(names):
    tops = set()
    for name in names:
        name = name.replace("\\", "/").strip("/")
        if not name or name.startswith("__MACOSX"):
            continue
        tops.add(name.split("/", 1)[0])
    if len(tops) == 1:
        prefix = next(iter(tops)) + "/"
        if any(n.replace("\\", "/").startswith(prefix) and n.replace("\\", "/") != prefix.rstrip("/") for n in names):
            return prefix
    return ""


class GNWizard:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("GN Tools Wizard v" + VERSION)
        self.root.minsize(640, 620)
        self.root.resizable(True, True)
        self.root.configure(bg=BG)
        self._set_icon()
        self.root.update_idletasks()
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        w = min(760, max(680, sw - 80))
        h = min(780, max(660, sh - 80))
        x = max(0, (sw - w) // 2)
        y = max(0, (sh - h) // 2)
        self.root.geometry("%dx%d+%d+%d" % (w, h, x, y))

        found, found_ver = find_existing_install()
        self.existing_dir = found
        self.existing_ver = found_ver
        self.mode = tk.StringVar(value="update" if found else "install")

        self.step = 0
        self.install_path = tk.StringVar(value=found or INSTALL_DIR)
        self.progress_var = tk.DoubleVar(value=0)
        self.log_text = tk.StringVar(value="Готов к установке..." if not found else "Найдена установленная копия — можно обновить.")
        self.desk_shortcut = tk.BooleanVar(value=not bool(found))
        self.auto_launch = tk.BooleanVar(value=True)
        self.build_ui()
        self.show_step(0)

    def _set_icon(self):
        bases = [
            getattr(sys, "_MEIPASS", ""),
            os.path.dirname(os.path.abspath(__file__)),
            os.path.dirname(sys.executable),
            os.getcwd(),
        ]
        names = ("favicon.ico", os.path.join("GNTools-client", "favicon.ico"))
        for base in bases:
            if not base:
                continue
            for name in names:
                path = os.path.join(base, name)
                if os.path.isfile(path):
                    try:
                        self.root.iconbitmap(path)
                        return
                    except Exception:
                        pass
        try:
            self.root.iconname("GN Tools")
        except Exception:
            pass

    def build_ui(self):
        header = tk.Frame(self.root, bg=RED, height=64)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        logo_frame = tk.Frame(header, bg=RED)
        logo_frame.pack(side=tk.LEFT, padx=18)
        logo = tk.Label(logo_frame, text="GN", font=("Georgia", 22, "bold"), fg=WHITE, bg=RED)
        logo.pack(side=tk.LEFT)
        title = tk.Label(header, text="GN Tools · Установщик", font=("Segoe UI", 18, "bold"), fg=WHITE, bg=RED)
        title.pack(side=tk.LEFT, padx=(10, 0))
        ver = tk.Label(header, text="v" + VERSION, font=("Segoe UI", 10), fg="#F2C6CE", bg=RED)
        ver.pack(side=tk.RIGHT, padx=18)

        wrap = tk.Frame(self.root, bg=BG)
        wrap.pack(fill=tk.BOTH, expand=True)
        self.canvas = tk.Canvas(wrap, bg=BG, highlightthickness=0, bd=0)
        self.scroll = ttk.Scrollbar(wrap, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.scroll.set)
        self.scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.content = tk.Frame(self.canvas, bg=BG)
        self._win = self.canvas.create_window((0, 0), window=self.content, anchor="nw")
        self.content.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.bind("<Configure>", lambda e: self.canvas.itemconfigure(self._win, width=e.width))
        self.canvas.bind_all("<MouseWheel>", lambda e: self.canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"))
        self.content.configure(padx=28, pady=16)

        indicator = tk.Frame(self.root, bg=BG)
        indicator.pack(fill=tk.X, padx=24)
        self.dots = []
        self.dot_labels = []
        labels = ("Приветствие", "Загрузка", "Установка", "Готово")
        for i, text in enumerate(labels):
            col = tk.Frame(indicator, bg=BG)
            col.pack(side=tk.LEFT, expand=True)
            dot = tk.Canvas(col, width=14, height=14, bg=BG, highlightthickness=0)
            dot.pack()
            self.dots.append(dot)
            lbl = tk.Label(col, text=text, font=("Segoe UI", 8), fg=TEXT2, bg=BG)
            lbl.pack()
            self.dot_labels.append(lbl)

        self.progress_frame = tk.Frame(self.root, bg=BG)
        self.progress_frame.pack(fill=tk.X, padx=24, pady=(8, 0))
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass
        style.configure(
            "red.Horizontal.TProgressbar",
            background=RED,
            troughcolor=RED_SOFT,
            bordercolor=BORDER,
            lightcolor=RED,
            darkcolor=RED_DARK,
        )
        self.progress = ttk.Progressbar(self.progress_frame, variable=self.progress_var, maximum=100, style="red.Horizontal.TProgressbar")
        self.progress.pack(fill=tk.X)
        self.log_label = tk.Label(self.progress_frame, textvariable=self.log_text, font=("Segoe UI", 9), fg=TEXT2, bg=BG, anchor="w", wraplength=700, justify="left")
        self.log_label.pack(fill=tk.X, pady=(4, 0))

        nav = tk.Frame(self.root, bg=BG)
        nav.pack(fill=tk.X, padx=24, pady=18)
        self.btn_back = tk.Button(
            nav, text="← Назад", font=("Segoe UI", 10, "bold"), bg=SOFT, fg=TEXT,
            relief="solid", borderwidth=1, activebackground=WHITE, cursor="hand2", command=self.prev_step
        )
        self.btn_back.pack(side=tk.LEFT, ipadx=10, ipady=4)
        self.btn_next = tk.Button(
            nav, text="Далее →", font=("Segoe UI", 10, "bold"), bg=RED, fg=WHITE,
            relief="flat", borderwidth=0, activebackground=RED_DARK, activeforeground=WHITE,
            cursor="hand2", command=self.next_step
        )
        self.btn_next.pack(side=tk.RIGHT, ipadx=14, ipady=6)

    def draw_dots(self, active):
        for i, dot in enumerate(self.dots):
            dot.delete("all")
            color = RED if i <= active else BORDER
            fill = RED if i <= active else WHITE
            dot.create_oval(2, 2, 12, 12, outline=color, fill=fill, width=2)
            self.dot_labels[i].configure(fg=TEXT if i <= active else TEXT2)

    def show_step(self, n):
        self.step = n
        self.draw_dots(n)
        for w in self.content.winfo_children():
            w.destroy()
        if n == 0:
            self.show_welcome()
            self.btn_back.configure(state="disabled", fg=TEXT2)
            self.btn_next.configure(text="Далее →", state="normal", command=self.next_step)
        elif n == 1:
            self.show_install_options()
            self.btn_back.configure(state="normal", fg=TEXT)
            updating = self.mode.get() == "update" and _exists_install(self.install_path.get())
            self.btn_next.configure(text="Обновить →" if updating else "Установить →", state="normal", command=self.next_step)
        elif n == 2:
            self.show_progress()
            self.btn_back.configure(state="disabled", fg=TEXT2)
            self.btn_next.configure(text="Начать загрузку →", state="disabled")
            self.start_install()
        else:
            self.show_done()
            self.btn_back.configure(state="disabled", fg=TEXT2)
            self.btn_next.configure(text="Запустить GN Tools", state="normal", command=self.launch_app)

    def prev_step(self):
        if self.step > 0:
            self.show_step(self.step - 1)

    def next_step(self):
        if self.step < 3:
            self.show_step(self.step + 1)
        else:
            self.launch_app()

    def show_welcome(self):
        f = tk.Frame(self.content, bg=BG)
        f.pack(fill=tk.BOTH, expand=True)
        if self.existing_dir:
            tk.Label(f, text="GN Tools уже установлен", font=("Georgia", 18, "bold"), fg=TEXT, bg=BG).pack(anchor="w", pady=(0, 8))
            ver = self.existing_ver or "неизвестно"
            desc = (
                "Найдена копия на этом компьютере.\n"
                "Текущая версия: " + ver + "  →  новая: " + VERSION + "\n"
                "Папка: " + self.existing_dir + "\n\n"
                "Обновление заменит только файлы программы.\n"
                "Node.js, вход, WhatsApp-сессия и Excel не удаляются."
            )
            tk.Label(f, text=desc, font=("Segoe UI", 11), fg=TEXT2, bg=BG, justify="left", wraplength=680).pack(fill=tk.X, pady=(0, 14))
            box = tk.LabelFrame(f, text="Что сделать", fg=TEXT2, bg=BG)
            box.pack(fill=tk.X)
            tk.Radiobutton(
                box, text="Обновить — без полной переустановки (рекомендуется)",
                variable=self.mode, value="update", bg=BG, fg=TEXT, selectcolor=WHITE,
                activebackground=BG, font=("Segoe UI", 10), anchor="w"
            ).pack(fill=tk.X, padx=8, pady=4)
            tk.Radiobutton(
                box, text="Установить заново — скачать всё с нуля в выбранную папку",
                variable=self.mode, value="install", bg=BG, fg=TEXT, selectcolor=WHITE,
                activebackground=BG, font=("Segoe UI", 10), anchor="w"
            ).pack(fill=tk.X, padx=8, pady=(0, 8))
            return

        tk.Label(f, text="Добро пожаловать в GN Tools", font=("Georgia", 18, "bold"), fg=TEXT, bg=BG).pack(anchor="w", pady=(0, 8))
        tk.Label(
            f,
            text="WhatsApp, Instagram и Telegram → Excel.\nДокументы на отгрузку: упаковочный лист, ТТН, ТН, CMR.\n\nЭтот мастер установит всё автоматически:",
            font=("Segoe UI", 11), fg=TEXT2, bg=BG, justify="left", wraplength=680
        ).pack(fill=tk.X, pady=(0, 14))
        features = (
            ("📱", "Бот WhatsApp → Excel (Opus 4.6 = 1 ток./чат)"),
            ("📸", "Instagram и Telegram в ту же таблицу"),
            ("📄", "4 документа на отгрузку (базовое + AI)"),
            ("🔑", "Общий аккаунт с сайтом GN FinTrust"),
            ("⚡", "Бесплатные пробные токены для новых аккаунтов"),
        )
        for icon, text in features:
            row = tk.Frame(f, bg=BG)
            row.pack(fill=tk.X, pady=2)
            tk.Label(row, text=icon, font=("Segoe UI", 12), bg=BG).pack(side=tk.LEFT)
            tk.Label(row, text=text, font=("Segoe UI", 10), fg=TEXT, bg=BG).pack(side=tk.LEFT, padx=8)

    def show_install_options(self):
        f = tk.Frame(self.content, bg=BG)
        f.pack(fill=tk.BOTH, expand=True)
        updating = self.mode.get() == "update" and _exists_install(self.existing_dir or self.install_path.get())
        if updating and self.existing_dir:
            self.install_path.set(self.existing_dir)
        tk.Label(f, text="Обновление" if updating else "Настройки установки", font=("Georgia", 16, "bold"), fg=TEXT, bg=BG).pack(anchor="w")
        tk.Label(f, text="Папка установки", font=("Segoe UI", 10), fg=TEXT2, bg=BG).pack(anchor="w", pady=(12, 4))
        path_row = tk.Frame(f, bg=BG)
        path_row.pack(fill=tk.X)
        path_entry = tk.Entry(path_row, textvariable=self.install_path, font=("Segoe UI", 10), bg=WHITE, relief="solid", bd=1)
        path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=4)
        if updating:
            path_entry.configure(state="readonly")
        else:
            tk.Button(path_row, text="Обзор", command=self.browse_folder, cursor="hand2", relief="solid", bd=1, bg=WHITE).pack(side=tk.LEFT, padx=(8, 0), ipady=2, ipadx=8)
        opts = tk.LabelFrame(f, text="Дополнительно", fg=TEXT2, bg=BG)
        opts.pack(fill=tk.X, pady=16)
        if updating:
            tk.Label(
                opts,
                text="Будут заменены только файлы программы (index.js, интерфейс, конвертер).\nСохранятся: вход, токены, WhatsApp-сессия, config.txt, Excel и Node.js.",
                font=("Segoe UI", 9), fg=TEXT2, bg=BG, justify="left", wraplength=640
            ).pack(anchor="w", padx=8, pady=8)
        tk.Checkbutton(opts, text="Создать ярлык на рабочем столе", variable=self.desk_shortcut, bg=BG, fg=TEXT, selectcolor=WHITE, activebackground=BG).pack(anchor="w", padx=8, pady=2)
        tk.Checkbutton(opts, text="Запустить после установки", variable=self.auto_launch, bg=BG, fg=TEXT, selectcolor=WHITE, activebackground=BG).pack(anchor="w", padx=8, pady=(0, 8))
        tk.Label(f, text="Требуется ~120 МБ свободного места" if not updating else "Обновление занимает меньше минуты при хорошем интернете", font=("Segoe UI", 9), fg=TEXT2, bg=BG).pack(anchor="w")

    def browse_folder(self):
        d = filedialog.askdirectory(title="Выберите папку для установки")
        if d:
            self.install_path.set(os.path.join(d, "GNTools"))

    def show_progress(self):
        f = tk.Frame(self.content, bg=BG)
        f.pack(fill=tk.BOTH, expand=True)
        updating = self.mode.get() == "update"
        tk.Label(f, text="Обновление GN Tools" if updating else "Установка GN Tools", font=("Georgia", 16, "bold"), fg=TEXT, bg=BG).pack(anchor="w")
        self.step2_detail = tk.Label(f, text="Подготовка...", font=("Segoe UI", 11), fg=TEXT, bg=BG)
        self.step2_detail.pack(anchor="w", pady=(12, 0))
        self.step2_sub = tk.Label(f, text="", font=("Segoe UI", 9), fg=TEXT2, bg=BG)
        self.step2_sub.pack(anchor="w")

    def update_progress(self, pct, detail, sub=""):
        self.root.after(0, lambda: self.progress_var.set(pct))
        self.root.after(0, lambda: self.log_text.set(detail))
        if hasattr(self, "step2_detail"):
            self.root.after(0, lambda: self.step2_detail.configure(text=detail))
        if hasattr(self, "step2_sub"):
            self.root.after(0, lambda: self.step2_sub.configure(text=sub))

    def start_install(self):
        t = threading.Thread(target=self._do_install, daemon=True)
        t.start()

    def _download(self, url, dest, desc):
        self.update_progress(self.progress_var.get(), desc, "Подключение...")
        req = urllib.request.Request(url, headers={"User-Agent": "GNTools-Wizard/1.1"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            total = int(resp.headers.get("Content-Length") or 0)
            downloaded = 0
            blocksize = 64 * 1024
            os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
            with open(dest, "wb") as f:
                while True:
                    chunk = resp.read(blocksize)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = min(99, downloaded * 100 / total)
                        mb = downloaded / (1024 * 1024)
                        all_mb = total / (1024 * 1024)
                        self.update_progress(max(self.progress_var.get(), pct * 0.35 + 20), desc, f"{mb:.1f} / {all_mb:.1f} МБ")

    def _extract_zip(self, zip_path, install_dir, updating):
        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            prefix = flatten_zip_prefix(names)
            for info in zf.infolist():
                name = info.filename.replace("\\", "/")
                if name.endswith("/") or name.startswith("__MACOSX"):
                    continue
                rel = name[len(prefix):] if prefix and name.startswith(prefix) else name
                rel = rel.lstrip("/")
                if not rel:
                    continue
                top = rel.split("/", 1)[0]
                if top in KEEP_DIRS and updating:
                    continue
                base = os.path.basename(rel)
                dest = os.path.join(install_dir, rel.replace("/", os.sep))
                if updating and (base in KEEP_ON_UPDATE) and os.path.exists(dest):
                    continue
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with zf.open(info) as src, open(dest, "wb") as out:
                    shutil.copyfileobj(src, out)

    def _extract_bundled(self, install_dir):
        os.makedirs(install_dir, exist_ok=True)
        stub = (
            "// GN Tools stub — будет обновлен при первом запуске\n"
            "const http = require('http');\n"
            "const PORT = 3390;\n"
            "http.createServer((req, res) => {\n"
            "  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});\n"
            "  res.end('<html><body style=\"font-family:sans-serif;padding:40px;text-align:center\"><h1>GN Tools</h1><p>Загрузка...</p></body></html>');\n"
            "}).listen(PORT);\n"
        )
        index_path = os.path.join(install_dir, "index.js")
        if not os.path.exists(index_path):
            with open(index_path, "w", encoding="utf-8") as f:
                f.write(stub)

    def _create_shortcut(self, install_dir):
        bat_path = os.path.join(DESKTOP, "GN Tools.bat")
        try:
            with open(bat_path, "w", encoding="utf-8") as f:
                f.write('@echo off\ncd /d "' + install_dir + '"\nstart "" "' + os.path.join(install_dir, "node.exe") + '" index.js\nexit\n')
        except Exception:
            pass

    def _do_install(self):
        try:
            install_dir = self.install_path.get().strip() or INSTALL_DIR
            os.makedirs(install_dir, exist_ok=True)
            updating = self.mode.get() == "update" and _exists_install(install_dir)
            node_dest = os.path.join(install_dir, "node.exe")

            if updating and os.path.isfile(node_dest):
                self.update_progress(18, "Node.js уже есть — пропускаю загрузку", node_dest)
            else:
                self.update_progress(5, "Скачивание Node.js...", "портативная версия")
                try:
                    self._download(NODE_URL, node_dest, "Скачивание Node.js (портативная версия)")
                    self.update_progress(22, "Node.js загружен ✓")
                except Exception as e:
                    if os.path.isfile(node_dest):
                        self.update_progress(22, "Не удалось скачать Node.js, использую уже установленный")
                    else:
                        raise e

            app_zip = os.path.join(install_dir, "app.zip")
            self.update_progress(28, "Скачивание файлов приложения...")
            try:
                self._download(APP_FILES_URL, app_zip, "Скачивание GN Tools")
            except Exception as e:
                raise RuntimeError("Не удалось скачать файлы GN Tools.\n" + str(e))

            if app_zip and os.path.isfile(app_zip):
                self.update_progress(55, "Распаковка..." if not updating else "Обновляю файлы программы...")
                self._extract_zip(app_zip, install_dir, updating)
                try:
                    os.remove(app_zip)
                except Exception:
                    pass

            npm_cli = os.path.join(install_dir, "node_modules", "npm", "bin", "npm-cli.js")
            need_npm = not os.path.isdir(os.path.join(install_dir, "node_modules", "whatsapp-web.js"))
            if updating and not need_npm:
                self.update_progress(82, "Зависимости на месте — npm пропускаю")
            else:
                self.update_progress(70, "Установка npm-зависимостей...")
                try:
                    script = (
                        "const {execSync} = require('child_process');\n"
                        "try {\n"
                        "  execSync('npm install --omit=dev', {cwd: process.argv[1], stdio: 'pipe', timeout: 180000});\n"
                        "  console.log('OK');\n"
                        "} catch(e) { console.log('FAIL:' + e.message); }\n"
                    )
                    subprocess.run(
                        [node_dest, "-e", script, install_dir],
                        capture_output=True, text=True, timeout=200, cwd=install_dir
                    )
                except Exception:
                    pass

            if self.desk_shortcut.get():
                self.update_progress(90, "Создание ярлыков...")
                self._create_shortcut(install_dir)

            config_path = os.path.join(install_dir, "wizard_config.json")
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump({
                    "version": VERSION,
                    "install_dir": install_dir,
                    "installed_at": datetime.now().isoformat(timespec="seconds"),
                    "updated": updating,
                }, f, ensure_ascii=False, indent=2)

            self.update_progress(100, "Обновление завершено!" if updating else "Установка завершена!", "GN Tools готов к работе")
            if self.auto_launch.get():
                self.root.after(500, self.launch_app)
            else:
                self.root.after(400, lambda: self.show_step(3))
        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("Ошибка", "Не удалось скачать:\n" + str(e) + "\n\nПроверьте интернет-соединение.\n\n"))
            self.update_progress(self.progress_var.get(), "Ошибка: " + str(e), "")

    def show_done(self):
        f = tk.Frame(self.content, bg=BG)
        f.pack(fill=tk.BOTH, expand=True)
        updating = self.mode.get() == "update"
        tk.Label(f, text="✓", font=("Georgia", 40, "bold"), fg=GREEN, bg=BG).pack(pady=(10, 6))
        tk.Label(f, text="Обновление завершено!" if updating else "Установка завершена!", font=("Georgia", 18, "bold"), fg=TEXT, bg=BG).pack()
        info_frame = tk.Frame(f, bg=RED_SOFT, relief="solid", borderwidth=1)
        info_frame.pack(fill=tk.X, pady=(8, 14), ipady=8)
        tk.Label(
            info_frame,
            text=("GN Tools обновлён в:\n" if updating else "GN Tools установлен в:\n") + self.install_path.get(),
            font=("Segoe UI", 10), fg=RED_DARK, bg=RED_SOFT, justify="left", wraplength=640
        ).pack(anchor="w", padx=12)
        tips = (
            "Дважды кликните по GN Tools.bat на рабочем столе",
            "Войдите с аккаунтом сайта (email + пароль)",
            "Вход и WhatsApp-сессия сохранились" if updating else "Новый аккаунт получит бесплатные токены",
            "Купить токены: gnfintrust.github.io/gntools.html",
        )
        for tip in tips:
            tk.Label(f, text="• " + tip, font=("Segoe UI", 9), fg=TEXT2, bg=BG, anchor="w").pack(anchor="w", padx=4, pady=1)

    def launch_app(self):
        install_dir = self.install_path.get()
        node_exe = os.path.join(install_dir, "node.exe")
        index_js = os.path.join(install_dir, "index.js")
        if not (os.path.exists(node_exe) and os.path.exists(index_js)):
            messagebox.showwarning("Файлы не найдены", "Файлы приложения не найдены.\nЗапустите установщик заново.")
            return
        try:
            kwargs = {}
            if sys.platform == "win32":
                kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            subprocess.Popen([node_exe, index_js], cwd=install_dir, **kwargs)
            self.root.after(300, self.root.destroy)
        except Exception as e:
            messagebox.showerror("Ошибка", "Не удалось запустить:\n" + str(e))

    def run(self):
        self.root.mainloop()


def main():
    GNWizard().run()


if __name__ == "__main__":
    main()
