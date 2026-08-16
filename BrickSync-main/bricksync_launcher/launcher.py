import subprocess
import sys
import os
import time
import webbrowser
import socket
import threading

# ── 경로 설정 ──────────────────────────────────────────────────────────
# PyInstaller로 패키징 시 server.exe는 _MEIPASS 임시 폴더에 추출됨
if getattr(sys, 'frozen', False):
    # BrickSync.exe로 실행 중 (PyInstaller)
    BASE_DIR = sys._MEIPASS
    SERVER_EXE = os.path.join(BASE_DIR, 'server.exe')
else:
    # 개발 중 (python launcher.py)
    SERVER_EXE = None  # 개발시엔 Python으로 직접 실행

PYTHON_EXE = sys.executable
_LAUNCHER_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_PY = os.path.join(_LAUNCHER_DIR, "..", "bricksync_project", "bridge_server", "server.py")
BRICKSYNC_URL = "https://www.bricksync.org/intro.html"

# Chrome 설치 경로 목록 (우선순위 순)
# C:\Program Files 를 최우선으로 (이 PC에서 발견된 경로)
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]

# ── 유틸리티 ────────────────────────────────────────────────────────────
def is_port_open(port=8000):
    """포트 8000이 열려있는지 확인"""
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False

def find_chrome():
    """Chrome 실행 파일 경로 탐색. 없으면 None 반환."""
    for path in CHROME_PATHS:
        if os.path.exists(path):
            return path
    return None

# ── 서버 시작 ────────────────────────────────────────────────────────────
def start_server():
    if is_port_open():
        return None  # 이미 실행 중

    if SERVER_EXE and os.path.exists(SERVER_EXE):
        # ✅ 배포판: 내장 server.exe 실행 (Python 불필요)
        cmd = [SERVER_EXE]
    else:
        # 🛠 개발판: python server.py 실행
        cmd = [PYTHON_EXE, SERVER_PY]

    # ✅ 실시간 시스템/포트나이트 연동 통신 터미널 콘솔 창 가시화 (CREATE_NEW_CONSOLE 사용)
    proc = subprocess.Popen(
        cmd,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    return proc

# ── 브라우저 오픈 ─────────────────────────────────────────────────────────
def open_browser_when_ready():
    """서버가 뜰 때까지 최대 10초 대기 후 Chrome으로 오픈"""
    for _ in range(20):
        if is_port_open():
            break
        time.sleep(0.5)

    chrome = find_chrome()
    if chrome:
        try:
            # ✅ Chrome은 GUI 앱이므로 CREATE_NO_WINDOW 플래그 없이 실행
            subprocess.Popen(
                [chrome, BRICKSYNC_URL],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            # Chrome 실행 실패 시 기본 브라우저로 폴백
            webbrowser.open(BRICKSYNC_URL)
    else:
        # Chrome 없음 → 기본 브라우저 사용 (폴백)
        webbrowser.open(BRICKSYNC_URL)

# ── 메인 ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    proc = start_server()

    t = threading.Thread(target=open_browser_when_ready, daemon=True)
    t.start()

    if proc:
        proc.wait()   # server.exe 종료될 때까지 대기
    else:
        t.join(timeout=15)  # 이미 실행 중이면 브라우저 열고 종료
