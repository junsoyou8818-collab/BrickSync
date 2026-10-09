import asyncio
from aiohttp import web

# BrickSync.exe 버전 (설정창의 "버전 확인"이 /api/version 으로 읽어 간다. exe를 새로 만들 때마다 올린다)
APP_VERSION = "1.3.0"
import json
import os
import threading
import time
import ctypes
import builtins

# ── 터미널에 찍히는 내용을 브릭싱크 화면의 "통신 로그"에도 똑같이 보낸다 ──────────────────
_ws_clients = set()        # 지금 연결된 브라우저들
_main_loop = None          # 웹소켓이 도는 이벤트 루프 (다른 스레드에서 보낼 때 사용)
_SKIP_BROADCAST = ("[LEGO HUB LOG]",)   # 웹앱이 이미 HUB 로그로 보여 주는 줄은 중복이라 뺀다

def _broadcast_log(text):
    loop = _main_loop
    if not loop or not _ws_clients:
        return
    if any(k in text for k in _SKIP_BROADCAST):
        return
    try:
        payload = json.dumps({"type": "SERVER_LOG", "msg": text, "t": time.strftime("%H:%M:%S")}, ensure_ascii=False)
        for client in list(_ws_clients):
            try:
                asyncio.run_coroutine_threadsafe(client.send_str(payload), loop)
            except Exception:
                pass
    except Exception:
        pass

def print(*args, **kwargs):
    """터미널 출력 + 연결된 브라우저의 통신 로그로 전송 (이 모듈 안의 모든 print 가 이 함수를 쓴다)"""
    builtins.print(*args, **kwargs)
    try:
        if kwargs.get("file") is None:
            text = str(kwargs.get("sep", " ") if kwargs.get("sep") is not None else " ").join(str(a) for a in args)
            if text.strip():
                _broadcast_log(text)
    except Exception:
        pass

async def _install_loop_handler(app):
    """브라우저를 새로고침하거나 닫을 때 윈도우가 남기는 무해한 연결 끊김 오류(WinError 10054)는 출력하지 않는다"""
    loop = asyncio.get_running_loop()
    default = loop.get_exception_handler()
    def handler(l, context):
        if isinstance(context.get("exception"), (ConnectionResetError, ConnectionAbortedError)):
            return
        if default:
            default(l, context)
        else:
            l.default_exception_handler(context)
    loop.set_exception_handler(handler)

def get_active_window_title():
    try:
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
        return buff.value
    except Exception:
        return ""

import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

try:
    import pydirectinput
    pydirectinput.FAILSAFE = False
except ImportError:
    print("pydirectinput is not installed. Run: pip install pydirectinput")
    pass

# PyInstaller exe 여부에 따라 web_app 경로 결정
if getattr(sys, 'frozen', False):
    _BASE_DIR = os.path.dirname(sys.executable)
else:
    _BASE_DIR = os.path.dirname(os.path.abspath(__file__))

_candidate_dirs = [
    os.path.join(_BASE_DIR, "..", "web_app"),
    os.path.join(_BASE_DIR, "bricksync_project", "web_app"),
    r"C:\Users\PC\Documents\GitHub\BrickSync\BrickSync-main\bricksync_project\web_app",
    r"C:\Users\PC\Documents\GitHub\BrickSync\bricksync_project\web_app"
]
web_app_dir = os.path.join(_BASE_DIR, "..", "web_app")
for _cand in _candidate_dirs:
    if os.path.exists(_cand) and os.path.isdir(_cand):
        web_app_dir = os.path.abspath(_cand)
        break



# 포트나이트 창이 앞으로 올 때까지 키를 보내지 않기 위한 시각 (창 전환 중에 눌린 첫 키가 씹히는 것을 막는다)
_focus_ok_at = 0.0
_nf_logged_at = 0.0
_target_hwnd = 0
_focus_lock = threading.Lock()

def _find_fortnite():
    user32 = ctypes.windll.user32
    # Search for "Fortnite  " (standard client) first, then "Fortnite"
    hwnd = user32.FindWindowW(None, "Fortnite  ")
    if not hwnd:
        hwnd = user32.FindWindowW(None, "Fortnite")
    return hwnd

