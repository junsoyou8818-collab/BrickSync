/* BrickSync 서버 실행 번호 확인
 *   BrickSync.exe 는 시작할 때마다 새 "실행 번호"(boot)를 만들고 /api/version 으로 알려 준다.
 *   서버를 새로 켰다면(번호가 달라졌다면) 이전 로그인 정보를 지워서 항상 인트로 → 로그인부터 시작하게 하고,
 *   서버가 계속 켜져 있는 동안(번호가 같으면)에는 로그인을 그대로 유지한다.
 *   서버에 연결되지 않으면 아무것도 지우지 않는다 (웹사이트만 쓰는 경우).
 */
const BrickSyncBoot = (function () {
    const BOOT_KEY = 'bricksync_server_boot';
    const SESSION_KEYS = ['bricksync_user_session', 'bricksync_student_session'];
    let _done = null;

    function bridgeBase() {
        const h = location.hostname;
        return (h === '127.0.0.1' || h === 'localhost') ? '' : 'http://127.0.0.1:8000';
    }

    function sync() {
        if (_done) return _done;
        _done = (async () => {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 1500);
                const r = await fetch(bridgeBase() + '/api/version', { cache: 'no-store', signal: ctrl.signal });
                clearTimeout(timer);
                const j = await r.json();
                if (!j || !j.boot) return false;
                const prev = localStorage.getItem(BOOT_KEY);
                let cleared = false;
                if (prev !== String(j.boot)) {
                    SESSION_KEYS.forEach(k => localStorage.removeItem(k));
                    localStorage.setItem(BOOT_KEY, String(j.boot));
                    cleared = true;
                }
                return cleared;
            } catch (e) { return false; }
        })();
        return _done;
    }

    return { sync };
})();
