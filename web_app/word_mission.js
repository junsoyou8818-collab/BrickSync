/* BrickSync 워드 블록 미션 판정 (4단계)
 *  - 놓인 블록으로 과제 달성도(체크 표시, 진행바)를 계산한다. (아이콘 모드와 같은 규칙, 블록 종류만 워드 블록 기준)
 *  - 100% 가 되면 폭죽, 실행이 끝나면 보상판(핀코드) 팝업과 포트나이트 보상 신호를 보낸다.
 */
(function () {
    'use strict';

    var WB = window.WORD_BLOCKS;
    var unit = new URLSearchParams(location.search).get('unit') || '1';
    var PINS = { '1': '7241', '2': '8932', '3': '5019', '4': '3370', '5': '9428', '6': '7241', '7': '5019', '8': '8932' };

    function lang() { try { return localStorage.getItem('bricksync_lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }
    function active() { return !!window.isMissionActive; }

    /* ---------- 놓인 블록을 실행 순서대로 펼치기 ---------- */
    function chain() {
        var out = [];
        var stacks = (window.WORD_ENGINE && WORD_ENGINE.state.stacks) || [];
        function walk(list) {
            list.forEach(function (n) {
                var def = WB.byType[n.type];
                if (!def) return;
                if (def.container && n.type === 'repeat') {
                    out.push({ t: n.type, v: n.vals });
                    var times = Math.max(1, Math.min(20, Math.round(parseFloat(n.vals.n) || 1)));
                    for (var i = 0; i < times; i++) walk(n.kids || []);
                } else {
                    out.push({ t: n.type, v: n.vals });
                    if (n.kids) walk(n.kids);
                    if (n.kids2) walk(n.kids2);
                }
            });
        }
        stacks.forEach(function (s) {
            var f = s.blocks[0];
            if (f && WB.byType[f.type] && WB.byType[f.type].hat) walk(s.blocks);
        });
        return out;
    }

    /* ---------- 과제 규칙 ---------- */
    function isNum(x, n) { return Math.round(parseFloat(x)) === n && parseFloat(x) === n; }
    function isRed(x) { return x.t === 'li_red' || (x.t === 'li_pixel' && x.v.c === 'red' && parseFloat(x.v.n) > 0); }
    var R = {
        hat: function (type) { return function (c) { return c.some(function (x) { return x.t === type; }); }; },
        wait: function (n) { return function (c) { return c.some(function (x) { return x.t === 'wait' && isNum(x.v.n, n); }); }; },
        anyWait: function (c) { return c.some(function (x) { return x.t === 'wait'; }); },
        move: function (dir, n) {      // 앞/뒤/좌/우 이동 (기본 블록, 또는 이동하기 블록의 회전 단위)
            return function (c) {
                return c.some(function (x) {
                    if (x.t === dir && isNum(x.v.n, n)) return true;
                    return (dir === 'fwd' || dir === 'back') && x.t === 'mv_move' && x.v.d === dir && x.v.unit === 'rot' && isNum(x.v.n, n);
                });
            };
        },
        motor: function (dir, n) {
            return function (c) { return c.some(function (x) { return x.t === 'motor_run' && x.v.dir === dir && x.v.unit === 'rot' && isNum(x.v.n, n); }); };
        },
        anyMotor: function (n) {
            return function (c) { return c.some(function (x) { return x.t === 'motor_run' && x.v.unit === 'rot' && isNum(x.v.n, n); }); };
        },
        redLight: function (c) { return c.some(isRed); },
        waitThenRed: function (n) {    // n초 기다린 바로 다음에 빨간 조명
            return function (c) {
                return c.some(function (x, i) {
                    var nx = c[i + 1];
                    return x.t === 'wait' && isNum(x.v.n, n) && nx && isRed(nx);
                });
            };
        }
    };
    var RULES = {
        '1': [R.hat('start'), R.wait(5), R.move('fwd', 3), R.move('left', 1), R.move('back', 2)],
        '2': [R.hat('start'), R.wait(5), R.motor('cw', 3), R.motor('ccw', 3)],
        '3': [R.hat('start'), R.wait(5), R.motor('cw', 3), R.motor('ccw', 2)],
        '4': [R.hat('start'), R.wait(5), R.move('fwd', 4), R.move('right', 1), R.move('fwd', 2)],
        '5': [R.hat('start'), R.waitThenRed(2), R.waitThenRed(2)],
        '6': [R.hat('ev_ai_gesture'), R.wait(5), R.motor('cw', 1), R.motor('ccw', 1)],
        '7': [R.hat('ev_ai_voice'), R.wait(5), R.motor('cw', 3)],
        '8': [R.hat('ev_ai_vision'), R.wait(2), R.redLight]
    };
    // 5단원: 과제 2번 "대기 2초", 3번 "빨간 조명" — 둘 다 아이콘 모드처럼 "2초 대기 바로 뒤 빨간 조명"으로 확인
    RULES['5'][1] = function (c) { return c.some(function (x) { return x.t === 'wait' && isNum(x.v.n, 2); }); };

    var AI_HAT = { '6': 'ev_ai_gesture', '7': 'ev_ai_voice', '8': 'ev_ai_vision' };

    /* ---------- 진행바 / 과제 체크 ---------- */
    var cleared = false;
    function update() {
        var rules = RULES[unit];
        if (!rules) return 0;
        var c = chain();
        var done = 0;
        rules.forEach(function (rule, i) {
            var li = document.getElementById('task-item-' + i);
            var ok = false;
            try { ok = !!rule(c); } catch (e) { }
            if (ok) done++;
            if (li) {
                var text = li.textContent.trim();
                li.style.color = ok ? '#10b981' : '#64748b';
                li.innerHTML = (ok
                    ? '<i class="fas fa-check-circle" style="color: #10b981; width:20px; font-size:1.1rem; text-align:center;"></i> '
                    : '<i class="far fa-circle" style="color: #cbd5e1; width:20px; font-size:1.1rem; text-align:center;"></i> ') + text;
            }
        });
        var percent = Math.min(100, Math.round(done / rules.length * 100));
        var needHat = AI_HAT[unit] || 'start';
        if (!c.some(function (x) { return x.t === needHat; })) percent = 0;

        var bar = document.getElementById('m-progress'), pct = document.getElementById('m-percent');
        if (bar) bar.style.width = percent + '%';
        if (pct) pct.textContent = percent + '%';
        if (bar) {
            if (percent >= 100) {
                bar.dataset.completed = 'true';
                if (!cleared && active()) {
                    cleared = true;
                    setTimeout(confetti3s, 400);
                    sendPin(c);
                }
            } else {
                bar.dataset.completed = '';
                cleared = false;
            }
        }
        return percent;
    }

    function sendPin(c) {
        var pin = PINS[unit] || '0000';
        var motors = c.filter(function (x) { return x.t === 'motor_run'; });
        var last = motors.length ? motors[motors.length - 1] : null;
        if (last) pin = last.v.dir === 'ccw' ? '9988' : '7241';
        try { window.parent.sendWebSocketAction({ action: 'MISSION_CLEARED_PIN_READY', pin: pin }); } catch (e) { }
    }

    /* ---------- 폭죽 / 보상판 ---------- */
    function confetti3s() {
        if (typeof window.confetti !== 'function') return;
        var end = Date.now() + 3000;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 4000 };
        var rnd = function (a, b) { return Math.random() * (b - a) + a; };
        var iv = setInterval(function () {
            var left = end - Date.now();
            if (left <= 0) return clearInterval(iv);
            var n = 50 * (left / 3000);
            window.confetti(Object.assign({}, defaults, { particleCount: n, origin: { x: rnd(0.1, 0.3), y: Math.random() - 0.2 } }));
            window.confetti(Object.assign({}, defaults, { particleCount: n, origin: { x: rnd(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }

    var modalReady = false, manuallyClosed = false;
    function ensureModal() {
        if (modalReady) return;
        modalReady = true;
        var st = document.createElement('style');
        st.textContent =
            '@keyframes wmFade{from{opacity:0;transform:scale(.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}' +
            '@keyframes wmStamp{0%{opacity:0;transform:scale(4.5) rotate(45deg);filter:blur(6px)}60%{opacity:.9;transform:scale(.9) rotate(-15deg);filter:none}80%{transform:scale(1.05) rotate(-10deg)}100%{opacity:1;transform:scale(1) rotate(-12deg)}}' +
            '@keyframes wmPulse{from{transform:scale(1)}to{transform:scale(1.03)}}';
        document.head.appendChild(st);
        var m = document.createElement('div');
        m.id = 'wordRewardModal';
        m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:6000;justify-content:center;align-items:center;backdrop-filter:blur(12px)';
        m.innerHTML =
            '<div style="background:linear-gradient(135deg,rgba(255,255,255,.95),rgba(243,244,246,.98));padding:50px 30px;border-radius:28px;width:460px;max-width:92vw;text-align:center;box-shadow:0 30px 60px rgba(0,0,0,.4);animation:wmFade .5s cubic-bezier(.16,1,.3,1) forwards">' +
            '<div style="height:150px;margin-bottom:20px;display:flex;justify-content:center;align-items:center"><div style="width:146px;height:146px;border:5px double #ef4444;border-radius:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#ef4444;font-weight:900;transform:rotate(-12deg);background:rgba(239,68,68,.05);animation:wmStamp .6s cubic-bezier(.175,.885,.32,1.275) .3s both">' +
            '<div style="font-size:13px;letter-spacing:1.5px;opacity:.9;white-space:nowrap">COIN MISSION</div>' +
            '<div id="wmStamp" style="font-size:21px;border-top:2.5px solid #ef4444;border-bottom:2.5px solid #ef4444;padding:2px 10px;margin:4px 0;white-space:nowrap"></div>' +
            '<div style="font-size:11px;opacity:.8;white-space:nowrap">★ SUCCESS ★</div></div></div>' +
            '<h2 id="wmTitle" style="font-size:1.85rem;color:#1e293b;font-weight:900;margin:15px 0 5px"></h2>' +
            '<p id="wmDesc" style="color:#64748b;font-size:1rem;margin-bottom:22px;line-height:1.5"></p>' +
            '<div style="border:2px solid #facc15;background:#fffbeb;border-radius:16px;padding:14px 18px;margin-bottom:26px;display:flex;align-items:center;gap:14px;text-align:left">' +
            '<div style="width:46px;height:46px;border-radius:50%;background:#facc15;color:#7c2d12;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 2px 6px rgba(250,204,21,.4)">★</div>' +
            '<div style="min-width:0"><div id="wmUnit" style="font-size:.85rem;font-weight:800;color:#b45309"></div><div id="wmMission" style="font-size:1.1rem;font-weight:900;color:#7c2d12;overflow-wrap:anywhere"></div></div></div>' +
            '<button id="wmClose" style="width:100%;height:50px;border-radius:14px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border:none;font-size:1.15rem;font-weight:900;cursor:pointer;box-shadow:0 6px 15px rgba(139,92,246,.4)"></button></div>';
        document.body.appendChild(m);
        document.getElementById('wmClose').onclick = function () { manuallyClosed = true; m.style.display = 'none'; };
    }

    function showReward() {
        ensureModal();
        var en = lang() === 'en';
        document.getElementById('wmStamp').textContent = en ? 'COMPLETE' : '미션 완료';
        document.getElementById('wmTitle').textContent = en ? 'Mission Complete!' : '미션 완료!';
        document.getElementById('wmDesc').textContent = en ? 'You cleared the LEGO Fortnite mission!' : '레고 포트나이트 미션을 성공하였습니다!';
        document.getElementById('wmClose').textContent = en ? 'Close' : '닫기';
        var cur = parseInt(unit, 10) || 1;
        document.getElementById('wmUnit').textContent = en ? 'Lesson ' + cur + ' cleared' : cur + '단원 완료';
        var all = window.WORD_MISSIONS || {}, info = ((all[lang()] || all.ko || {})[unit]) || null;
        document.getElementById('wmMission').textContent = info ? info.title : '';
        document.getElementById('wordRewardModal').style.display = 'flex';
    }

    /* 실행이 끝났을 때: 미션 중이고 100% 이면 보상 */
    function onRunFinished() {
        if (!active() || manuallyClosed) return;
        var bar = document.getElementById('m-progress');
        if (bar && bar.dataset.completed === 'true') {
            confetti3s();
            try { if (typeof window.addSystemLog === 'function') window.addSystemLog('MISSION', '🎉 ' + unit + '단원 미션 완료'); } catch (e) { }
            try { window.parent.sendWebSocketAction({ action: 'CAT_FEED_REWARD' }); } catch (e) { }
            showReward();
        }
    }

    window.addEventListener('wordblocks:changed', update);
    window.addEventListener('bricksync-language-changed', function () { setTimeout(update, 0); });
    window.WORD_MISSION = { update: update, onRunFinished: onRunFinished, chain: chain, rules: RULES };
})();