def _force_foreground(hwnd, use_alt=False):
    """백그라운드 프로그램도 창을 맨 앞으로 가져올 수 있게 하는 표준 방법.
    (윈도우는 지금 앞에 있는 프로그램만 다른 창을 앞으로 보낼 수 있게 막아 둔다 → 입력 스레드를 잠깐 연결해서 통과)
    전체화면 크기는 건드리지 않는다. 최소화된 경우에만 복원한다."""
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    with _focus_lock:
        try:
            if user32.IsIconic(hwnd):
                user32.ShowWindow(hwnd, 9)   # SW_RESTORE: 최소화 상태일 때만
            fg = user32.GetForegroundWindow()
            cur_tid = kernel32.GetCurrentThreadId()
            fg_tid = user32.GetWindowThreadProcessId(fg, None) if fg else 0
            tgt_tid = user32.GetWindowThreadProcessId(hwnd, None)
            if use_alt:
                # 마지막 수단: Alt 키 입력을 한 번 흉내 내서 포그라운드 잠금을 푼다
                user32.keybd_event(0x12, 0, 0, 0)
                user32.keybd_event(0x12, 0, 2, 0)
            attached = []
            for tid in {fg_tid, tgt_tid}:
                if tid and tid != cur_tid:
                    if user32.AttachThreadInput(cur_tid, tid, True):
                        attached.append(tid)
            try:
                user32.BringWindowToTop(hwnd)
                user32.ShowWindow(hwnd, 5)   # SW_SHOW: 현재 크기 그대로 표시 (전체화면 유지)
                user32.SetForegroundWindow(hwnd)
            finally:
                for tid in attached:
                    user32.AttachThreadInput(cur_tid, tid, False)
            return user32.GetForegroundWindow() == hwnd
        except Exception as e:
            print(f"[FOCUS] force foreground error: {e}")
            return False

def wait_focus_ready():
    delay = _focus_ok_at - time.time()
    if delay > 0:
        time.sleep(delay)
    # 그래도 포트나이트가 앞에 없으면 한 번 더 강하게 시도한다
    hwnd = _target_hwnd
    if hwnd:
        try:
            if ctypes.windll.user32.GetForegroundWindow() != hwnd:
                if not _force_foreground(hwnd, use_alt=True):
                    time.sleep(0.3)
                    _force_foreground(hwnd, use_alt=True)
                time.sleep(0.4)
        except Exception:
            pass

def focus_fortnite():
    global _focus_ok_at, _target_hwnd
    try:
        hwnd = _find_fortnite()
        if not hwnd:
            global _nf_logged_at
            if time.time() - _nf_logged_at > 60:
                _nf_logged_at = time.time()
                print("[FOCUS] Fortnite window not found via FindWindow")
            return
        _target_hwnd = hwnd
        # 이미 맨 앞에 있으면 아무것도 하지 않는다 (신호마다 창을 건드리지 않는다)
        if ctypes.windll.user32.GetForegroundWindow() == hwnd and not ctypes.windll.user32.IsIconic(hwnd):
            return
        _focus_ok_at = time.time() + (1.2 if ctypes.windll.user32.IsIconic(hwnd) else 0.8)
        ok = _force_foreground(hwnd)
        print(f"[FOCUS] Focused Fortnite window (HWND: {hwnd}) {'OK' if ok else '(전환 재시도 예정)'} - 창 전환 완료까지 키 입력 대기")
    except Exception as e:
        print(f"[FOCUS] Failed to focus Fortnite: {e}")

print("Starting Fortnite Bridge Server (Discrete Block Movement Mode with Global Lock)...")

# 글로벌 스레드 동기화 락 (멀티스레드에서 SendInput 동시 호출로 인한 키 씹힘 및 락 현상 완벽 방지)
pydirectinput_lock = threading.Lock()

def safe_press(key):
    wait_focus_ready()
    with pydirectinput_lock:
        try:
            print(f"🔑 [실제 키 입력] '{key}' 눌림 - {time.strftime('%H:%M:%S')}.{int(time.time()*1000)%1000:03d}")
            pydirectinput.keyDown(key)
            time.sleep(0.05)
            pydirectinput.keyUp(key)
        except Exception:
            pass

def safe_key_down(key):
    wait_focus_ready()
    with pydirectinput_lock:
        try:
            pydirectinput.keyDown(key)
        except Exception:
            pass

