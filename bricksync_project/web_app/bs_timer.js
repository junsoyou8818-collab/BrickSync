/* 가려진 탭에서도 정확한 타이머
 *   포트나이트가 앞으로 나와 브라우저가 가려지면(10~20초 지나면) 크롬이 setTimeout 을 약 1초 단위로 늦춘다.
 *   그러면 레고 허브로 나가는 두 번째 바퀴 명령(블루투스 전송 사이의 20ms 쉼)과 완료 신호 확인(30ms 마다)이 1초씩 밀려서
 *   한쪽 바퀴가 늦게 출발하고 회전이 어긋난다. (노트북처럼 화면이 하나일 때 생긴다)
 *   웹 워커 안의 타이머는 가려진 탭에서도 늦춰지지 않으므로, 실행 중 쓰는 쉼/예약은 이 파일의 함수로 한다.
 *     bsSleep(ms)            → await 로 쉬기
 *     bsTimeout(fn, ms)      → setTimeout 대신 (취소: bsClearTimeout)
 *   워커를 만들 수 없으면 일반 setTimeout 으로 대신한다.
 */
(function () {
    'use strict';
    if (window.bsSleep) return;
    var worker = null, seq = 0, pending = {}, broken = false;
    function ensure() {
        if (worker || broken) return worker;
        try {
            var src = 'onmessage=function(e){var d=e.data;setTimeout(function(){postMessage(d.id)},d.ms)}';
            worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
            worker.onmessage = function (e) { var f = pending[e.data]; if (f) { delete pending[e.data]; try { f(); } catch (err) { setTimeout(function () { throw err; }, 0); } } };
            worker.onerror = function () {
                broken = true; worker = null;
                var ids = Object.keys(pending);
                ids.forEach(function (id) { var f = pending[id]; delete pending[id]; setTimeout(f, 0); });
            };
        } catch (e) { broken = true; worker = null; }
        return worker;
    }
    window.bsTimeout = function (fn, ms) {
        ms = Math.max(0, Number(ms) || 0);
        var w = ensure();
        if (!w) return setTimeout(fn, ms);
        var id = ++seq; pending[id] = fn;
        w.postMessage({ id: id, ms: ms });
        return -id;                                  // 음수 = 워커 타이머
    };
    window.bsClearTimeout = function (h) { if (h < 0) delete pending[-h]; else clearTimeout(h); };
    window.bsSleep = function (ms) { return new Promise(function (r) { window.bsTimeout(r, ms); }); };
})();
