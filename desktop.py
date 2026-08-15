# Native Windows window for GN Tools (WebView2 — not Chrome, not a browser tab).
import os
import socket
import subprocess
import sys
import time
import urllib.request

PORT = 3390
URL = "http://127.0.0.1:%d/" % PORT


def _install_dir():
    if getattr(sys, "frozen", False):
        here = os.path.dirname(sys.executable)
        if os.path.isfile(os.path.join(here, "index.js")):
            return here
        local = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "GNFinTrust", "GNTools")
        if os.path.isfile(os.path.join(local, "index.js")):
            return local
        return here
    here = os.path.dirname(os.path.abspath(__file__))
    client = os.path.join(here, "GNTools-client")
    if os.path.isfile(os.path.join(client, "index.js")):
        return client
    return here


def _port_open():
    s = socket.socket()
    s.settimeout(0.4)
    try:
        s.connect(("127.0.0.1", PORT))
        return True
    except OSError:
        return False
    finally:
        try:
            s.close()
        except OSError:
            pass


def _start_backend(install_dir):
    if _port_open():
        return None
    node = os.path.join(install_dir, "node.exe")
    index_js = os.path.join(install_dir, "index.js")
    if not os.path.isfile(node) or not os.path.isfile(index_js):
        raise FileNotFoundError("GN Tools ещё не установлен. Запустите установщик.")
    env = os.environ.copy()
    env["GNTOOLS_NO_BROWSER"] = "1"
    kwargs = {"cwd": install_dir, "env": env}
    if os.name == "nt":
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        kwargs["startupinfo"] = subprocess.STARTUPINFO()
        kwargs["startupinfo"].dwFlags |= subprocess.STARTF_USESHOWWINDOW
    return subprocess.Popen([node, index_js], **kwargs)


def _wait_ready(seconds=25):
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            urllib.request.urlopen(URL, timeout=1).read(32)
            return True
        except Exception:
            time.sleep(0.25)
    return _port_open()


def run_app():
    import webview

    install_dir = _install_dir()
    proc = _start_backend(install_dir)
    if not _wait_ready():
        if proc:
            try:
                proc.terminate()
            except Exception:
                pass
        raise RuntimeError("Не удалось запустить GN Tools.")

    icon = os.path.join(install_dir, "favicon.ico")
    window = webview.create_window(
        "GN Tools",
        URL,
        width=1280,
        height=820,
        min_size=(900, 620),
        confirm_close=False,
        text_select=True,
    )
    kwargs = {"debug": False}
    if os.path.isfile(icon):
        kwargs["icon"] = icon
    try:
        webview.start(gui="edgechromium", **kwargs)
    except Exception as e:
        raise RuntimeError(
            "Не удалось открыть окно GN Tools.\n"
            "Нужен Microsoft Edge WebView2 Runtime (это не браузер Chrome).\n"
            "Скачайте: https://go.microsoft.com/fwlink/p/?LinkId=2124703\n\n" + str(e)
        )
    if proc and proc.poll() is None:
        try:
            proc.terminate()
        except Exception:
            pass


if __name__ == "__main__":
    run_app()