def safe_key_up(key):
    with pydirectinput_lock:
        try:
            pydirectinput.keyUp(key)
            time.sleep(0.01)
            pydirectinput.keyUp(key)
            time.sleep(0.01)
            pydirectinput.keyUp(key)
        except Exception:
            pass

steering_state = {"UP": False, "DOWN": False, "LEFT": False, "RIGHT": False}
active_threads = {"UP": False, "DOWN": False, "LEFT": False, "RIGHT": False}
keys = {"UP": 'y', "DOWN": 'l', "LEFT": 'u', "RIGHT": 'o'}

def click_loop_worker(direction, key):
    print(f"▶ [AUTO-FIRE START] {direction} ({key}키 연사 루프 가동)")
    start_time = time.time()
    while steering_state[direction]:
        if time.time() - start_time > 10.0:
            print(f"⚠ [TIMEOUT SAFE] {direction} ({key}키 10초 초과로 강제 종료)")
            break
        safe_press(key)
        
        # 1.05초 대기 (총 간격 1.10초 = 0.05 + 1.05)
        wait_time = 0.0
        while wait_time < 1.05 and steering_state[direction]:
            time.sleep(0.05)
            wait_time += 0.05
    # [Failsafe] 루프를 빠져나왔을 때 확실히 키를 한 번 더 떼어 줌
    steering_state[direction] = False
    safe_key_up(key)
    active_threads[direction] = False
    print(f"■ [AUTO-FIRE STOP] {direction} ({key}키 연사 루프 종료)")

def release_all_steering_keys():
    print("🧹 [FAILSAFE] 4방향 모든 키 강제 해제 실행!")
    safe_key_up('y')
    safe_key_up('l')
    safe_key_up('u')
    safe_key_up('o')


async def handle_websocket(request):
    # ─────────────────────────────────────────────────────────────────────
    # Chrome Private Network Access (PNA) Preflight 처리
    # HTTPS 페이지에서 ws://127.0.0.1 접속 시, Chrome이 먼저 일반 GET 요청을
    # Access-Control-Request-Private-Network: true 헤더와 함께 전송함.
    # 이 요청에 Access-Control-Allow-Private-Network: true 로 응답해야
    # 이후 실제 WebSocket 업그레이드 요청이 허용됨.
    # ─────────────────────────────────────────────────────────────────────
    if request.headers.get('Access-Control-Request-Private-Network') == 'true':
        origin = request.headers.get('Origin', '*')
        print(f"[PNA] Chrome Private Network Access preflight 수신 → 승인 응답 (Origin: {origin})")
        return web.Response(
            status=200,
            headers={
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Private-Network': 'true',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Upgrade, Connection',
                'Vary': 'Origin',
            }
        )

    ws = web.WebSocketResponse()
    
    await ws.prepare(request)
    global _main_loop
    _main_loop = asyncio.get_running_loop()
    _ws_clients.add(ws)
    print("웹브라우저(브릭싱크)가 연결되었습니다!")
    
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    action = data.get("action")
                    
                    if action and action in ["STEER_UP", "STEER_DOWN", "STEER_LEFT", "STEER_RIGHT", "STEER_UP_TAP", "STEER_DOWN_TAP", "STEER_LEFT_TAP", "STEER_RIGHT_TAP", "MWHEEL_LEFT", "MWHEEL_RIGHT", "SWING_CONTROL", "motor_cw", "motor_ccw", "CAT_FEED_REWARD", "MONSTER_ALERT", "ACTION_LIGHT", "HUB_LOG", "FOCUS_FORTNITE"]:
                        focus_fortnite()
                    
                    if action == "STEER_UP":
                        if not steering_state["UP"] and not active_threads["UP"]:
                            steering_state["UP"] = True
                            active_threads["UP"] = True
                            threading.Thread(target=click_loop_worker, args=("UP", 'y'), daemon=True).start()
                    elif action == "STEER_UP_TAP":
                        print("▶ [STEP TAP] UP (y키 1회 단독 전송)")
                        threading.Thread(target=lambda: safe_press('y'), daemon=True).start()
                    elif action == "STEER_DOWN":
                        if not steering_state["DOWN"] and not active_threads["DOWN"]:
                            steering_state["DOWN"] = True
                            active_threads["DOWN"] = True
                            threading.Thread(target=click_loop_worker, args=("DOWN", 'l'), daemon=True).start()
                    elif action == "STEER_DOWN_TAP":
                        print("▶ [STEP TAP] DOWN (l키 1회 단독 전송)")
                        threading.Thread(target=lambda: safe_press('l'), daemon=True).start()
                    elif action == "STEER_LEFT":
                        if not steering_state["LEFT"] and not active_threads["LEFT"]:
                            steering_state["LEFT"] = True
                            active_threads["LEFT"] = True
                            threading.Thread(target=click_loop_worker, args=("LEFT", 'u'), daemon=True).start()
                    elif action == "STEER_LEFT_TAP":
                        print("▶ [STEP TAP] LEFT (u키 1회 단독 전송)")
                        threading.Thread(target=lambda: safe_press('u'), daemon=True).start()
                    elif action == "STEER_RIGHT":
                        if not steering_state["RIGHT"] and not active_threads["RIGHT"]:
                            steering_state["RIGHT"] = True
                            active_threads["RIGHT"] = True
                            threading.Thread(target=click_loop_worker, args=("RIGHT", 'o'), daemon=True).start()
                    elif action == "STEER_RIGHT_TAP":
                        print("▶ [STEP TAP] RIGHT (o키 1회 단독 전송)")
                        threading.Thread(target=lambda: safe_press('o'), daemon=True).start()
                    
                    elif action == "STOP_UP":
                        steering_state["UP"] = False
                        safe_key_up('y')
                    elif action == "STOP_DOWN":
                        steering_state["DOWN"] = False
                        safe_key_up('l')
                    elif action == "STOP_LEFT":
                        steering_state["LEFT"] = False
                        safe_key_up('u')
                    elif action == "STOP_RIGHT":
                        steering_state["RIGHT"] = False
                        safe_key_up('o')

                    elif action == "MWHEEL_LEFT":
                        print("▶ 관람차 (단일모터) 좌회전 발송 (H키 한번 탁 쳐서 가동)")
                        threading.Thread(target=lambda: safe_press('h'), daemon=True).start()
                    elif action == "MWHEEL_RIGHT":
                        print("▶ 관람차 (단일모터) 우회전 발송 (J키 한번 탁 쳐서 가동)")
                        threading.Thread(target=lambda: safe_press('j'), daemon=True).start()
                    elif action in ["STOP_MWHEEL_LEFT", "STOP_MWHEEL_RIGHT"]:
                        print("▶ 관람차 (단일모터) 정지 스위치 수신 (포트나이트 K/\\ 정지 브레이크 키 전송)")
                        def press_stop_wheel():
                            safe_press('k')
                            safe_press('\\')
                        threading.Thread(target=press_stop_wheel, daemon=True).start()

                    elif action in ["SPEED_1", "SPEED_2", "SPEED_3", "SPEED_4"]:
                        speed_durations = {
                            "SPEED_1": 0.2,
                            "SPEED_2": 0.5,
                            "SPEED_3": 0.9,
                            "SPEED_4": 1.3
                        }
                        duration = speed_durations[action]
                        print(f"▶ 속도 변속 {action} 수신 (포트나이트 T키 {duration}초 입력 전송)")
                        def press_speed_key(dur):
                            safe_key_down('t')
                            time.sleep(dur)
                            safe_key_up('t')
                        threading.Thread(target=press_speed_key, args=(duration,), daemon=True).start()

                    elif action == "FOCUS_FORTNITE":
                        pass   # 위에서 focus_fortnite() 가 이미 창을 앞으로 가져왔다 (첫 신호가 오기 전에 미리 준비)

                    elif action == "CLEANUP_KEYS":
                        print("🧹 [CLEANUP] 모든 조작 가상 키 강제 해제 실행")
                        release_all_steering_keys()

                    elif action in ["ACTION_LIGHT", "MONSTER_ALERT"]:
                        print(f"▶ 몬스터 경보/조명 발동 수신 ({action} ➔ 조명 키 combo 정밀 전송)")
                        def press_light_key():
                            wait_focus_ready()
                            with pydirectinput_lock:
                                try:
                                    for edit_k in ['g', 'f']:
                                        pydirectinput.keyUp(edit_k)
                                    time.sleep(0.05)
                                    for l_key in ['[', 'p', 't', 'n']:
                                        pydirectinput.keyDown(l_key)
                                        time.sleep(0.15)
                                        pydirectinput.keyUp(l_key)
                                        time.sleep(0.05)
                                except Exception as e:
                                    print(f"⚠ 조명 키 전송 오류: {e}")
                        threading.Thread(target=press_light_key, daemon=True).start()
                    elif action == "ACTION_SOUND":
                        print("▶ 사운드 재생 (p키 전송)")
                        threading.Thread(target=lambda: safe_press('p'), daemon=True).start()
                        
                    elif action == "CAT_FEED_REWARD":
                        print("[REWARD] 보상 발동! E키")
                        threading.Thread(target=lambda: safe_press('e'), daemon=True).start()
                        
                    elif action == "HUB_LOG":
                        msg_text = data.get("msg", "⚡ [LEGO HUB] 모터 제어 패킷 송출")
                        print(f"⚡ [LEGO HUB LOG] {msg_text}")
                        
                    elif action == "SWING_CONTROL":
                        direction = data.get("dir")
                        turns = data.get("val", 1)
                        # 그네 정방향 회전 (FORWARD -> j키, BACKWARD -> h키)
                        key = 'j' if direction == "FORWARD" else 'h'
                        print(f"▶ [SWING_CONTROL] {direction} {turns}바퀴 수신 ({key}키 {turns}회 반복 연사)")
                        def press_swing_key(k, count):
                            # 포트나이트 창 포커스 전환 안정화 대기 마진 (첫 키 씹힘 방지용 1초 대기)
                            time.sleep(1.0)
                            for _ in range(count):
                                safe_key_up(k) # 강제 키 업 선행 실행하여 Stuck 상태 해제
                                time.sleep(0.05)
                                safe_key_down(k)
                                time.sleep(0.15) # 키 누름을 0.15초로 설정하여 윈도우 키보드 재입력(Repeat) 버그 차단
                                safe_key_up(k)
                                time.sleep(2.3)  # 그네 1회전 완료 시간(2.0초) + 마진을 대기하여 100% 회전 분리 보장
                        threading.Thread(target=press_swing_key, args=(key, turns), daemon=True).start()
                        
                    elif action == "motor_cw":
                        print("▶ 오두막 지붕 열기 / 모터 시계방향 수신 (H키 정밀 탭 전송)")
                        threading.Thread(target=lambda: safe_press('h'), daemon=True).start()
                        
                    elif action == "motor_ccw":
                        print("▶ 오두막 지붕 닫기 / 모터 반시계방향 수신 (J키 정밀 탭 전송)")
                        threading.Thread(target=lambda: safe_press('j'), daemon=True).start()

                    elif action in ["motor_stop", "motor_stop_cw", "motor_stop_ccw", "motor_stop_generic"]:
                        print("▶ 쓰레기 괴물 동작 정지 수신 (K키 전송 제외 처리됨)")
                except Exception as e:
                    pass
    except Exception as e:
        pass
    finally:
        for d in steering_state: steering_state[d] = False
        try:
            with pydirectinput_lock:
                for k in ['y', 'l', 'u', 'o', 'h', 'k', 'j', 't', '[', ']', 'p', 'e', 'g', 'n']:
                    pydirectinput.keyUp(k)
        except Exception:
            pass
        _ws_clients.discard(ws)
        print("연결 종료됨")
        
    return ws

@web.middleware
async def no_cache_middleware(request, handler):
    # CORS OPTIONS preflight 처리 (Mixed Content 우회 포함)
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin', '*')
        return web.Response(
            status=200,
            headers={
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Private-Network': 'true',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            }
        )

    try:
        response = await handler(request)
        origin = request.headers.get('Origin', '*')
        # Chrome Private Network Access + CORS 허용 헤더 (HTTPS → localhost WebSocket 연결 허용)
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Private-Network'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = '*'
        response.headers['Vary'] = 'Origin'
        # 캐시 비활성화
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except web.HTTPException as ex:
        ex.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        ex.headers['Pragma'] = 'no-cache'
        ex.headers['Expires'] = '0'
        raise ex

# 서버를 새로 켤 때마다 바뀌는 실행 번호 (웹이 이전 로그인을 지울지 판단하는 데 쓴다)
BOOT_ID = str(int(time.time() * 1000))

async def version_handler(request):
    return web.json_response({"app": "BrickSync", "version": APP_VERSION, "boot": BOOT_ID})

async def index_handler(request):
    # 127.0.0.1:8000 주소로 들어오면 인트로 화면부터 보여 준다 (인트로 → 로그인 → 앱)
    intro = os.path.join(web_app_dir, 'intro.html')
    target = intro if os.path.isfile(intro) else os.path.join(web_app_dir, 'app.html')
    return web.FileResponse(target)

def init_app():
    app = web.Application(middlewares=[no_cache_middleware])
    # WebSocket 엔드포인트 (항상 등록 - 포트나이트 연동 핵심)
    app.router.add_get('/ws', handle_websocket)
    # 버전 확인 (설정창에서 사용)
    app.router.add_get('/api/version', version_handler)
    # web_app 폴더가 있을 때만 정적 파일 서빙 등록
    # BrickSync.exe로 다른 PC에서 실행 시 web_app 폴더가 없어도 정상 동작
    # (웹앱은 https://www.bricksync.org 에서 Cloudflare로 서빙됨)
    _web_app_resolved = os.path.realpath(web_app_dir)
    if os.path.isdir(_web_app_resolved):
        app.router.add_get('/', index_handler)
        app.router.add_static('/', web_app_dir)
        print(f"[SERVER] 로컬 웹앱 서빙 활성화: {_web_app_resolved}")
    else:
        print(f"[SERVER] 웹앱 폴더 없음 → 클라우드 모드 (WebSocket only): ws://127.0.0.1:8000/ws")
    return app

import webbrowser

def open_browser():
    time.sleep(1.2)
    url = "https://www.bricksync.org/intro.html"
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
    ]
    chrome_bin = None
    for p in chrome_paths:
        if os.path.exists(p):
            chrome_bin = p
            break

    if chrome_bin:
        try:
            webbrowser.register('chrome', None, webbrowser.BackgroundBrowser(chrome_bin))
            webbrowser.get('chrome').open(url)
            return
        except Exception:
            pass

    try:
        webbrowser.open(url)
    except Exception:
        pass


# ── 자동 브라우저 오프너 (단독 실행 시 크롬 자동 실행) ──────────────────────────
def is_port_open(port=8000):
    try:
        import socket
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False

def open_browser_when_ready():
    BRICKSYNC_URL = "https://www.bricksync.org/intro.html"
    try:
        # 이 PC에 웹앱 폴더가 있으면(개발 PC) 로컬 인트로로, 없으면 실제 사이트의 인트로로 연다
        if os.path.isfile(os.path.join(web_app_dir, "intro.html")):
            BRICKSYNC_URL = "http://127.0.0.1:8000/intro.html"
    except Exception:
        pass
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
    ]
    
    # 8000번 포트가 뜰 때까지 대기 (최대 10초)
    for _ in range(20):
        if is_port_open():
            break
        time.sleep(0.5)

    chrome_bin = None
    for p in chrome_paths:
        if os.path.exists(p):
            chrome_bin = p
            break

    if chrome_bin:
        try:
            subprocess.Popen([chrome_bin, BRICKSYNC_URL], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return
        except Exception:
            pass

    try:
        import webbrowser
        webbrowser.open(BRICKSYNC_URL)
    except Exception:
        pass

def free_port(port=8000):
    try:
        import subprocess
        out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, stderr=subprocess.DEVNULL).decode('utf-8', errors='ignore')
        my_pid = str(os.getpid())
        for line in out.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[1].endswith(f':{port}'):
                pid = parts[-1]
                if pid != my_pid and pid != '0':
                    subprocess.run(f'taskkill /F /PID {pid} /T', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

if __name__ == "__main__":
    free_port(8000)
    
    print("=" * 60)
    print(f" 🎮 BrickSync v{APP_VERSION} - 포트나이트 & 레고 브릿지 서버 가동 중")
    print(" 🌐 포트: http://127.0.0.1:8000 (ws://127.0.0.1:8000/ws)")
    print(" 🚀 브라우저를 열고 브릭싱크(https://www.bricksync.org)에 연결합니다...")
    print("=" * 60)
    
    threading.Thread(target=open_browser_when_ready, daemon=True).start()
    
    app = init_app()
    app.on_startup.append(_install_loop_handler)
    web.run_app(app, host="127.0.0.1", port=8000)
